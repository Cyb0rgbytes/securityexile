// Social banners for Discord, X, LinkedIn and the default share image (Build Plan p1-05).
// Rendered with the same engine as the site's OG images (next/og: satori + resvg) so the
// brand fonts are real, not system fallbacks. Fonts are fetched from Google Fonts at run time.
// Run: node scripts/social-banners.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

const OUT = "public/assets/brand/social";
await mkdir(OUT, { recursive: true });

// Tokens from src/app/globals.css (cyber-shinobi).
const C = { bg: "#070a12", deep: "#04060b", fg: "#ebe6da", muted: "#8f97ab", green: "#22d3b4", red: "#f2412e" };

/** Latin WOFF for a Google font weight. An old user agent makes the CSS API serve WOFF (satori can't read WOFF2). */
async function googleFont(family, weight) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.30 (KHTML, like Gecko) Safari/534.30" },
  })).text();
  const url = css.match(/\/\* latin \*\/[^}]*?src: url\((.+?)\) format\('(?:woff|truetype)'\)/)?.[1];
  if (!url) throw new Error(`no latin WOFF for ${family} ${weight}`);
  return (await fetch(url)).arrayBuffer();
}

const fonts = [
  { name: "Chakra Petch", data: await googleFont("Chakra Petch", 700), weight: 700, style: "normal" },
  { name: "JetBrains Mono", data: await googleFont("JetBrains Mono", 400), weight: 400, style: "normal" },
];

// The crest as a PNG data URL (satori reads PNG/JPEG, not WebP).
const crest = `data:image/png;base64,${(await sharp("brand-src/Logo.png").trim().resize({ width: 640 }).png().toBuffer()).toString("base64")}`;

/** One banner layout, scaled by height. `safe` keeps content clear of avatars that platforms overlay on the start edge. */
function banner({ width, height, safeStart = 0, tagline = true }) {
  const u = height / 100; // layout unit
  return h(
    "div",
    {
      style: {
        width, height, display: "flex", alignItems: "center", justifyContent: "flex-end",
        background: `radial-gradient(circle at 78% 40%, rgba(34,211,180,0.16), ${C.bg} 55%)`,
        position: "relative", fontFamily: "Chakra Petch",
      },
    },
    // Vermilion blade cut along the top edge and a teal hairline at the bottom.
    h("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: Math.max(2, u * 0.8), background: `linear-gradient(90deg, ${C.red}, transparent 65%)` } }),
    h("div", { style: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 1, background: `linear-gradient(270deg, ${C.green}, transparent 70%)` } }),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: u * 6, paddingRight: u * 9, paddingLeft: safeStart } },
      h("img", { src: crest, height: u * 70, style: { filter: "drop-shadow(0 0 24px rgba(34,211,180,0.35))" } }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        h("div", { style: { fontSize: u * 16, color: C.fg, letterSpacing: u * 0.9, lineHeight: 1 } }, "SECURITY"),
        h("div", { style: { fontSize: u * 16, color: C.muted, letterSpacing: u * 0.9, lineHeight: 1.1 } }, "EXILE"),
        tagline &&
          h(
            "div",
            { style: { marginTop: u * 5, fontFamily: "JetBrains Mono", fontSize: u * 5.4, color: C.green, display: "flex" } },
            h("span", { style: { color: C.red, marginRight: u * 1.5 } }, "$"),
            "learn security by doing",
          ),
      ),
    ),
  );
}

const jobs = [
  // Discord server banner (shown at 960x540, 16:9).
  { file: "discord-banner.png", width: 960, height: 540 },
  // X / Twitter header: the profile photo overlaps the bottom-left, so the content sits right.
  { file: "x-header.png", width: 1500, height: 500, safeStart: 420 },
  // LinkedIn company cover (1128x191 displayed; 4:1 upload). Very short, so no tagline.
  { file: "linkedin-cover.png", width: 1584, height: 396, safeStart: 380, tagline: true },
  // Default share image for pages without their own.
  { file: "og-default.png", width: 1200, height: 630 },
];

for (const j of jobs) {
  const png = Buffer.from(await new ImageResponse(banner(j), { width: j.width, height: j.height, fonts }).arrayBuffer());
  await writeFile(`${OUT}/${j.file}`, png);
  console.log(`${j.file} ${j.width}x${j.height} ${(png.length / 1024).toFixed(0)} KB`);
}

// Discord / social avatar: the crest on the page colour, square.
await sharp("brand-src/Logo.png")
  .trim()
  .resize({ width: 420, height: 420, fit: "contain", background: C.bg })
  .extend({ top: 46, bottom: 46, left: 46, right: 46, background: C.bg })
  .flatten({ background: C.bg })
  .png()
  .toFile(`${OUT}/avatar-512.png`);
console.log("avatar-512.png 512x512");
