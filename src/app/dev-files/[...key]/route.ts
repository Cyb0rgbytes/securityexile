import { getEnv } from "@/lib/db/client";

/** next dev only: serves the local R2 emulation. Production serves files.securityexile.com directly from R2. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const { key } = await params;
  const path = key.join("/");
  if (!/^u\/[0-9A-Z]{26}\/[0-9A-Z]{26}\.(png|jpg|webp|gif)$/.test(path)) return new Response("Not found", { status: 404 });
  const obj = await getEnv().UPLOADS.get(path);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
