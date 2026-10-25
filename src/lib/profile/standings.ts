/**
 * Standard competition places ("1, 2, 2, 4") for rows already sorted best first: equal XP shares a
 * place, and the next distinct total skips the places the tie used. The rows' order is kept, so the
 * query's tiebreak (handle, team name) still decides who is listed first within a tie.
 */
export function withPlaces<T extends { xp: number }>(rows: readonly T[]): (T & { place: number })[] {
  let place = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.xp !== rows[i - 1].xp) place = i + 1;
    return { ...row, place };
  });
}
