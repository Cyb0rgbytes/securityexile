// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readMinutes, renderComment, renderWriteup, tocFromHtml } from "./render";

const O = { filesOrigin: "https://files.securityexile.com" };
const r = (md: string) => renderWriteup(md, O);

describe("renderWriteup: basics", () => {
  it("renders gfm", () => {
    const html = r("# Title\n\n**b** ~~s~~\n\n| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<del>s</del>");
    expect(html).toContain("<table>");
  });
  it("adds heading ids", () => expect(r("## Recon phase")).toContain('<h2 id="h-recon-phase">'));
  it("dedupes heading ids", () => expect(r("## A\n\n## A")).toContain('id="h-a-1"'));
  it("highlights code", () => expect(r("```python\nprint(1)\n```")).toMatch(/class="hljs/));
});

describe("renderWriteup: XSS corpus", () => {
  const cases: [string, string][] = [
    ["raw script", "<script>alert(1)</script>"],
    ["raw img onerror", '<img src=x onerror="alert(1)">'],
    ["inline event handler", '<a href="https://x.io" onclick="alert(1)">x</a>'],
    ["javascript link", "[x](javascript:alert(1))"],
    ["javascript autolink", "<javascript:alert(1)>"],
    ["entity-encoded javascript", "[x](&#106;avascript:alert(1))"],
    ["reference link", "[x][a]\n\n[a]: javascript:alert(1)"],
    ["data image", "![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)"],
    ["vbscript", "[x](vbscript:msgbox(1))"],
    ["html in table", "| a |\n|---|\n| <img src=x onerror=alert(1)> |"],
    ["html in list", "- <iframe src=https://evil.example></iframe>"],
    ["title quote break", '[x](https://ok.io "a\\" onmouseover=\\"alert(1))'],
    ["style tag", "<style>body{display:none}</style>"],
  ];
  // Structural check on the parsed output: escaped text like "&lt;img onerror=…" is fine,
  // a real element, event-handler attribute or dangerous URL is not.
  const dangers = (html: string) => {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    const found: string[] = [];
    for (const el of doc.body.querySelectorAll("*")) {
      if (/^(script|iframe|style|object|embed|svg|math|form|base|meta|link)$/i.test(el.tagName)) found.push(`<${el.tagName}>`);
      for (const a of el.attributes) {
        if (/^on/i.test(a.name)) found.push(`${el.tagName}[${a.name}]`);
        if (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*(javascript|vbscript|data):/i.test(a.value)) found.push(`${el.tagName}[${a.name}=${a.value}]`);
      }
    }
    return found;
  };
  it("the detector flags real danger", () =>
    expect(dangers('<img src=x onerror="a()"><a href="javascript:x">y</a><script>1</script>')).toHaveLength(3));
  for (const [name, md] of cases) {
    it(`neutralizes ${name}`, () => expect(dangers(r(md))).toEqual([]));
  }
  it("shows raw html as text", () => expect(r("<b>hi</b>")).toContain("&#x3C;b>hi&#x3C;/b>"));
});

describe("renderWriteup: images and links", () => {
  it("keeps images from the files origin", () =>
    expect(r("![shot](https://files.securityexile.com/u/a/b.png)")).toContain('<img src="https://files.securityexile.com/u/a/b.png" alt="shot">'));
  it("replaces foreign images with their alt text", () => {
    const html = r("![tracker](https://evil.example/p.gif)");
    expect(html).not.toContain("<img");
    expect(html).toContain("tracker");
  });
  it("rejects lookalike origins", () => expect(r("![x](https://files.securityexile.com.evil.example/a.png)")).not.toContain("<img"));
  it("hardens external links", () => {
    const html = r("[site](https://example.com)");
    expect(html).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
  it("keeps mailto", () => expect(r("[mail](mailto:a@b.co)")).toContain('href="mailto:a@b.co"'));
  it("allows the dev files origin", () => expect(renderWriteup("![x](/dev-files/u/a/b.png)", { filesOrigin: "/dev-files" })).toContain("<img"));
});

describe("renderWriteup: terminal blocks", () => {
  it("renders prompts and output", () => {
    const html = r("```terminal\n$ nmap -sV 10.0.0.1\n22/tcp open ssh\n```");
    expect(html).toContain('<pre class="term">');
    expect(html).toContain('<span class="term-prompt">$ </span>');
    expect(html).toContain('<span class="term-line term-cmd">');
    expect(html).toContain('<span class="term-line term-out">22/tcp open ssh</span>');
  });
  it("escapes html inside terminal output", () => expect(r("```terminal\n<script>x</script>\n```")).not.toContain("<script"));
});

describe("renderComment", () => {
  it("drops images and headings", () => {
    const html = renderComment("# big\n\n![x](https://files.securityexile.com/a.png)\n\nok");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<h1");
    expect(html).toContain("ok");
  });
  it("keeps code and links", () => expect(renderComment("`x` [a](https://a.io)")).toMatch(/<code>x<\/code>.*href="https:\/\/a.io"/));
});

describe("tocFromHtml / readMinutes", () => {
  it("lists h2 and h3 with ids", () =>
    expect(tocFromHtml(r("# T\n\n## One `x`\n\n### Two\n\n#### Skip"))).toEqual([
      { depth: 2, id: "h-one-x", text: "One x" },
      { depth: 3, id: "h-two", text: "Two" },
    ]));
  it("estimates reading time", () => {
    expect(readMinutes("word ".repeat(10))).toBe(1);
    expect(readMinutes("word ".repeat(1000))).toBe(5);
  });
});
