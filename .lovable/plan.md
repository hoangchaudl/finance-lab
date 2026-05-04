## Guided Spotlight Tours — Plan

Add an interactive, spotlight-style guided tour to every main page of Finance Lab. Each tour highlights key UI elements one at a time with a tooltip explaining what to do. Users can close the tour anytime, and re-open it from a small Help button in the page header.

### Library

Use **`driver.js`** (lightweight, ~5KB, framework-agnostic, MIT). It handles the spotlight overlay, focus trap, tooltips, keyboard navigation, and progress dots out of the box — much less custom code than building from scratch, and more polished than Intro.js.

### UX Behavior

- Tour auto-starts on the **first visit** to each page (tracked per-page in `localStorage`).
- After dismissal it does **not** auto-start again, but a **"?" Help button** appears next to each page title to re-launch it on demand.
- Tour steps highlight elements via `data-tour` attributes (no brittle CSS selectors).
- Smooth fade + scale animation on the spotlight (driver.js built-in).
- Esc / overlay click / "Done" all close the tour cleanly.

### Architecture

```text
src/
├── lib/
│   └── tours.ts                     # Tour step definitions per page
├── hooks/
│   └── use-page-tour.ts             # Hook: auto-start + expose start()
└── components/
    └── PageTourButton.tsx           # "?" button shown beside page titles
```

**`tours.ts`** — central registry mapping page key → driver.js step array:

```ts
export const TOURS = {
  dashboard: [
    { element: '[data-tour="net-worth"]', popover: { title: 'Your Net Worth', description: '…' }},
    { element: '[data-tour="quick-stats"]', popover: { title: 'Monthly Summary', description: '…' }},
    …
  ],
  transactions: [ … ],
  budget: [ … ],
  categories: [ … ],
  portfolio: [ … ],
  fire: [ … ],
  report: [ … ],
}
```

**`use-page-tour.ts`** — on mount, if `localStorage.tour_seen_<key>` is unset, start the tour and mark seen on completion/close. Returns `{ startTour }` so the Help button can re-trigger.

**`PageTourButton.tsx`** — small ghost icon button (`HelpCircle` from lucide-react) that calls `startTour()`.

### Pages & Tour Highlights

| Page         | Steps highlighted                                                                 |
|--------------|------------------------------------------------------------------------------------|
| Dashboard    | Net worth card, monthly summary, recent activity, navigation sidebar              |
| Transactions | Add Transaction button, filters, transaction list row, edit/delete actions       |
| Budget Plan  | Add category row, Planned Amount input (Enter to save), progress bars            |
| Categories   | Create category, tier selector, edit/delete                                       |
| Portfolio    | Add entry, tier breakdown chart, total value                                      |
| FIRE         | FI target card, progress bar, required monthly savings                            |
| Reports      | Date range picker, charts, export                                                 |

### Implementation Steps

1. **Install** `driver.js` via `bun add driver.js`.
2. **Create** `src/lib/tours.ts` with step definitions for all 7 pages.
3. **Create** `src/hooks/use-page-tour.ts` (auto-start + localStorage gating + `startTour` return).
4. **Create** `src/components/PageTourButton.tsx` (HelpCircle icon button).
5. **Add `data-tour="…"`** attributes to the relevant elements on each page (Dashboard, Transactions, BudgetPlan, CategoriesManager, Portfolio, FireGoals, Report).
6. **Wire each page**: call `usePageTour('<key>')`, render `<PageTourButton onClick={startTour} />` next to its `<h1>`.
7. **Theme the driver.js popover** to match the app (rounded-2xl, primary blue accents, shadow) via a small CSS override in `src/index.css`.
8. **Reset helper** (optional): add a "Replay all tours" link in the Profile page that clears all `tour_seen_*` keys.

### Notes / Edge Cases

- Tours only run inside `ProtectedRoutes`, so unauthenticated users never see them.
- If a target element isn't in the DOM (e.g., empty state), driver.js skips that step gracefully — we'll set `allowClose: true` and `showProgress: true`.
- Tooltips use English copy only (per project rules).
- No backend / DB changes required.
