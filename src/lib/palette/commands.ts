export type Command = {
  id: string;
  label: string;
  href: string;
  /** Display name of the group, already in the page's language. */
  group: string;
  /** Extra words that should match this command but don't appear in the label. */
  keywords?: string;
  external?: boolean;
};

/**
 * Commands matching a query: every whitespace-separated token must appear somewhere in the
 * label or keywords. Token-wise rather than one substring, so "write new" finds "Write a
 * writeup". An empty query lists everything.
 *
 * The list itself is built on the server by commandsFor() (./catalog.ts) and passed in, so
 * neither dictionary ends up in the client bundle.
 */
export function filterCommands(query: string, all: Command[]): Command[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return all;
  return all.filter((c) => {
    const haystack = `${c.label} ${c.keywords ?? ""}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}
