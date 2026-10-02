// @vitest-environment jsdom
import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./sanitize";

const r = (s: string) => renderMarkdown(s, DOMPurify);

describe("renderMarkdown", () => {
  it("renders basic markdown", () => expect(r("**bold** `code`")).toContain("<strong>bold</strong>"));
  it("drops script tags", () => expect(r("<script>alert(1)</script>hi")).not.toContain("<script"));
  it("drops raw html entirely", () => expect(r('<img src=x onerror="alert(1)">')).not.toContain("<img"));
  it("neutralizes javascript: links", () => expect(r("[x](javascript:alert(1))")).not.toMatch(/href="javascript/i));
  it("hardens external links", () => {
    const html = r("[site](https://example.com)");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });
  it("keeps code blocks", () => expect(r("```\nls -la\n```")).toContain("<pre><code>ls -la"));
});
