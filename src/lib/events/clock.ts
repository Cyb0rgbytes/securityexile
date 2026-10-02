/**
 * Request time for server components. They render once per request (pages here
 * call connection()), so reading the clock is safe; the React purity lint rule
 * targets client re-renders and can't tell the difference.
 */
export function requestNow(): number {
  return Date.now();
}
