

# SaveDi App — Personal Finance Management

A dark-themed, Vietnamese-language personal finance app that converts the SaveDi Ultimate Excel model into a modern web experience with LocalStorage persistence.

## Pages & Navigation

**Sidebar navigation** with 4 main sections: Tổng quan (Dashboard), Giao dịch (Transactions), Kế hoạch (Budget Plan), and Mục tiêu FIRE (FIRE Goals).

---

## 1. Dashboard — Tổng quan
The default landing page showing a snapshot of your financial health for the current month:

- **Net Worth card** — total asset value (Cổ phiếu + Tiền mã hóa + Vàng)
- **Income Allocation donut/summary** — visual split of 50% Essentials / 20% Lifestyle / 30% Savings with editable percentages (must total 100%)
- **Savings Goals progress** — progress bars for each goal (Du lịch, Mua Oto, Tiền đặt cọc nhà) showing current vs target and percentage
- **Upcoming Subscriptions** — list of recurring costs (Netflix, Canva, Better Me, Strava) with due dates, highlighting items due within 7 days
- **Monthly summary cards** — total income, total expenses, total savings, expense-to-income ratio

## 2. Transactions — Giao dịch
A combined view for recording and reviewing all financial movements:

- **Transaction Form** — add income or expense with date, amount, category (dropdown grouped by type: Chi phí thiết yếu, Chi phí không thiết yếu, Thu nhập), and optional note
- **Transaction List** — filterable table of all transactions for the selected month with:
  - Emoji-tagged category names (Tiền nhà 🏡, Ăn uống 🥘, etc.)
  - Color-coded evaluation badges: 😍 green when under plan, 😰 red when over plan, neutral when equal
  - Cumulative spending indicator per category
- **Edit/Delete** capability on each transaction
- **Month selector** dropdown to switch between months

## 3. Budget Plan — Kế hoạch
The budget matrix view replicating the Excel planning sheet:

- **Month selector** at the top
- **Budget Matrix table** with rows = categories (grouped by essential/non-essential/savings/investment), columns = Kế hoạch (Planned) | Thực tế (Actual) | +/- (Difference)
  - Red indicator when actual exceeds plan (overspending)
  - Green indicator when actual is under plan
  - Gray/neutral for zero difference
- **Summary row** showing totals for each section (Tổng chi phí thiết yếu, Tổng chi phí không thiết yếu, Tổng tiết kiệm, Tổng đầu tư)
- **Monthly surplus display** — "Tháng này, bạn còn dư: X₫"
- Ability to set/edit planned amounts per category per month

## 4. FIRE Goals — Mục tiêu FIRE
The investment and financial independence tracking section:

- **FIRE Calculator card**:
  - Monthly expenses input (default 20,000,000₫)
  - Annual expenses = monthly × 12
  - FI Number = annual × 25 (default 6,000,000,000₫)
  - Adjustable inflation rate (default 4%) with 10-year projection
  - Future FI target = FI Number × (1 + inflation)^10

- **Asset Portfolio table** — editable values for Cổ phiếu 📈, Tiền mã hóa 💳, Vàng 🏆 with pie chart breakdown
- **Net Worth = sum of all assets**

- **FIRE Projection Chart** (Recharts line chart):
  - Net worth growth line based on current assets + monthly savings + return rate (default 7%)
  - Horizontal FI target line
  - Year-by-year cumulative asset tracking (Năm 2018–2023 style)

- **FIRE Progress indicator** — "Bạn đã đạt được X% 🥳" with progress bar toward FI number

## Design

- **Dark mode** with slate-900 backgrounds
- **Emerald accents** for positive indicators (savings, under budget)
- **Red** for overspending/risk warnings
- Soft card layout with rounded corners
- VND currency formatting throughout (e.g., 30,000,000 ₫)
- Responsive layout for desktop and mobile
- Vietnamese category names with emoji icons matching the Excel

## Data & Persistence

- All data stored in LocalStorage with a centralized state object
- Pre-populated with Vietnamese mock data matching the Excel categories
- Month-based data filtering throughout the app
- Automatic recalculation when transactions are added/edited

## Optional Enhancements (included)
- Reset month button
- VND currency formatter utility
- Edit/delete transactions

