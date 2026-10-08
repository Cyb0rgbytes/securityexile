import type { ReactNode } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";

type Line = { kind: "cmd" | "out" | "ok" | "warn"; text: ReactNode };

/**
 * Five-segment skill meter drawn with CSS. Unicode block glyphs (▮▯) aren't in
 * the mono font, so fallback fonts rendered them at mismatched sizes.
 */
function Meter({ label, level }: { label: string; level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="inline-flex gap-[3px]" role="img" aria-label={`${label} ${level} of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i < level ? "bg-green-bright" : "border border-green/50"}`} />
        ))}
      </span>
    </span>
  );
}

const SESSION: Line[] = [
  { kind: "cmd", text: "ls writeups/ --tag web --level beginner" },
  { kind: "out", text: "sqli-101.md   idor-walkthrough.md   jwt-none-alg.md   csrf-basics.md" },
  { kind: "cmd", text: "cat writeups/sqli-101.md | head -3" },
  { kind: "out", text: "# SQL injection, from zero" },
  { kind: "out", text: "by @n0va · series: web-foundations 1/6 · 14 min" },
  { kind: "cmd", text: "whoami" },
  {
    kind: "ok",
    text: (
      <span className="inline-flex flex-wrap items-center gap-x-4">
        <span>operator</span>
        <span>rank: initiate</span>
        <span>xp: 120</span>
        <Meter label="web" level={2} />
        <Meter label="crypto" level={1} />
      </span>
    ),
  },
  { kind: "cmd", text: "cat writeups/live-event/pwn-3.md" },
  { kind: "warn", text: "[!] spoiler-locked until the event ends (02:14:09 left)" },
];

const color: Record<Line["kind"], string> = {
  cmd: "text-fg",
  out: "text-fg-muted",
  ok: "text-green-bright",
  warn: "text-red-bright",
};

export function TerminalDemo() {
  return (
    <section aria-label="Terminal preview" className="mx-auto mt-16 max-w-3xl px-4 sm:px-6">
      <GlassPanel glow className="overflow-hidden">
        {/* Title bar drawn like a scabbard: a vermilion collar, then the lacquered body. */}
        <div className="flex items-center gap-3 border-b border-line bg-[linear-gradient(90deg,rgb(242_65_46/0.14),transparent_40%)] px-4 py-2.5">
          <span aria-hidden="true" className="h-3 w-1 -skew-x-[20deg] bg-red" />
          <span aria-hidden="true" className="h-3 w-1 -skew-x-[20deg] bg-red/50" />
          <span className="ml-1 font-mono text-xs text-fg-muted">operator@exile: ~</span>
          <span className="ml-auto font-mono text-[0.65rem] text-fg-muted">preview</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-sm leading-7">
          {SESSION.map((l, i) => (
            <div key={i} className={color[l.kind]}>
              {l.kind === "cmd" && (
                <span className="text-green" aria-hidden="true">
                  ${" "}
                </span>
              )}
              {l.text}
            </div>
          ))}
          <div className="cursor-blink text-green" aria-hidden="true">
            ${" "}
          </div>
        </pre>
      </GlassPanel>
    </section>
  );
}
