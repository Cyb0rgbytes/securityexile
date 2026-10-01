export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[100] rounded bg-neon px-4 py-2 font-mono text-sm font-bold text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Skip to content
    </a>
  );
}
