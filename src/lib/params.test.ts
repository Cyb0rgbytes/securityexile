import { describe, expect, it } from "vitest";
import { firstParam } from "./params";

describe("firstParam", () => {
  it("passes single values and absence through", () => {
    expect(firstParam("web")).toBe("web");
    expect(firstParam(undefined)).toBeUndefined();
  });
  it("takes the first of a repeated key", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam([])).toBeUndefined();
  });
});
