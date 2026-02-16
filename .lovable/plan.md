

## Update "Last Edited" Column for Portfolio Assets

### Problem
The `updatePortfolioEntry` function does not set the `updated_at` timestamp when updating an asset. Additionally, when portfolio quantities change via buy/sell transactions, the `updated_at` field is also not updated. This means the "Last Edited" column on the Portfolio page shows stale or missing dates.

### Changes

#### 1. `src/hooks/use-app-data.ts` - Add `updated_at` to all portfolio update paths

- **`updatePortfolioEntry`** (line ~513): Add `dbUpdate.updated_at = new Date().toISOString()` before the Supabase update call.
- **`addTransaction` sell handler** (line ~175): When reducing portfolio quantity on sell, also set `updated_at` to current timestamp.
- **`addTransaction` buy handler** (line ~191): When updating portfolio quantity/price on buy, also set `updated_at` to current timestamp.
- **`deleteTransaction` sell reversal** (line ~219): When restoring quantity after deleting a sell transaction, also set `updated_at`.
- **`deleteTransaction` buy reversal** (line ~235): When reversing a buy transaction deletion, also set `updated_at`.

#### 2. No database migration needed
The `portfolio_entries` table already has an `updated_at` column (used during `addPortfolioEntry`), and `addPortfolioEntry` already sets it. We just need to ensure all other update paths also set it.

### Summary of Touchpoints
- `updatePortfolioEntry` -- add `updated_at`
- `addTransaction` (sell path) -- add `updated_at` to quantity update
- `addTransaction` (buy path) -- add `updated_at` to quantity/price update
- `deleteTransaction` (sell reversal) -- add `updated_at` to quantity restore
- `deleteTransaction` (buy reversal) -- add `updated_at` to quantity/price restore

