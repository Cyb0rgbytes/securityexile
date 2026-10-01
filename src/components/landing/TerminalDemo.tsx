import { GlassPanel } from "@/components/ui/GlassPanel";

type Line = { kind: "cmd" | "out" | "ok" | "warn"; text: string };

const SESSION: Line[] = [
  { kind: "cmd", text: "ls writeups/ --tag web --level beginner" },
  { kind: "out", text: "sqli-101.md   idor-walkthrough.md   jwt-none-alg.md   csrf-basics.md" },
  { kind: "cmd", text: "cat writeups/sqli-101.md | head -3" },
  { kind: "out", text: "# SQL injection, from zero" },
  { kind: "out", text: "by m.alhammadi · series: web-foundations 1/6 · 14 min" },
  { kind: "cmd", text: "whoami" },
  { kind: "ok", text: "operator  rank: initiate  xp: 120  skills: web ▮▮▯▯▯ crypto ▮▯▯▯▯" },
  { kind: "cmd", text: "cat writeups/live-event/pwn-3.md" },
  { kind: "warn", text: "[!] spoiler-locked until the event ends (T-02:14:09)" },
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
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green/80" />
          <span className="ml-3 font-mono text-xs text-fg-muted">operator@exile: ~</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[0.65rem] text-red-bright">
            <span className="live-dot" aria-hidden="true" />
            live
          </span>
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
