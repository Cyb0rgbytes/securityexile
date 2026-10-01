/** Section separator: a hairline carrying a slow red pulse. */
export function SignalDivider({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`signal mx-auto max-w-6xl ${className}`} />;
}
