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
 * Drops APP1 (EXIF/XMP: camera, GPS) and APP13 (IPTC) segments, and everything after the
 * end-of-image marker (motion-photo video, a second JPEG with its own EXIF). The scan data in
 * between is copied untouched, so the image still decodes.
 *
 * Returns null when the structure can't be followed: the strippers fail closed, since passing
 * a file through unchanged would also pass its metadata through.
 */
export function stripJpegMetadata(b: Uint8Array): Uint8Array | null {
  if (!starts(b, [0xff, 0xd8])) return null;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  for (;;) {
    if (i + 4 > b.length || b[i] !== 0xff) return null; // ran out, or junk where a marker belongs
    const marker = b[i + 1];
    if (marker === 0xda) break; // SOS: image data follows
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) return null;
    if (marker !== 0xe1 && marker !== 0xed) out.push(...b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  // In scan data 0xFF is always followed by 0x00 (stuffing) or a marker, so the first FFD9 is the end.
  let end = -1;
  for (let j = i + 2; j + 1 < b.length; j++) {
    if (b[j] === 0xff && b[j + 1] === 0xd9) {
      end = j + 2;
      break;
    }
  }
  if (end < 0) return null; // truncated: no end-of-image
  const result = new Uint8Array(out.length + (end - i));
  result.set(out, 0);
  result.set(b.subarray(i, end), out.length);
  return result;
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
};
const fourcc = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);

/** PNG chunks that can carry EXIF (GPS, camera), free text (author, software, comments) or timestamps. */
const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

/**
 * Drops PNG metadata chunks. Each chunk is length(4, BE) + type(4) + data + CRC(4);
 * the kept chunks are copied byte for byte with their own CRCs, so the image still decodes.
 */
export function stripPngMetadata(b: Uint8Array): Uint8Array | null {
  if (!starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return null;
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const end = i + 12 + len;
    if (end > b.length) return null; // malformed: fail closed (see stripJpegMetadata)
    const type = fourcc(b, i + 4);
    if (!PNG_METADATA.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") return concat(parts); // anything after IEND is dropped too
  }
  return null; // no IEND: not a PNG we understand
}

/** VP8X header flags for "has EXIF" and "has XMP" (RIFF container spec). */
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

/**
 * Drops WebP EXIF and XMP chunks and clears their VP8X flags. RIFF chunks are
 * fourcc(4) + size(4, LE) + data, padded to an even length; the RIFF size is rewritten.
 */
export function stripWebpMetadata(b: Uint8Array): Uint8Array | null {
  if (!starts(b, ascii("RIFF")) || !starts(b, ascii("WEBP"), 8)) return null;
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const size = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + size + (size & 1);
    if (end > b.length) return null; // malformed: fail closed
    const type = fourcc(b, i);
    if (type === "VP8X" && size >= 1) {
      const chunk = b.slice(i, end);
      chunk[8] &= ~(VP8X_EXIF | VP8X_XMP);
      parts.push(chunk);
    } else if (type !== "EXIF" && type !== "XMP ") {
      parts.push(b.subarray(i, end));
    }
    i = end;
  }
  if (i !== b.length) return null; // trailing bytes that aren't a chunk
  const body = concat(parts);
  const out = new Uint8Array(12 + body.byteLength);
  out.set(b.subarray(0, 12), 0);
  out.set(body, 12);
  const riff = out.byteLength - 8;
  out[4] = riff & 0xff;
  out[5] = (riff >>> 8) & 0xff;
  out[6] = (riff >>> 16) & 0xff;
  out[7] = (riff >>> 24) & 0xff;
  return out;
}

/**
 * Strips location/camera/author metadata for every type that can carry it (GIF has none worth
 * stripping). Null means the file couldn't be parsed far enough to strip, so it must be refused.
 */
export function stripMetadata(b: Uint8Array, type: ImageType): Uint8Array | null {
  if (type.mime === "image/jpeg") return stripJpegMetadata(b);
  if (type.mime === "image/png") return stripPngMetadata(b);
  if (type.mime === "image/webp") return stripWebpMetadata(b);
  return b;
}
