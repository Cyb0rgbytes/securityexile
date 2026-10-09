/** Pure comment threading (no server imports, so tests and client components can use it). */

export type Tree<T> = T & { children: Tree<T>[] };

export function buildTree<T extends { id: string; parentId: string | null }>(rows: T[]): Tree<T>[] {
  const byId = new Map<string, Tree<T>>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: Tree<T>[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export type CommentNode = Tree<{
  id: string;
  parentId: string | null;
  authorHandle: string | null;
  bodyHtml: string;
  createdAt: Date;
  editedAt: Date | null;
  deleted: boolean;
  hidden: boolean;
  mine: boolean;
  editable: boolean;
  /** raw Markdown, only for the viewer's own comments (to prefill the edit box) */
  bodyMd: string;
}>;
