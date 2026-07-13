# Doraemon Theme Restyle — Plan

Visual-only restyle. No changes to data flow, component structure, routing, or business logic. All edits confined to design tokens, Tailwind config, shared UI primitives, and page-level className usage.

## 1. Design tokens (`src/index.css`, `tailwind.config.ts`)

Rewrite the `:root` HSL tokens so every existing `bg-primary`, `text-primary`, `border-border`, etc. picks up the new palette automatically:

- `--primary` → Doraemon blue `#00A0E9`
- `--destructive` / accent red → `#E60026`
- New `--bell` token → `#FFD700` (used sparingly: warnings, highlights, active bell nav item)
- `--foreground` / new `--outline` → `#1A1A1A`
- `--background` / `--card` → `#FFFFFF`
- `--success` → `#00B060` (gains)
- `--loss` → `#E60026` (reuse destructive, but add a semantic alias `--loss` so financial red is never visually ambiguous)
- `--border` → near-black `#1A1A1A` at full strength for card outlines; keep a lighter `--border-soft` for table row dividers

Add to `tailwind.config.ts`: `bell`, `outline`, `loss` color entries, and a `screentone` background image utility (SVG dot grid at ~6% opacity) applied on `body`.

Typography:
- Headers/display: import **Bangers** or **Chango** (rounded, bold, manga chapter feel) via Google Fonts in `index.html`; expose as `font-display`.
- Numbers/tables: keep current sans (Inter/system) with `font-variant-numeric: tabular-nums` enforced globally on `.tabular`, `td`, and amount spans.
- Add a `.manga-title` utility: display font + black text-stroke outline (`-webkit-text-stroke: 1px #1A1A1A`) for page H1s only.

## 2. Component primitives (shadcn wrappers under `src/components/ui/*`)

Touch only className/variant defaults — no API changes.

- **Card** (`card.tsx`): `border-2 border-outline rounded-2xl bg-white shadow-[4px_4px_0_0_#1A1A1A]` (hard manga drop shadow). Add `card-shadow` class in `index.css` to match.
- **Button** (`button.tsx`): default variant becomes pill (`rounded-full`), `border-2 border-outline`, slightly larger padding (`px-5 py-2.5`), bold text. Variants: `default` = blue fill, `destructive` = red fill, `bell` (new) = yellow fill, `outline` = white fill. All keep black outline + subtle hard shadow.
- **Input / Select / Textarea**: `border-2 border-outline rounded-xl` focus ring in blue.
- **Badge**: pill with black outline; color variants map to primary/bell/destructive/success.
- **Dialog / Popover / Tooltip**: `border-2 border-outline rounded-2xl` with hard shadow; tooltip gets a speech-bubble tail via `::after` triangle.
- **Table** (`table.tsx`): header row → blue background with white bold text and black bottom border; body rows keep density, hover `bg-bell/10`.

## 3. Sidebar / navigation (`src/components/AppLayout.tsx`)

Belly-pocket motif — style only, structure unchanged:
- Sidebar background: Doraemon blue.
- Overlay a large white semicircle at the bottom (absolute-positioned SVG or `::before` with `border-radius: 100% 100% 0 0`) as the "pocket."
- Nav items: white text on blue by default; active item becomes a **bell** — yellow pill (`bg-bell`), black outline, small black "slit" (a 2px black line via pseudo-element) at the bottom to evoke the bell shape.
- Logo lockup: keep `Landmark` icon but tint blue with a small yellow bell dot; keep "Finance Lab" wordmark in display font.
- Profile card at bottom sits inside the white pocket area (contrast automatically works).
- Search input, Shortcuts, Sign Out: restyle to white pills on the blue area, black outlined pills on the pocket area.

Mobile header mirrors the same blue bar with the pocket edge along the bottom border.

## 4. Charts (`src/pages/Dashboard.tsx`, `Report.tsx`, `Portfolio.tsx`, `FireGoals.tsx`)

Recharts theming only — no chart type or data changes:
- Axes and gridlines: `stroke="#1A1A1A"`, gridlines dashed at low opacity.
- Series colors pulled from tokens: blue (primary), bell yellow, success green, loss red — never theme-red for a non-loss series.
- `<Tooltip>` custom content wrapper: white card, 2px black border, rounded-2xl, small triangular tail (speech bubble). Reused via a new `MangaTooltip` component in `src/components/ui/`.
- Legend chips: pill-shaped with black outline.

## 5. Page-level polish (className swaps only)

- **Dashboard**: page H1 uses `.manga-title`; `CollapsibleAlerts` pill takes bell yellow when alerts > 0; `OnboardingChecklist` progress bar uses blue fill on black-outlined track.
- **Transactions**: table header restyled via the Table primitive; positive amounts `text-success`, negative `text-loss` (already the pattern — just retune colors).
- **Budget Plan**: planned-vs-actual bars use blue/bell; over-budget highlighted in loss red with a small bell warning icon.
- **Categories, Portfolio, Report, FIRE**: pick up primitives automatically; only H1 + empty-state icon tints need updating.
- **EmptyState**: swap the blue circle background for a bell-yellow circle with black outline; icon in outline black.
- **Auth / Landing**: apply the same tokens; hero uses screentone background.

## 6. Background & global feel

- `body`: white with a repeating screentone dot SVG at 6% opacity (`background-image: url('data:image/svg+xml;...')`).
- Global scrollbar restyled to blue thumb with black outline (webkit only, non-critical).

## 7. Accessibility

- Verify WCAG AA contrast for every text-on-blue combination: white text on `#00A0E9` = 3.06:1 (fails AA for body). Mitigation: use `#004A70` (deep Doraemon-navy) for body text on blue surfaces, keep pure white only for large/bold nav labels ≥18pt bold. Add this as `--primary-foreground-strong` token.
- Bell yellow `#FFD700` never used for text on white (contrast 1.5:1) — only as fill behind black-outlined text or as accent shape.
- Numbers in tables stay on white cards → contrast is unchanged.

## 8. Preview-before-apply

Per your constraint, before applying globally I will:
1. Implement tokens + Card/Button/Table/Tooltip primitives + Sidebar only.
2. Show you the **Dashboard**, **Transactions table**, one **chart** (Report), and the **sidebar** on the current preview.
3. Wait for your sign-off, then propagate to remaining pages (Budget, Categories, Portfolio, FIRE, Auth, Landing).

## Files touched (round 1, preview)

- `index.html` (font links)
- `src/index.css` (tokens, screentone, `.manga-title`, card/tooltip shadow utilities)
- `tailwind.config.ts` (new colors, fontFamily)
- `src/components/ui/{card,button,input,badge,dialog,tooltip,table}.tsx` (variant classNames only)
- `src/components/AppLayout.tsx` (sidebar visuals)
- `src/components/ui/chart.tsx` or a new `MangaTooltip.tsx` for Recharts
- `src/components/EmptyState.tsx` (icon bg color)
- `src/pages/Dashboard.tsx` + `Report.tsx` (H1 class, chart color props)

Round 2 (after approval): remaining pages — className adjustments only.

## Explicitly NOT changing

- No component renames, no file moves, no prop signature changes.
- No data hooks, no Supabase calls, no routing.
- No chart types, no table columns, no business logic.
- No mock data anywhere.
