// Derives all shipped logo assets from brand-src/Logo.png (transparent PNG).
// Run: node scripts/brand-assets.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "brand-src/Logo.png";
const OUT = "public/assets/brand";
await mkdir(OUT, { recursive: true });

// Trim transparent padding once; everything derives from the tight crop.
const falcon = sharp(await sharp(SRC).trim().png().toBuffer());
const { width, height } = await falcon.metadata();
console.log(`trimmed logo: ${width}x${height}`);

const jobs = [
  // Hero crest
  falcon.clone().resize({ width: 960 }).webp({ quality: 86, alphaQuality: 90 }).toFile(`${OUT}/falcon-960.webp`),
  falcon.clone().resize({ width: 480 }).webp({ quality: 84, alphaQuality: 90 }).toFile(`${OUT}/falcon-480.webp`),
  // Header mark
  falcon.clone().resize({ width: 64 }).webp({ quality: 90 }).toFile(`${OUT}/falcon-64.webp`),
  // Next.js file-convention icons (src/app/icon.png, apple-icon.png)
  falcon
    .clone()
    .resize({ width: 512, height: 512, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("src/app/icon.png"),
  falcon
    .clone()
    .resize({ width: 180, height: 180, fit: "contain", background: "#05070a" })
    .flatten({ background: "#05070a" })
    .png()
    .toFile("src/app/apple-icon.png"),
];

const results = await Promise.all(jobs);
for (const r of results) console.log(`${r.format} ${r.width}x${r.height} ${(r.size / 1024).toFixed(1)} KB`);
