export type ImageType =
  | { mime: "image/png"; ext: "png" }
  | { mime: "image/jpeg"; ext: "jpg" }
  | { mime: "image/webp"; ext: "webp" }
  | { mime: "image/gif"; ext: "gif" };

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_MEMBER_BYTES = 100 * 1024 * 1024;

/**
 * Reads a request body but gives up (returns null) as soon as it exceeds `max` bytes,
 * so a body without Content-Length can't be buffered whole into the isolate's memory.
 */
export async function readLimited(body: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

const starts = (b: Uint8Array, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Type from the file's own bytes; the client's name and Content-Type are ignored. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (starts(b, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts(b, ascii("GIF87a")) || starts(b, ascii("GIF89a"))) return { mime: "image/gif", ext: "gif" };
  if (starts(b, ascii("RIFF")) && starts(b, ascii("WEBP"), 8)) return { mime: "image/webp", ext: "webp" };
  return null;
}

/**
 * Drops APP1 (EXIF/XMP: camera, GPS) and APP13 (IPTC) segments. Everything from the
 * start-of-scan marker on is copied untouched, so the image still decodes.
 */
export function stripJpegMetadata(b: Uint8Array): Uint8Array {
  if (!starts(b, [0xff, 0xd8])) return b;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    if (marker === 0xda) break; // SOS: image data follows
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return b; // malformed: leave it, sniffing already passed
    if (marker !== 0xe1 && marker !== 0xed) out.push(...b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  const result = new Uint8Array(out.length + (b.length - i));
  result.set(out, 0);
  result.set(b.subarray(i), out.length);
  return result;
}
