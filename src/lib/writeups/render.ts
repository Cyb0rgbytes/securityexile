import GithubSlugger from "github-slugger";
import type { Element, ElementContent, Root as HastRoot } from "hast";
import { toString } from "hast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface RenderOptions {
  /** e.g. "https://files.securityexile.com" or "/dev-files"; images must start with `${filesOrigin}/` */
  filesOrigin: string;
}

const COMMON_TAGS = ["p", "br", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li", "a", "hr", "span", "input", "sup", "sub"];
const WRITEUP_TAGS = [...COMMON_TAGS, "img", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td"];

function schema(tagNames: string[]): SanitizeSchema {
  return {
    ...defaultSchema,
    tagNames,
    attributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title"],
      code: [["className", /^language-[a-z0-9+#-]+$/]],
      pre: [["className", "term"]],
      span: [["className", "term-line", "term-cmd", "term-out", "term-prompt"]],
      input: [["type", "checkbox"], ["disabled", true], "checked"],
      th: ["align"],
      td: ["align"],
    },
    protocols: { href: ["http", "https", "mailto"], src: ["http", "https"] },
    required: { input: { type: "checkbox", disabled: true } },
    strip: ["script", "style"],
  };
}

/** Raw HTML in Markdown is shown as text, never parsed (pasted payloads stay readable and inert). */
function remarkEscapeHtml() {
  return (tree: MdastRoot) => {
    visit(tree, "html", (node, index, parent) => {
      if (!parent || index === undefined) return;
      parent.children[index] = { type: "text", value: node.value };
    });
  };
}

/** ```terminal blocks: "$ " lines become commands with a prompt, other lines output. */
function rehypeTerminal() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children[0];
      if (!code || code.type !== "element" || code.tagName !== "code") return;
      const cls = (code.properties?.className as string[] | undefined) ?? [];
      if (!cls.includes("language-terminal")) return;
      const lines = toString(code).replace(/\n$/, "").split("\n");
      const children: ElementContent[] = [];
      lines.forEach((line, i) => {
        if (i > 0) children.push({ type: "text", value: "\n" });
        if (line.startsWith("$ ")) {
          children.push({
            type: "element",
            tagName: "span",
            properties: { className: ["term-line", "term-cmd"] },
            children: [
              { type: "element", tagName: "span", properties: { className: ["term-prompt"] }, children: [{ type: "text", value: "$ " }] },
              { type: "text", value: line.slice(2) },
            ],
          });
        } else {
          children.push({ type: "element", tagName: "span", properties: { className: ["term-line", "term-out"] }, children: [{ type: "text", value: line }] });
        }
      });
      parent.children[index] = { type: "element", tagName: "pre", properties: { className: ["term"] }, children };
    });
  };
}

/** Images must come from our files origin; anything else becomes its alt text. */
function rehypeGateImages(opts: { filesOrigin: string | null }) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img" || !parent || index === undefined) return;
      const src = String(node.properties?.src ?? "");
      const ok = opts.filesOrigin !== null && src.startsWith(`${opts.filesOrigin}/`) && !src.includes("..");
      if (!ok) parent.children[index] = { type: "text", value: String(node.properties?.alt ?? "") };
    });
  };
}

/** Heading ids ("h-" prefix keeps them clear of the app's own ids). Runs after sanitize. */
function rehypeHeadingIds() {
  return (tree: HastRoot) => {
    const slugger = new GithubSlugger();
    visit(tree, "element", (node: Element) => {
      if (/^h[1-6]$/.test(node.tagName)) node.properties = { ...node.properties, id: `h-${slugger.slug(toString(node))}` };
    });
  };
}

/** External links open in a new tab and pass no referrer or ranking. Runs after sanitize. */
function rehypeExternalLinks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = String(node.properties?.href ?? "");
      if (/^https?:\/\//i.test(href)) node.properties = { ...node.properties, rel: ["nofollow", "noopener", "noreferrer"], target: "_blank" };
    });
  };
}

function pipeline(tags: string[], filesOrigin: string | null) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkEscapeHtml)
    .use(remarkRehype)
    .use(rehypeTerminal)
    .use(rehypeGateImages, { filesOrigin })
    .use(rehypeSanitize, schema(tags))
    .use(rehypeHighlight, { detect: false, plainText: ["terminal"] })
    .use(rehypeHeadingIds)
    .use(rehypeExternalLinks)
    .use(rehypeStringify);
}

export function renderWriteup(md: string, opts: RenderOptions): string {
  return String(pipeline(WRITEUP_TAGS, opts.filesOrigin).processSync(md));
}

export function renderComment(md: string): string {
  return String(pipeline(COMMON_TAGS, null).processSync(md));
}

/** Table of contents from our own rendered HTML (ids are generated by rehypeHeadingIds). */
export function tocFromHtml(html: string): { depth: 2 | 3; id: string; text: string }[] {
  const out: { depth: 2 | 3; id: string; text: string }[] = [];
  for (const m of html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)) {
    const text = m[3].replace(/<[^>]+>/g, "").replace(/&#x3C;/g, "<").replace(/&amp;/g, "&").trim();
    out.push({ depth: Number(m[1]) as 2 | 3, id: m[2], text });
  }
  return out;
}

/** Read time from a character count (≈6 characters per word, 200 words per minute). */
export function readMinutesFromChars(chars: number): number {
  return Math.max(1, Math.round(chars / 6 / 200));
}

export function readMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
