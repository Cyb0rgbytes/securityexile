import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { comments, users } from "@/lib/db/schema";
import { buildTree, type CommentNode } from "./comment-tree";
import { canEditComment } from "./permissions";

export type { CommentNode };

export async function loadCommentTree(db: Db, writeupId: string, viewer: { userId: string | null; staff: boolean }, now: number): Promise<CommentNode[]> {
  const rows = await db
    .select({ c: comments, handle: users.handle })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.writeupId, writeupId))
    .orderBy(asc(comments.createdAt))
    .limit(500);
  return buildTree(
    rows.map(({ c, handle }) => {
      const deleted = !!c.deletedAt;
      const hidden = !!c.hiddenAt;
      const mine = viewer.userId === c.authorId;
      const showBody = !deleted && (!hidden || viewer.staff || mine);
      return {
        id: c.id, parentId: c.parentId, authorHandle: deleted ? null : handle, createdAt: c.createdAt, editedAt: c.editedAt,
        deleted, hidden, mine, editable: !!viewer.userId && canEditComment(c, viewer.userId, now),
        bodyHtml: showBody ? c.bodyHtml : "", bodyMd: mine && !deleted ? c.bodyMd : "",
      };
    }),
  );
}
