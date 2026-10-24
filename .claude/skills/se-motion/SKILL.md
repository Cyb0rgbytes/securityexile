---
name: se-motion
description: Motion and animation rules for Security Exile. Use when adding or changing any animation, transition, hover or press effect, scroll effect, page transition, cursor effect or loading state in this repo.
---

# Motion

Know *why* something moves before it moves. Motion here explains state changes and adds atmosphere (rain, glitch, blade streaks). It never decorates for its own sake.

## Effects switch (non-negotiable)
- `<html data-fx="full|low">` is set before first paint by `src/lib/fx/init-script.ts` and kept current by `src/lib/fx/FxProvider.tsx`. The rules live in `src/lib/fx/resolve.ts`: the user's `fx:` toggle in the header, `prefers-reduced-motion`, and low-power hints.
- **Every** animation needs a `[data-fx="low"]` fallback (static end state) and must also respect `@media (prefers-reduced-motion: reduce)`. Follow the existing block near `[data-fx="low"]` in `src/app/globals.css`.
- In React, read the fx state from `FxProvider` and skip or shorten animations when it's `low`.

## Tooling, in order of preference
1. **CSS**: transitions, keyframes, native scroll-driven animations (`animation-timeline: view()`), and the View Transitions API for page morphs. No JS cost.
2. **Framer Motion** (installed as `framer-motion`) for React layout animations, `AnimatePresence`, and shared-element transitions.
3. Don't add GSAP, Lenis, Lottie or Rive unless a specific effect needs it and the user agrees. Never hijack scroll for reading pages.

## Timing
- Durations: **150ms** micro (hover, press), **300ms** state change (panels, toggles), **600ms** hero or choreography. Nothing over 800ms in a flow.
- Easing: `cubic-bezier(.2,.8,.2,1)` for enter, `cubic-bezier(.4,0,1,1)` for exit. Linear only for loops (rain, scanlines).
- Stagger lists at 40–60ms per item, capped at about 8 items.

## Performance
- Animate only `transform` and `opacity` (and `filter` sparingly).
- Use `will-change` only during the animation.
- Avoid layout thrash: no animating width, height, top or left.

## Micro-interactions
- Buttons get a press state and a visible `:focus-visible` ring.
- Toggles (vote, heart, bookmark) update optimistically or show `pending` from `useTransition` (see `src/app/w/[handle]/[slug]/Social.tsx`).
- Form errors appear with a short fade, with `role="alert"` on the message.

## CSP note
Animation libraries must not need inline `<script>`. The nonce CSP (`src/proxy.ts`) blocks it. Inline `style` is allowed.
