/** Hacker-News-style decay: votes / (hours since publish + 2)^1.5. */
export function trendingScore(voteCount: number, publishedAt: Date, now: number): number {
  const hours = Math.max(0, (now - publishedAt.getTime()) / 3_600_000);
  return voteCount / Math.pow(hours + 2, 1.5);
}
