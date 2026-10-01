import { GlassPanel } from "@/components/ui/GlassPanel";

type Line = { kind: "cmd" | "out" | "ok" | "warn"; text: string };

const SESSION: Line[] = [
  { kind: "cmd", text: "whoami" },
  { kind: "out", text: "guest  (rank: unranked, xp: 0)" },
  { kind: "cmd", text: "ls ~/teams" },
  { kind: "out", text: "no teams yet. try: join <invite-code>" },
  { kind: "cmd", text: "join TEAM-7F3K-Q9ZD" },
  { kind: "ok", text: "[+] code accepted. welcome aboard, operator." },
  { kind: "cmd", text: "cat writeups/live-event.md" },
  { kind: "warn", text: "[!] spoiler-locked until event end (T-02:14:09)" },
];

const color: Record<Line["kind"], string> = {
  cmd: "text-fg",
  out: "text-fg-muted",
  ok: "text-neon",
  warn: "text-magenta",
};

export function TerminalDemo() {
  return (
    <section aria-label="Terminal preview" className="mx-auto mt-24 max-w-3xl px-4 sm:px-6">
      <GlassPanel glow className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-neon/80" />
          <span className="ml-3 font-mono text-xs text-fg-muted">operator@exile: ~</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-sm leading-7">
          {SESSION.map((l, i) => (
            <div key={i} className={color[l.kind]}>
              {l.kind === "cmd" && (
                <span className="text-neon" aria-hidden="true">
                  ${" "}
                </span>
              )}
              {l.text}
            </div>
          ))}
          <div className="cursor-blink text-neon" aria-hidden="true">
            ${" "}
          </div>
        </pre>
      </GlassPanel>
    </section>
  );
}
