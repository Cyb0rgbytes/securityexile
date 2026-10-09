import { describe, expect, it } from "vitest";
import { buildTree } from "./comment-tree";

describe("buildTree", () => {
  it("nests replies under parents in order", () => {
    const t = buildTree([
      { id: "1", parentId: null }, { id: "2", parentId: "1" }, { id: "3", parentId: null }, { id: "4", parentId: "2" },
    ]);
    expect(t.map((n) => n.id)).toEqual(["1", "3"]);
    expect(t[0].children[0].id).toBe("2");
    expect(t[0].children[0].children[0].id).toBe("4");
  });
  it("treats orphans as roots", () => expect(buildTree([{ id: "9", parentId: "missing" }])[0].id).toBe("9"));
});
