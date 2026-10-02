import { describe, expect, it } from "vitest";
import { sniffImage, stripJpegMetadata } from "./sniff";

const bytes = (...xs: number[]) => new Uint8Array(xs);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d);
const GIF = bytes(...ascii("GIF89a"), 1, 0);
const WEBP = bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 "));

/** SOI, APP0(JFIF), APP1(Exif with "GPS"), DQT, SOS + data, EOI */
function jpegWithExif() {
  const app0 = [0xff, 0xe0, 0x00, 0x07, ...ascii("JFIF"), 0];
  const exifPayload = ascii("Exif\0\0GPS-LAT-25.2");
  const app1 = [0xff, 0xe1, 0x00, exifPayload.length + 2, ...exifPayload];
  const dqt = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x01];
  const sos = [0xff, 0xda, 0x00, 0x04, 0x01, 0x00, 0x11, 0x22, 0x33];
  return bytes(0xff, 0xd8, ...app0, ...app1, ...dqt, ...sos, 0xff, 0xd9);
}

describe("sniffImage", () => {
  it("detects png/gif/webp/jpeg", () => {
    expect(sniffImage(PNG)?.mime).toBe("image/png");
    expect(sniffImage(GIF)?.mime).toBe("image/gif");
    expect(sniffImage(WEBP)?.mime).toBe("image/webp");
    expect(sniffImage(jpegWithExif())?.mime).toBe("image/jpeg");
  });
  it("rejects html renamed to png", () => expect(sniffImage(new TextEncoder().encode("<html><script>"))).toBeNull());
  it("rejects svg", () => expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull());
  it("rejects a truncated header", () => expect(sniffImage(bytes(0x89, 0x50, 0x4e))).toBeNull());
  it("rejects RIFF that isn't WEBP", () => expect(sniffImage(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("AVI LIST")))).toBeNull());
});

describe("stripJpegMetadata", () => {
  it("removes EXIF (GPS) and keeps a valid JPEG", () => {
    const out = stripJpegMetadata(jpegWithExif());
    const text = String.fromCharCode(...out);
    expect(text).not.toContain("GPS");
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
    expect(text).toContain("JFIF");
    expect(out.at(-2)).toBe(0xff);
    expect(out.at(-1)).toBe(0xd9);
  });
  it("returns non-JPEG input unchanged", () => expect(stripJpegMetadata(PNG)).toEqual(PNG));
});
