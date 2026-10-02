"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";
import { renderMarkdown } from "./sanitize";

export default function MarkdownInner({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdown(source, DOMPurify), [source]);
  // Sanitized above with an allow-list; raw HTML was dropped before sanitizing.
  return <div className="md-notes" dangerouslySetInnerHTML={{ __html: html }} />;
}
