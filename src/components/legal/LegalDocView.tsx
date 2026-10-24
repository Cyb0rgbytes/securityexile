import { CursorHeading } from "@/components/fx/CursorHeading";
import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { getDict, type Lang } from "@/lib/i18n";
import { LEGAL_UPDATED, type LegalDoc } from "@/lib/i18n/legal";

/** Shared layout for the policy pages in either language. */
export function LegalDocView({ doc, lang, path }: { doc: LegalDoc; lang: Lang; path: string }) {
  const t = getDict(lang);
  const updated = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(LEGAL_UPDATED));
  return (
    <article lang={lang} dir={t.dir} className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <CursorHeading level={1} prompt="#">
          {doc.title}
        </CursorHeading>
        <LanguageSwitch lang={lang} path={path} />
      </div>
      <p className="mt-4 font-mono text-xs text-fg-muted">
        {t.legal.updated}: <time dateTime={LEGAL_UPDATED}>{updated}</time>
      </p>
      <p role="note" className="mt-3 rounded border border-line-strong p-3 text-sm text-fg-muted">
        {t.legal.review}
      </p>

      <nav aria-label={t.legal.contents} className="mt-8 rounded border border-line p-4 text-sm">
        <p className="font-mono text-xs text-fg-muted">{t.legal.contents}</p>
        <ol className="mt-2 space-y-1">
          {doc.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-fg-muted hover:text-green-bright">
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="prose-se mt-8">
        {doc.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`}>{s.heading}</h2>
            {s.body?.map((p, i) => <p key={i}>{p}</p>)}
            {s.list && (
              <ul>
                {s.list.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
