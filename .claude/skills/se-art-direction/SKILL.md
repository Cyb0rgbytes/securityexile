---
name: se-art-direction
description: Visual design rules for Security Exile (cyber-shinobi). Use when building or restyling any page, component, landing section, banner, icon or image in this repo, choosing colors, type, spacing or layout, or adding image assets.
---

# Art direction: cyber-shinobi

One thesis, applied everywhere: **a neon-lit night city seen by a shinobi**. Dark ink, jade-neon signal, vermilion seal, washi-paper text, blade notches. Never start from a default template, and never mix in a second aesthetic.

## Tokens (only these)
Defined in `src/app/globals.css` (`--se-*`, exposed to Tailwind via `@theme inline`). Use the Tailwind names, never hex in components.

| Role | Token / class |
|---|---|
| page / deep / raised surfaces | `bg-bg`, `bg-bg-deep`, `bg-bg-raised` |
| text / secondary | `text-fg` (washi `#ebe6da`), `text-fg-muted` |
| primary signal | `green` / `green-bright` (jade `#22d3b4`) |
| danger, seal, blade | `red` / `red-bright` (vermilion `#f2412e`) |
| hairlines, rain only | `cyan` |
| borders | `border-line`, `border-line-strong` |
| glass | `GlassPanel` / `--se-glass` |

- The site is **dark only** (`viewport.colorScheme = "dark"`). Don't add a light theme unless asked.
- New colors are added as `--se-*` tokens in `globals.css` first. Check contrast against `bg` (WCAG AA 4.5:1 for body text).

## Type
Loaded with `next/font` in `src/app/layout.tsx`:
- `font-display`: Chakra Petch, for headings and the wordmark (uppercase, wide tracking);
- body: IBM Plex Sans;
- `font-mono`: JetBrains Mono, for meta lines, chips, terminal UI;
- Shippori Mincho: kanji accents (hanko seals) only;
- Arabic: IBM Plex Sans Arabic under `[lang="ar"]`.

Use fluid sizes (`clamp()` or responsive Tailwind steps) for display headings and `text-wrap: balance` on headings.

## Layout
- Grid with intentional asymmetry and whitespace. Max widths are `max-w-6xl` for the shell and `max-w-3xl` for reading.
- No three-equal-card soup unless the content really is three peers.
- One job per section: hook → proof → action (see `src/app/page.tsx`).
- Use logical spacing (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) so RTL mirrors for free.

## Reuse before inventing
| Need | Use |
|---|---|
| Buttons and CTAs | `src/components/ui/NeonButton.tsx` (`variant`: default, `ghost`, `danger`) |
| Panels | `src/components/ui/GlassPanel.tsx` |
| Section headings with the prompt glyph | `src/components/fx/CursorHeading.tsx` |
| Section breaks | `src/components/fx/SignalDivider.tsx` |
| Forms | `src/components/teams/FormBits.tsx` (`inputCls`, `labelCls`, `SubmitButton`, `FormMessage`) |
| Cards | follow `WriteupCard` / `EventCard`: `rounded border border-line bg-bg-deep/60 p-4 hover:border-green-bright` |

## Icons and illustration
- Text glyphs (▲ ♥ ← →) and the hanko kanji are the current icon language.
- If an icon set is needed, pick **one** (Lucide) with a consistent 1.5px stroke. Never mix sets.
- Custom SVG uses `currentColor`.

## Images
- Brand art comes from `brand-src/Logo.png` via `node scripts/brand-assets.mjs`, which outputs WebP sizes plus `src/app/icon.png` and `apple-icon.png`. Add new derived assets to that script, not by hand.
- Ship WebP or AVIF with explicit `width`/`height` (no CLS) and `loading="lazy"` below the fold.
- Never ship an image over about 150 KB without a reason. The 755 KB source PNG is never referenced directly.
- On the dark bar, dark artwork needs a rim or glow (see `falcon-mark-*`).
