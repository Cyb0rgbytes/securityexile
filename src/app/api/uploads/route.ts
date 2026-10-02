import { NextResponse, type NextRequest } from "next/server";
import { eq, sum } from "drizzle-orm";
import { getMember } from "@/lib/auth/member";
import { getDb, getEnv } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { uploads } from "@/lib/db/schema";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { MAX_MEMBER_BYTES, MAX_UPLOAD_BYTES, sniffImage, stripJpegMetadata } from "@/lib/uploads/sniff";
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

  const db = getDb();
  const [{ used }] = await db.select({ used: sum(uploads.bytes) }).from(uploads).where(eq(uploads.ownerId, member.id));
  const usedBytes = Number(used ?? 0);

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength === 0) return fail(400, "That file is empty.");
  if (buf.byteLength > MAX_UPLOAD_BYTES) return fail(413, "Images can be at most 5 MB.");
  const type = sniffImage(buf);
  if (!type) return fail(415, "Only PNG, JPEG, WebP and GIF images can be uploaded.");
  const body = type.mime === "image/jpeg" ? stripJpegMetadata(buf) : buf;
  if (usedBytes + body.byteLength > MAX_MEMBER_BYTES) return fail(413, "You've used your 100 MB of image space. Delete unused writeups or images first.");

  const id = newId();
  const key = `u/${member.id}/${id}.${type.ext}`;
  await env.UPLOADS.put(key, body, { httpMetadata: { contentType: type.mime, cacheControl: "public, max-age=31536000, immutable" } });
  await db.insert(uploads).values({ id, ownerId: member.id, r2Key: key, mime: type.mime, bytes: body.byteLength });
  return NextResponse.json({ id, url: `${filesOrigin()}/${key}` }, { status: 201 });
}
