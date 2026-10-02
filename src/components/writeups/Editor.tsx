"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormMessage, inputCls, labelCls, SubmitButton } from "@/components/teams/FormBits";
import { DIFFICULTIES } from "@/lib/db/enums";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { TEMPLATES } from "@/lib/writeups/templates";
import { previewMarkdown, saveWriteup, type SaveState } from "@/app/writeups/actions";

export interface EditorInitial {
  id: string | null; title: string; bodyMd: string; category: string; difficulty: string; tags: string;
  eventId: string; seriesId: string; seriesOrder: string; asTeam: boolean; published: boolean; updatedAt: number;
}

const noop = () => () => {};
const draftKey = (id: string | null) => `se-draft-${id ?? "new"}`;
type LocalDraft = { title: string; bodyMd: string; at: number };

function readLocal(id: string | null): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
}

export function Editor({ initial, events, series, hasTeam }: { initial: EditorInitial; events: { id: string; title: string }[]; series: { id: string; title: string }[]; hasTeam: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState<SaveState, FormData>(saveWriteup.bind(null, initial.id), {});
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.bodyMd);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<{ html?: string; error?: string }>({});
  const [previewing, startPreview] = useTransition();
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const client = useSyncExternalStore(noop, () => true, () => false);
  const local = client ? readLocal(initial.id) : null;
  const [dismissed, setDismissed] = useState(false);
  const offerRestore = !dismissed && local !== null && local.at > initial.updatedAt && local.bodyMd !== initial.bodyMd;

  // After the first save of a new writeup, move to its edit URL.
  useEffect(() => {
    if (!initial.id && state.id) {
      try { localStorage.removeItem(draftKey(null)); } catch {}
      router.replace(`/writeups/${state.id}/edit`);
    } else if (state.savedAt) {
      try { localStorage.removeItem(draftKey(initial.id)); } catch {}
    }
  }, [state.id, state.savedAt, initial.id, router]);

  // Local autosave every 5 s while there are unsaved changes (browser only; never sent anywhere).
  useEffect(() => {
    const t = setInterval(() => {
      if (title === initial.title && body === initial.bodyMd) return;
      try { localStorage.setItem(draftKey(initial.id), JSON.stringify({ title, bodyMd: body, at: Date.now() })); } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [title, body, initial.id, initial.title, initial.bodyMd]);

  const insertAtCursor = (text: string) => {
    const el = ta.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
  };

  const upload = async (file: File) => {
    setUploadMsg(`uploading ${file.name}…`);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: file, headers: { "content-type": "application/octet-stream" } });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      const alt = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[[\]]/g, "") || "screenshot";
      insertAtCursor(`\n![${alt}](${data.url})\n`);
      setUploadMsg(null);
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) { e.preventDefault(); void upload(file); }
  };
  const onDrop = (e: React.DragEvent) => {
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (file) { e.preventDefault(); void upload(file); }
  };

  const showPreview = () => {
    setTab("preview");
    startPreview(async () => setPreview(await previewMarkdown(body)));
  };

  return (
    <form action={action} className="space-y-5">
      {offerRestore && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded border border-red/50 p-3 text-sm">
          <span>Your browser has newer unsaved text for this writeup.</span>
          <button type="button" className="font-mono text-xs text-green-bright" onClick={() => { setTitle(local!.title); setBody(local!.bodyMd); setDismissed(true); }}>restore it</button>
          <button type="button" className="font-mono text-xs text-fg-muted" onClick={() => { try { localStorage.removeItem(draftKey(initial.id)); } catch {} setDismissed(true); }}>discard</button>
        </div>
      )}
      <div>
        <label htmlFor="title" className={labelCls}>Title</label>
        <input id="title" name="title" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} mt-1`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="category" className={labelCls}>Category</label>
          <select id="category" name="category" defaultValue={initial.category} className={`${inputCls} mt-1`}>
            <option value="">—</option>
            {FOCUS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className={labelCls}>Level</label>
          <select id="difficulty" name="difficulty" defaultValue={initial.difficulty} className={`${inputCls} mt-1`}>
            <option value="">—</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tags" className={labelCls}>Tags (comma separated, up to 5)</label>
          <input id="tags" name="tags" defaultValue={initial.tags} placeholder="sqli, jwt" className={`${inputCls} mt-1`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <div role="tablist" aria-label="Editor view" className="flex gap-2">
          <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")} className={tab === "write" ? "text-green-bright" : "text-fg-muted"}>write</button>
          <button type="button" role="tab" aria-selected={tab === "preview"} onClick={showPreview} className={tab === "preview" ? "text-green-bright" : "text-fg-muted"}>preview</button>
        </div>
        {!body.trim() && (
          <label className="ml-auto flex items-center gap-2 text-fg-muted">
            start from
            <select className="rounded border border-line-strong bg-bg-deep px-2 py-1 text-fg" defaultValue="" onChange={(e) => { const t = TEMPLATES.find((x) => x.id === e.target.value); if (t) setBody(t.body); }}>
              <option value="">template…</option>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className={tab === "write" ? "" : "hidden"}>
        <label htmlFor="bodyMd" className="sr-only">Writeup (Markdown)</label>
        <textarea
          id="bodyMd" name="bodyMd" ref={ta} rows={24} maxLength={100_000} value={body}
          onChange={(e) => setBody(e.target.value)} onPaste={onPaste} onDrop={onDrop}
          className={`${inputCls} font-mono leading-6`}
          placeholder={"Markdown. Paste or drop screenshots to upload them.\n\n```terminal\n$ nmap -sV target\n```"}
        />
        <p className="mt-1 text-xs text-fg-muted">{uploadMsg ?? "Paste or drop an image to upload it (PNG, JPEG, WebP, GIF, up to 5 MB)."}</p>
      </div>
      {tab === "preview" && (
        <div className="min-h-48 rounded border border-line p-4">
          {previewing ? <p className="text-sm text-fg-muted">rendering…</p> : preview.error ? <p role="alert" className="text-sm text-red-bright">{preview.error}</p> : (
            // Server-rendered by the same sanitizing pipeline as published writeups.
            <div className="prose-se" dangerouslySetInnerHTML={{ __html: preview.html ?? "" }} />
          )}
        </div>
      )}

      <details className="rounded border border-line p-4">
        <summary className="cursor-pointer font-mono text-sm text-fg-muted">event, series, team</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eventId" className={labelCls}>Event (locks the writeup until it ends)</label>
            <select id="eventId" name="eventId" defaultValue={initial.eventId} className={`${inputCls} mt-1`}>
              <option value="">none</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="seriesId" className={labelCls}>Series</label>
            <select id="seriesId" name="seriesId" defaultValue={initial.seriesId} className={`${inputCls} mt-1`}>
              <option value="">none / new below</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="seriesTitle" className={labelCls}>…or start a new series</label>
            <input id="seriesTitle" name="seriesTitle" maxLength={80} className={`${inputCls} mt-1`} />
          </div>
          <div>
            <label htmlFor="seriesOrder" className={labelCls}>Position in series</label>
            <input id="seriesOrder" name="seriesOrder" inputMode="numeric" defaultValue={initial.seriesOrder} className={`${inputCls} mt-1`} />
          </div>
          {hasTeam && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="asTeam" defaultChecked={initial.asTeam} /> post as part of my team
            </label>
          )}
        </div>
      </details>

      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending="saving…">{initial.id ? "save" : "save draft"}</SubmitButton>
        {initial.published && <span className="font-mono text-xs text-fg-muted">published: saving updates the live page</span>}
      </div>
    </form>
  );
}
