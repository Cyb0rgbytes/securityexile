import { describe, expect, it } from "vitest";
import { isOwnDestination, portalUrl } from "./urls";

describe("isOwnDestination", () => {
  it.each(["/writeups", "/", "/w/ana/intro?x=1", "https://app.securityexile.com/teams", "https://securityexile.com/", "https://ctf.securityexile.com"])("accepts %s", (u) =>
    expect(isOwnDestination(u)).toBe(true),
  );
  it.each([
    "https://evil.example/",
    "//evil.example",
    "/\\evil.example",
    "https://securityexile.com.evil.example",
    "https://evilsecurityexile.com",
    "http://app.securityexile.com/",
    "javascript:alert(1)",
    "writeups",
    "",
  ])("refuses %s", (u) => expect(isOwnDestination(u)).toBe(false));
});

describe("portalUrl", () => {
  const base = "https://accounts.securityexile.com/sign-in";
  it("forwards our own redirect and other params", () => {
    const u = new URL(portalUrl(base, { redirect_url: "https://app.securityexile.com/me/writeups", lang: "ar" }));
    expect(u.searchParams.get("redirect_url")).toBe("https://app.securityexile.com/me/writeups");
    expect(u.searchParams.get("lang")).toBe("ar");
  });
  it("drops any *url parameter pointing elsewhere", () => {
    const u = new URL(portalUrl(base, { redirect_url: "https://evil.example", sign_in_force_redirect_url: "//evil.example", after_sign_up_url: "/ok" }));
    expect(u.searchParams.has("redirect_url")).toBe(false);
    expect(u.searchParams.has("sign_in_force_redirect_url")).toBe(false);
    expect(u.searchParams.get("after_sign_up_url")).toBe("/ok");
  });
  it("ignores repeated params", () => {
    expect(new URL(portalUrl(base, { redirect_url: ["/a", "/b"] })).searchParams.has("redirect_url")).toBe(false);
  });
});
