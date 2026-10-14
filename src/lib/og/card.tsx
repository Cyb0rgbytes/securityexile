import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/** Shared 1200×630 share card in the cyber-shinobi palette (teal primary, vermilion accent). */
export function ogCard({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#070a12", color: "#e6edf3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>
          <div style={{ width: 18, height: 18, background: "#22d3b4" }} />
          Security <span style={{ color: "#8b98a5" }}>Exile</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, color: "#22d3b4", textTransform: "uppercase", letterSpacing: 3 }}>{kicker}</div>
          <div style={{ fontSize: title.length > 60 ? 56 : 72, fontWeight: 700, lineHeight: 1.1 }}>{title.slice(0, 110)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#8b98a5" }}>
          <span>{meta ?? ""}</span>
          <div style={{ width: 160, height: 6, background: "#e5484d" }} />
        </div>
      </div>
    ),
    ogSize,
  );
}
