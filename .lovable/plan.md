## Plan: Empty States + Onboarding Checklist + Shortcuts Cheatsheet

### 1. Reusable EmptyState component
Create `src/components/EmptyState.tsx`:
- Props: `icon` (lucide), `title`, `description`, `actionLabel`, `onAction`, optional `secondaryLabel` + `onSecondary` (for "Load sample data").
- Centered card-style block with icon circle, title, muted description, primary button, optional ghost secondary button.

### 2. Wire empty states into pages
Detect "no data" condition and render `<EmptyState>` in place of the empty table/grid:

- **Transactions** (`src/pages/Transactions.tsx`): when `data.transactions.length === 0` for the visible month → "No transactions yet" + CTA "Add your first transaction" (focuses Amount field, same as `N` shortcut) + secondary "Load sample data".
- **Budget Plan** (`src/pages/BudgetPlan.tsx`): when no plans exist for the month → "No budget set for {month}" + CTA "Start planning" (focuses first Planned input).
- **Categories** (`src/pages/CategoriesManager.tsx`): when `data.categories.length === 0` → "No categories yet" + CTA "Add a category" + secondary "Load defaults" (uses `initialData.categories`).
- **Portfolio** (`src/pages/Portfolio.tsx`): when `data.portfolio?.length === 0` → "Track your first asset" + CTA "Add asset".
- **FIRE Goals** (`src/pages/FireGoals.tsx`): when `goals.length === 0` → "Set your first goal" + CTA.
- **Report** (`src/pages/Report.tsx`): when no transactions in range → "No data to chart yet — add transactions to see insights".

For "Load sample data" actions we'll add a helper `loadSampleData()` in `use-app-data.ts` that bulk-inserts a small sample (3 categories + 2 transactions, or default categories) via existing add functions.

### 3. Onboarding checklist on Dashboard
Create `src/components/OnboardingChecklist.tsx`:
- Card pinned at top of Dashboard, above hero metrics.
- Computes 4 items from app data:
  1. **Set monthly income** — done if any `transaction.type === "income"` exists.
  2. **Create your first 3 categories** — done if `data.categories.length >= 3`.
  3. **Set budget for this month** — done if `data.monthlyPlans[currentMonthKey]` has any planned > 0.
  4. **Add a portfolio asset** — done if `data.portfolio?.length > 0`.
- Each row: checkbox (read-only check icon when done, hollow circle when not), label, right-aligned "Go →" link routing to the relevant page.
- Top: progress bar `done/4` + "X of 4 complete" + small `X` to dismiss.
- Dismissal persisted in `localStorage` (`onboarding_checklist_dismissed`). Auto-hides once all 4 are done (with a one-time success toast).
- Replaces the existing first-visit `OnboardingModal` trigger; modal can stay accessible from a "Restart tour" affordance but won't auto-pop.

### 4. Keyboard shortcuts cheatsheet
Create `src/components/ShortcutsDialog.tsx`:
- Dialog listing the shortcuts, grouped by page:

```text
Budget
  Enter        Save cell, jump to next planned cell
  Shift+Enter  Save cell, jump to previous planned cell
Transactions
  N            Focus Amount field to start adding
Categories
  N            Open the add-category row
Portfolio
  N            Open the add-asset row
  ↓ / ↑        Navigate between asset groups
  Enter        Expand / collapse focused group
```

- Global trigger: press `?` (Shift+/) anywhere → opens dialog. Mount listener in `AppLayout.tsx` (skip when typing in input/textarea).
- Add a small "⌨ Shortcuts" button in the sidebar footer (next to profile) that opens the same dialog.
- First-time hint: small toast on first dashboard visit "Tip: press ? to see keyboard shortcuts" (localStorage flag).

### 5. Memory updates
Add a memory file `mem://features/onboarding` documenting: checklist items + completion logic, sample-data action, `?` shortcut convention. Update `mem://index.md` to reference it.

### Files touched
- New: `src/components/EmptyState.tsx`, `src/components/OnboardingChecklist.tsx`, `src/components/ShortcutsDialog.tsx`
- Edited: `src/pages/{Dashboard,Transactions,BudgetPlan,CategoriesManager,Portfolio,FireGoals,Report}.tsx`, `src/components/AppLayout.tsx`, `src/hooks/use-app-data.ts`
- Memory: `mem://features/onboarding`, `mem://index.md`
