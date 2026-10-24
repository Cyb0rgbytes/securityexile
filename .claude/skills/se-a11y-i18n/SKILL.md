---
name: se-a11y-i18n
description: Accessibility (WCAG 2.2), responsive/input-aware design, and English/Arabic (RTL) internationalization rules for Security Exile. Use when building any UI, form, navigation or page, adding copy or translations, or working on Arabic pages in this repo.
---

# Accessibility and i18n

## WCAG 2.2 AA baseline
- **Semantic HTML first**: `header`/`nav`/`main`/`footer` (already in `src/app/layout.tsx`), one `h1` per page, headings in order, real `<button>` for actions and `<a>` for navigation. ARIA only to fill gaps (`aria-pressed` on toggles, `aria-current="page"`, `role="alert"` on errors, `aria-live="polite"` on counters).
- **Keyboard**: everything reachable and operable. Visible `:focus-visible` ring in token colors. `SkipLink` stays first. No keyboard traps in menus or dialogs.
- **Contrast**: 4.5:1 for text and 3:1 for UI against `bg` / `bg-deep`. Check muted text on glass panels and anything over the backdrop image.
- **Targets**: at least 24×24 CSS px (WCAG 2.5.8), 44×44 for primary touch controls. Under `@media (pointer: coarse)` enlarge hit areas and never rely on hover alone.
- **Forms**: every input has a `<label>`, errors are tied to fields, required fields are marked, and server errors come back via `FormMessage`.
- **Media**: meaningful images get `alt`, decorative ones `alt=""` + `aria-hidden`.
- **Motion**: see the se-motion skill (`data-fx`, reduced motion).

## Responsive
- Mobile first. Must work at 320px with no horizontal scroll and a 16px gutter (`px-4`).
- Use container queries for components that live in different widths.

## Internationalization (English + Arabic)
- Dictionaries live in `src/lib/i18n/en.ts` and `ar.ts`; `ar` must satisfy the `en` type, and a parity test enforces it. Get one with `getDict(lang)`. **Never hard-code copy** in pages that have an Arabic version.
- Arabic routes live under `src/app/ar/…`. `src/proxy.ts` derives the language from the path (`langFromPath`) and passes it as `x-lang`; the root layout puts `lang` and `dir` on `<html>`, so the shared header and footer flip too. Don't re-declare `dir` on a page that is wholly in one language — only on a mixed-language block (as in `/soon/[product]`).
- Arabic uses the IBM Plex Sans Arabic font variable, applied via `[lang="ar"]` in `globals.css`.
- **RTL rules**: use logical properties only (`ms-`/`me-`/`ps-`/`pe-`, `start-`/`end-`, `text-start`, `border-s`). Never `ml`/`mr`/`left`/`right` in shared components. Directional glyphs (← →) flip with `rtl:` variants. Keep code, flags, handles and URLs in `dir="ltr"` spans.
- Metadata: set `alternates.languages` for `en` ↔ `ar` pairs. Show a language switch on every bilingual page.
- Numbers and dates: `Intl.DateTimeFormat(lang)`. Event times render in the viewer's zone (`LocalTime`).

## Verify
Take Playwright screenshots of EN and AR pages at 1440 and 390 widths, tab through the page, and check the snapshot's accessibility tree for names and roles.
