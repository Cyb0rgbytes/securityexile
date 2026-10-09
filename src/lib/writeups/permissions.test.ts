import { describe, expect, it } from "vitest";
import { canEditComment, canEditWriteup, canVote, COMMENT_EDIT_WINDOW_MS } from "./permissions";

describe("writeup permissions", () => {
  it("only the author edits", () => {
    expect(canEditWriteup({ authorId: "A" }, "A")).toBe(true);
    expect(canEditWriteup({ authorId: "A" }, "B")).toBe(false);
  });
  it("authors can't upvote themselves", () => {
    expect(canVote({ authorId: "A" }, "A")).toBe(false);
    expect(canVote({ authorId: "A" }, "B")).toBe(true);
  });
});

describe("canEditComment", () => {
  const c = { authorId: "A", createdAt: new Date(0), deletedAt: null };
  it("author within the window", () => expect(canEditComment(c, "A", COMMENT_EDIT_WINDOW_MS - 1)).toBe(true));
  it("not after the window", () => expect(canEditComment(c, "A", COMMENT_EDIT_WINDOW_MS)).toBe(false));
  it("not someone else", () => expect(canEditComment(c, "B", 1)).toBe(false));
  it("not a deleted comment", () => expect(canEditComment({ ...c, deletedAt: new Date(1) }, "A", 1)).toBe(false));
});
