"use client";

import dynamic from "next/dynamic";

/** Browser-only: DOMPurify needs a DOM, and loading it here keeps it out of the Worker bundle. */
const Inner = dynamic(() => import("./MarkdownInner"), { ssr: false, loading: () => null });

export function MarkdownView({ source }: { source: string }) {
  if (!source.trim()) return <p className="text-sm text-fg-muted">No notes yet.</p>;
  return (
    <>
      <noscript>
        <pre className="whitespace-pre-wrap text-sm">{source}</pre>
      </noscript>
      <Inner source={source} />
    </>
  );
}
