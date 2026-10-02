import { Marked } from "marked";

/** Minimal DOMPurify surface we use (lets tests pass a jsdom-backed instance). */
export interface DOMPurifyLike {
  sanitize(html: string, cfg: Record<string, unknown>): string;
  addHook(name: "afterSanitizeAttributes", fn: (node: Element) => void): void;
  removeHook(name: "afterSanitizeAttributes"): unknown;
}

// Raw HTML in notes is never rendered; markdown syntax only.
const md = new Marked({ gfm: true, breaks: true, renderer: { html: () => "" } });

const ALLOWED_TAGS = ["p", "br", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "hr", "table", "thead", "tbody", "tr", "th", "td"];

/** Markdown → HTML that is safe to inject: allow-listed tags, http(s) links only, links hardened. */
export function renderMarkdown(src: string, purify: DOMPurifyLike): string {
  const raw = md.parse(src, { async: false }) as string;
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  try {
    return purify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR: ["href", "target", "rel"], ALLOWED_URI_REGEXP: /^https?:/i });
  } finally {
    purify.removeHook("afterSanitizeAttributes");
  }
}
