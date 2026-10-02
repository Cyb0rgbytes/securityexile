import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getMember } from "@/lib/auth/member";
import { getDb, getEnv } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { uploads } from "@/lib/db/schema";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { MAX_MEMBER_BYTES, MAX_UPLOAD_BYTES, readLimited, sniffImage, stripJpegMetadata } from "@/lib/uploads/sniff";
import { filesOrigin } from "@/lib/writeups/files";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** CSRF guard: browsers send Origin on POST; "null" or a foreign origin is refused. */
function sameOrigin(origin: string | null, host: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Raw image body (not multipart). Member-only, same-origin, rate-limited, quota-checked. */
export async function POST(req: NextRequest) {
  const member = await getMember();
  if (!member?.handle) return fail(401, "Sign in to upload images.");
  if (!sameOrigin(req.headers.get("origin"), req.nextUrl.host)) return fail(403, "Uploads must come from this site.");

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return fail(413, "Images can be at most 5 MB.");

  const env = getEnv();
  const rl = await hit(env.KV, `upload:${member.id}`, LIMITS.upload);
  if (!rl.ok) return fail(429, retryMessage(rl));

  // Counted while streaming: a body without Content-Length can't be buffered past the cap.
  const buf = await readLimited(req.body, MAX_UPLOAD_BYTES);
  if (!buf) return fail(413, "Images can be at most 5 MB.");
  if (buf.byteLength === 0) return fail(400, "That file is empty.");
  const type = sniffImage(buf);
  if (!type) return fail(415, "Only PNG, JPEG, WebP and GIF images can be uploaded.");
  const body = type.mime === "image/jpeg" ? stripJpegMetadata(buf) : buf;

  // Reserve the space with one conditional insert, so parallel uploads can't all pass the quota
  // check (KV rate limits aren't atomic). The R2 write happens only after the row exists.
  const db = getDb();
  const id = newId();
  const key = `u/${member.id}/${id}.${type.ext}`;
  const reserved = await db.run(sql`
    insert into ${uploads} (id, owner_id, r2_key, mime, bytes, created_at)
    select ${id}, ${member.id}, ${key}, ${type.mime}, ${body.byteLength}, ${Date.now()}
    where (select coalesce(sum(bytes), 0) from ${uploads} where owner_id = ${member.id}) + ${body.byteLength} <= ${MAX_MEMBER_BYTES}`);
  if ((reserved as unknown as { meta: { changes: number } }).meta.changes === 0)
    return fail(413, "You've used your 100 MB of image space.");
  try {
    await env.UPLOADS.put(key, body, { httpMetadata: { contentType: type.mime, cacheControl: "public, max-age=31536000, immutable" } });
  } catch (e) {
    await db.delete(uploads).where(eq(uploads.id, id));
    throw e;
  }
  return NextResponse.json({ id, url: `${filesOrigin()}/${key}` }, { status: 201 });
}
