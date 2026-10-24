import { describe, expect, it } from "vitest";
import { hostRedirect, hostRewrite } from "./hosts";

describe("hostRewrite", () => {
  const rw = (u: string) => hostRewrite(new URL(u));
  it("ctf. and labs. show their holding pages on every path", () => {
    expect(rw("https://ctf.securityexile.com/")).toBe("/soon/ctf");
    expect(rw("https://ctf.securityexile.com/challenges?x=1")).toBe("/soon/ctf");
    expect(rw("https://labs.securityexile.com/anything")).toBe("/soon/labs");
  });
  it("lets assets and Next internals through", () => {
    expect(rw("https://ctf.securityexile.com/_next/static/chunks/a.js")).toBeNull();
    expect(rw("https://labs.securityexile.com/assets/brand/falcon-480.webp")).toBeNull();
    expect(rw("https://ctf.securityexile.com/icon.png")).toBeNull();
  });
  it("leaves other hosts alone", () => {
    expect(rw("https://app.securityexile.com/")).toBeNull();
    expect(rw("http://localhost:3000/soon/ctf")).toBeNull();
  });
});

const go = (u: string, signedIn = false, enabled = true) => hostRedirect(new URL(u), { enabled, signedIn });

describe("hostRedirect", () => {
  it("does nothing while the split is off", () => {
    expect(go("https://securityexile.com/writeups", false, false)).toBeNull();
    expect(go("https://app.securityexile.com/", false, false)).toBeNull();
  });
  it("apex keeps the landing and policy pages", () => {
    expect(go("https://securityexile.com/")).toBeNull();
    expect(go("https://securityexile.com/security")).toBeNull();
    expect(go("https://securityexile.com/robots.txt")).toBeNull();
  });
  it("apex sends app routes to the app, keeping path and query", () => {
    expect(go("https://securityexile.com/writeups?tag=web")).toBe("https://app.securityexile.com/writeups?tag=web");
    expect(go("https://securityexile.com/events/x")).toBe("https://app.securityexile.com/events/x");
    expect(go("https://securityexile.com/sign-in")).toBe("https://app.securityexile.com/sign-in");
  });
  it("www folds into the apex", () => expect(go("https://www.securityexile.com/security")).toBe("https://securityexile.com/security"));
  it("app root: members land on the feed, visitors on the landing", () => {
    expect(go("https://app.securityexile.com/", true)).toBe("https://app.securityexile.com/writeups");
    expect(go("https://app.securityexile.com/", false)).toBe("https://securityexile.com/");
  });
  it("apex keeps the bilingual landing and policy pages", () => {
    for (const p of ["/terms", "/privacy", "/ar", "/ar/terms", "/ar/privacy"]) expect(go(`https://securityexile.com${p}`)).toBeNull();
    expect(go("https://securityexile.com/ar/writeups")).toBe("https://app.securityexile.com/ar/writeups");
  });
  it("app pages and other hosts are served as-is", () => {
    expect(go("https://app.securityexile.com/writeups")).toBeNull();
    expect(go("http://localhost:3000/")).toBeNull();
    expect(go("https://securityexile.example.workers.dev/")).toBeNull();
  });
});
