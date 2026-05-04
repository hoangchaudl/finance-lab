## Tour Improvements — Categories, Budget, Font & Demo Animations

Four focused changes to the existing `driver.js` guided tours.

---

### 1. Categories page — spotlight the "Add Category" button

**File:** `src/pages/CategoriesManager.tsx`
- Add `data-tour="cat-add"` to the `<Button>` "Add Category" (line 129).
- Add `data-tour="cat-row"` to the first row of the table (or the table itself) so a follow-up step can show the edit/delete actions.

**File:** `src/lib/tours.ts` — replace the `categories` tour with:
1. Page title — what this page is for.
2. `[data-tour="cat-add"]` — "Click here to create a new category. Give it a name, an emoji, and pick a type (Income, Essential, Savings, etc)." + embedded mini-demo (see §4).
3. `[data-tour="cat-row"]` — "Each row is one category. Use the pencil to rename or the trash icon to remove it."

---

### 2. Budget Plan — spotlight the "Planned" column

**File:** `src/pages/BudgetPlan.tsx`
- Add `data-tour="budget-planned-col"` to the `<TableHead>` for "Planned" (line 554) **and** to the first `PlannedInput` cell so the spotlight covers a real input the user can see.

**File:** `src/lib/tours.ts` — extend the `budget` tour:
1. Page title (existing).
2. `[data-tour="budget-table"]` — overall table intro.
3. `[data-tour="budget-planned-col"]` — "Type your monthly budget for each category here. Numbers auto-format with thousand separators. Press **Enter** to save." + embedded mini-demo (see §4).

---

### 3. Match the app's font in tour popovers

Driver.js ships with its own font stack. Override it in `src/index.css` under `.driver-popover.fl-tour` so titles, body text and buttons inherit the app's font:

```css
.driver-popover.fl-tour,
.driver-popover.fl-tour * {
  font-family: inherit;
  font-feature-settings: inherit;
  letter-spacing: inherit;
}
```

The app uses Tailwind's default sans stack on `body`, so popovers will visually match the rest of the UI automatically.

---

### 4. Embedded "sample animation" demos inside tooltips

Driver.js accepts **HTML** in `popover.description`. Create a new helper file `src/lib/tour-demos.ts` exporting small self-contained HTML snippets that demonstrate the action being taught. Each snippet is a tiny styled mock-input plus a CSS `@keyframes` animation that loops typing the value or selecting an option.

Three reusable demos:

| Demo key       | Shows                                                                  | Used in step                       |
|----------------|------------------------------------------------------------------------|------------------------------------|
| `typeNumber`   | A faux input where digits `1 → 10 → 100 → 1.000 → 10.000` appear, then an "Enter ↵" pill flashes and the value gets a green check. | Budget Plan "Planned" step         |
| `addCategory`  | A faux row: emoji `🍔` types in, name `Food` types in, a Type dropdown highlights "Essential", then a check-mark confirms. | Categories "Add Category" step     |
| `clickButton`  | A pulsing `+ Add` button being clicked (cursor svg glides + click ripple). | Generic "click this button" hints  |

**Implementation:**
- Each demo is a plain HTML string (≈80×40 mock UI in a rounded card) that uses **scoped class names** like `.fl-demo-input`, `.fl-demo-cursor`.
- Add the keyframes + class styles to `src/index.css` once (next to the existing `.fl-tour` block), e.g. `@keyframes fl-type-1000 { 0% {content: ""} 25% {content: "1"} 50% {content: "10"} 75% {content: "100"} 100% {content: "1.000"} }` and a 3 s infinite loop on `.fl-demo-input::after`.
- In `tours.ts`, build descriptions like:
  ```ts
  description: `Type your monthly budget here. Numbers auto-format and Enter saves.<div class="fl-demo">${TOUR_DEMOS.typeNumber}</div>`
  ```
- Driver.js sanitizes nothing by default but renders our trusted strings — no XSS surface (no user data interpolated).

Result: every "how do I do this?" step now contains a small live preview of the interaction, no GIF assets or extra dependencies needed.

---

### Files touched

- `src/lib/tours.ts` — expand categories + budget tours, inject demo HTML.
- `src/lib/tour-demos.ts` — **new**, exports `TOUR_DEMOS = { typeNumber, addCategory, clickButton }`.
- `src/index.css` — add `font-family: inherit` override + `.fl-demo*` styles & keyframes.
- `src/pages/CategoriesManager.tsx` — add `data-tour` attrs on Add button + first row.
- `src/pages/BudgetPlan.tsx` — add `data-tour` attr on Planned column header / first PlannedInput cell.

No backend, no new dependencies.
