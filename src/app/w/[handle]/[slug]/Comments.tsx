"use client";

import { useActionState, useState, useTransition } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import type { CommentNode } from "@/lib/writeups/comment-tree";
import { addComment, deleteComment, editComment, setCommentHidden } from "./actions";

function CommentForm({ writeupId, parentId, onDone }: { writeupId: string; parentId: string | null; onDone?: () => void }) {
  const [text, setText] = useState("");
  const [state, action] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await addComment(writeupId, parentId, prev, form);
    if (r.ok) { setText(""); onDone?.(); }
    return r;
  }, {});
  const id = `c-${parentId ?? "root"}`;
  return (
    <form action={action} className="space-y-2">
      <label htmlFor={id} className="sr-only">{parentId ? "Reply" : "Comment"}</label>
      <textarea id={id} name="bodyMd" rows={parentId ? 3 : 4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="Markdown: `code`, **bold**, links" />
      <FormMessage state={state} />
      <SubmitButton variant="ghost" className="!py-1 !text-xs" pending="posting…">{parentId ? "reply" : "comment"}</SubmitButton>
    </form>
  );
}

function Comment({ n, writeupId, depth, signedIn, staff }: { n: CommentNode; writeupId: string; depth: number; signedIn: boolean; staff: boolean }) {
  const [mode, setMode] = useState<"view" | "reply" | "edit">("view");
  const [draft, setDraft] = useState(n.bodyMd);
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const [editState, editAction] = useActionState<ActionState, FormData>(async (prev, form) => {
    const r = await editComment(n.id, prev, form);
    if (r.ok) setMode("view");
    return r;
  }, {});
  return (
    <li className="border-l border-line pl-4">
      <p className="font-mono text-xs text-fg-muted">
        {n.deleted ? "[deleted]" : `@${n.authorHandle}`} · <time dateTime={n.createdAt.toISOString()}>{n.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time>
        {n.editedAt && " · edited"}{n.hidden && " · hidden by a moderator"}
      </p>
      {mode === "edit" ? (
        <form action={editAction} className="mt-2 space-y-2">
          <label htmlFor={`e-${n.id}`} className="sr-only">Edit comment</label>
          <textarea id={`e-${n.id}`} name="bodyMd" rows={3} maxLength={5000} value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
          <FormMessage state={editState} />
          <SubmitButton variant="ghost" className="!py-1 !text-xs" pending="saving…">save</SubmitButton>
        </form>
      ) : n.bodyHtml ? (
        // Rendered on the server by the comment pipeline (sanitized allow-list).
        <div className="prose-se mt-1 text-sm" dangerouslySetInnerHTML={{ __html: n.bodyHtml }} />
      ) : (
        <p className="mt-1 text-sm text-fg-muted">{n.deleted ? "This comment was deleted." : "This comment was hidden by a moderator."}</p>
      )}
      <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs">
        {signedIn && !n.deleted && depth < 3 && <button type="button" onClick={() => setMode(mode === "reply" ? "view" : "reply")} className="text-fg-muted hover:text-fg">reply</button>}
        {n.editable && <button type="button" onClick={() => setMode("edit")} className="text-fg-muted hover:text-fg">edit</button>}
        {n.mine && !n.deleted && <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this comment?")) start(async () => setMsg(await deleteComment(n.id))); }} className="text-fg-muted hover:text-red-bright">delete</button>}
        {staff && !n.deleted && <button type="button" disabled={pending} onClick={() => start(async () => setMsg(await setCommentHidden(n.id, !n.hidden)))} className="text-fg-muted hover:text-red-bright">{n.hidden ? "restore" : "hide"}</button>}
      </div>
      <FormMessage state={msg} />
      {mode === "reply" && <div className="mt-2"><CommentForm writeupId={writeupId} parentId={n.id} onDone={() => setMode("view")} /></div>}
      {n.children.length > 0 && (
        <ul className="mt-3 space-y-4">
          {n.children.map((c) => <Comment key={c.id} n={c} writeupId={writeupId} depth={depth + 1} signedIn={signedIn} staff={staff} />)}
        </ul>
      )}
    </li>
  );
}

export function Comments({ writeupId, tree, signedIn, staff, open }: { writeupId: string; tree: CommentNode[]; signedIn: boolean; staff: boolean; open: boolean }) {
  return (
    <section aria-labelledby="comments-h" className="mt-12">
      <h2 id="comments-h" className="font-display text-lg font-semibold tracking-tight text-fg">comments</h2>
      {open && signedIn && <div className="mt-4"><CommentForm writeupId={writeupId} parentId={null} /></div>}
      {open && !signedIn && <p className="mt-4 text-sm text-fg-muted">Sign in to comment.</p>}
      {tree.length === 0 ? <p className="mt-4 text-sm text-fg-muted">No comments yet.</p> : (
        <ul className="mt-6 space-y-6">{tree.map((n) => <Comment key={n.id} n={n} writeupId={writeupId} depth={1} signedIn={signedIn} staff={staff} />)}</ul>
      )}
    </section>
  );
}
