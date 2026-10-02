import { Marked } from "marked";

/** Minimal DOMPurify surface we use (lets tests pass a jsdom-backed instance). */
export interface DOMPurifyLike {
  sanitize(html: string, cfg: Record<string, unknown>): string;
  addHook(name: "afterSanitizeAttributes", fn: (node: Element) => void): void;
  removeHook(name: "afterSanitizeAttributes"): unknown;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Raw HTML in notes is never rendered as HTML: it's shown as text (blocks as code),
// so pasted payloads stay readable and inert instead of silently disappearing.
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: { html: ({ text, block }) => (block ? `<pre><code>${escapeHtml(text.trimEnd())}</code></pre>\n` : escapeHtml(text)) },
});

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
