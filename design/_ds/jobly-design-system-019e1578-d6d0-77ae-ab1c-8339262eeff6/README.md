# Jobly Design System

A dark, Linear-inspired UI system for **Jobly** — a job-discovery and auto-apply
product. Calm, dense, functional. Near-black surfaces, restrained accents,
precise typography. No gradients, no decorative shadows, no emoji.

## Sources used to build this
- `uploads/DESIGN.md` — the canonical brand specification this system implements.
- **No codebase** was attached — the UI kit is a faithful interpretation of the
  spec, not a port of production code.
- **No Figma** was attached.
- **No fonts** were attached — Inter & Inter Display are pulled from the
  official rsms.me CDN (see `fonts/README.md` for the substitution note).

If any of the above exist and you'd like the system to match them more
precisely, attach them via Import and ask for a refresh.

---

## Content fundamentals

**Voice.** Direct, calm, peer-level. Sentence-case everything (button labels,
section titles, toasts). Never shouty.

**Pronouns.** *You* and *your*. Jobly speaks to a single user.

**Tone examples** (written for this system):
- Button: `Apply with Jobly` (not "Submit application now ✨")
- Toast: `Application submitted to Linear` (no exclamation, no emoji)
- Empty state: `Select a job to see details` (no illustration, no apology)
- Modal title: `Withdraw application?` (question, not "Are you sure???")
- Error: `Enter a valid email address.` (period, terse)

**Casing.** Sentence case for UI copy. Title Case is reserved for product
nouns ("Auto-apply", "Match Score"). UPPERCASE is only used at 11px for
section labels with 0.06em tracking.

**Emoji.** Never. Jobly uses outline 1.5px-stroke icons for everything.

**Numbers.** Match scores always shown as integers + `%` in monospace
(`87%`). Money in `$190k–$240k` form. Time as `2h ago`, `Posted 2d ago`.

---

## Visual foundations

**Backgrounds.** Five-step elevation scale from `#0F0F10` (root) → `#2A2A2E`
(hover surface). Never pure black, never pure white. Elevation comes from
*color shift only* — no shadows.

**Borders.** Three weights, all near-black. Cards use `border-faint` by
default and lift to `border-default` on hover. Focused inputs use
`border-strong` plus a 2px `accent-muted` ring.

**Color usage.** Accent (`#5E6AD2`) is reserved for primary CTAs, active nav,
and links — never decorative. Semantic colors (success / warning / error /
info) each have a `-subtle` background tint paired with a saturated
foreground/border for badges and pills.

**Type.** Inter for UI, Inter Display for headings ≥ 20px. Headings track
`-0.01em`, body `0`. Never go below 11px or above weight 600.

**Spacing.** 4px base. Cards pad at 16px, modals at 24px. Section gaps 32px.

**Backgrounds (imagery).** None. Jobly has no hero images, no patterns, no
illustrations, no gradients. Visual interest comes from typography, density,
and the match-score color scale.

**Animation.** Cubic-bezier `(0.16, 1, 0.3, 1)` for everything. Durations:
`120ms` micro, `200ms` panels/modals, `300ms` drawers. Skeleton shimmer is
`1.5s linear infinite`. The SSE status dot pulses at `1.2s` ease-in-out.

**Hover.** Backgrounds shift one elevation step up; text shifts secondary →
primary. Never opacity changes, never scale.

**Press.** No press transform — Linear's restraint applies. Disabled state
is `opacity 0.4` and `cursor: not-allowed`.

**Borders / radii.** `4` (badges) · `6` (buttons, inputs, cards-small) ·
`8` (cards, modals) · `12` (sheets). Never above 12.

**Shadows.** None. Repeat: **no `box-shadow`** anywhere. Use border-only
cards. The single exception is the focus ring (a 2px solid offset, not a
shadow).

**Transparency / blur.** Only on modal backdrops: `rgba(0,0,0,0.6)` with
`backdrop-filter: blur(4px)`. Never on cards or surfaces themselves.

**Cards.** `bg-surface` background, 1px `border-faint` outline, 8px radius,
16px padding. Hover lifts the border to `border-default`. No shadow, no
gradient, no inner-glow.

**Layout rules.** Sidebar is fixed left, 220px expanded / 48px collapsed.
Main content fills the rest. Page header is 56px, 0 24px padding,
border-bottom only.

---

## Iconography

Outline, 1.5px stroke, square caps. Sized at:
- `16px` inline UI (button icons, list rows)
- `20px` sidebar nav
- `24px` empty states / feature glyphs

Color: `text-secondary` by default, `text-primary` on hover, `accent` for
active nav. **No filled icons, no colored icon backgrounds** (Linear removed
these in their 2024 refresh; Jobly inherits the rule).

**Icon set.** Lucide-compatible. We hand-rolled the small set inside
`Primitives.jsx` to keep the kit dependency-free, but in production you
should `npm install lucide-react` (or load via CDN) — the stroke widths and
proportions match exactly.

**No emoji.** No unicode dingbats. No PNG icons. SVG only, inline or as
sprites — never as `<img>` (so they inherit `currentColor`).

---

## Files in this system

```
README.md                  — this file
SKILL.md                   — agent skill entrypoint
colors_and_type.css        — all CSS variables + base element styles
fonts/README.md            — webfont source + substitution flag
assets/
  logo-mark.svg            — square Jobly mark
  logo-wordmark.svg        — mark + wordmark, on dark
preview/                   — Design System tab cards (registered via manifest)
ui_kits/
  app/
    index.html             — click-thru Jobly app prototype
    README.md              — UI kit notes
    Primitives.jsx         — Icon, Button, Badge, StatusDot, ProgressBar
    Sidebar.jsx
    JobsList.jsx · JobCard.jsx · JobDetail.jsx
    App.jsx                — composes everything
```

## Quick start

```html
<link rel="stylesheet" href="colors_and_type.css">
<style>
  /* tokens are now available as CSS vars */
  .my-card { background: var(--bg-surface); border: 1px solid var(--border-faint); border-radius: var(--radius-lg); padding: var(--space-4); }
</style>
```

For React components, copy the JSX files out of `ui_kits/app/` and the
patterns out of `Primitives.jsx`. They're intentionally cosmetic — fork
freely.
