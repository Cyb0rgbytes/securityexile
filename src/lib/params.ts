/**
 * A search param as Next delivers it: absent, one value, or an array when the key repeats
 * (`?q=a&q=b`). Pages read the first value so a crafted URL can't reach string methods
 * with an array and throw a 500.
 */
export type SearchParam = string | string[] | undefined;

export function firstParam(v: SearchParam): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
