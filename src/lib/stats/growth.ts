/**
 * Monthly growth figures for staff. Everything here is a count; no member is named or listed.
 * Months are calendar months in UTC, keyed "YYYY-MM".
 */
export type MonthKey = string;

export type GrowthRow = {
  month: MonthKey;
  signups: number;
  /** distinct members who did something visible that month (see activity() in queries.ts) */
  active: number;
  published: number;
  registrations: number;
  /** share of last month's active members who were active again this month; null with no previous month */
  retention: number | null;
};

export function monthKey(ms: number): MonthKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last `n` months up to and including the one `now` falls in, oldest first. */
export function lastMonths(now: number, n: number): MonthKey[] {
  const d = new Date(now);
  const out: MonthKey[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)));
  return out;
}

/** Start of the first month in `months`, as epoch ms, for the queries' lower bound. */
export function monthStart(month: MonthKey): number {
  const [y, m] = month.split("-").map(Number);
  return Date.UTC(y, m - 1, 1);
}

export function growthTable(
  months: readonly MonthKey[],
  counts: { signups: Record<MonthKey, number>; published: Record<MonthKey, number>; registrations: Record<MonthKey, number> },
  activity: readonly { month: MonthKey; uid: string }[],
): GrowthRow[] {
  const activeBy = new Map<MonthKey, Set<string>>();
  for (const a of activity) {
    if (!activeBy.has(a.month)) activeBy.set(a.month, new Set());
    activeBy.get(a.month)!.add(a.uid);
  }
  return months.map((month, i) => {
    const now = activeBy.get(month) ?? new Set<string>();
    const prev = i > 0 ? (activeBy.get(months[i - 1]) ?? new Set<string>()) : null;
    let retention: number | null = null;
    if (prev && prev.size > 0) {
      let kept = 0;
      for (const uid of prev) if (now.has(uid)) kept++;
      retention = kept / prev.size;
    }
    return {
      month,
      signups: counts.signups[month] ?? 0,
      active: now.size,
      published: counts.published[month] ?? 0,
      registrations: counts.registrations[month] ?? 0,
      retention,
    };
  });
}
