export const MAX_COMMENT_DEPTH = 3;
export const COMMENT_EDIT_WINDOW_MS = 15 * 60_000;

export function canEditWriteup(w: { authorId: string }, userId: string): boolean {
  return w.authorId === userId;
}

export function canVote(w: { authorId: string }, userId: string): boolean {
  return w.authorId !== userId;
}

export function canEditComment(c: { authorId: string; createdAt: Date; deletedAt: Date | null }, userId: string, now: number): boolean {
  return c.authorId === userId && !c.deletedAt && now - c.createdAt.getTime() < COMMENT_EDIT_WINDOW_MS;
}
