# Finance Lab — Backend Structure

This document describes the backend that powers Finance Lab. It starts with a high-level overview for quick orientation, then dives into a detailed reference of every table, policy, function, and integration.

---

## 1. High-Level Overview

### 1.1 Stack

Finance Lab runs on **Lovable Cloud** (managed Supabase):

- **Postgres** — application data, all tables in the `public` schema
- **Auth** — email/password sign-in via Supabase Auth (`auth.users`)
- **Storage** — public `avatars` bucket
- **Edge Functions** — Deno runtime for scheduled/HTTP jobs
- **Resend** — transactional email (via edge function)

The React app talks to the backend through the auto-generated Supabase client at `src/integrations/supabase/client.ts`. All data reads/writes flow through `src/hooks/use-app-data.ts` and are exposed to the UI via `src/contexts/AppContext.tsx`.

### 1.2 Architecture

```text
 ┌────────────────────┐        ┌──────────────────────────────────────┐
 │  React (Vite) app  │        │            Lovable Cloud             │
 │                    │        │                                      │
 │  AppContext ──► useAppData ─┼─► Supabase Client ──► Auth           │
 │                             │                    ├─► Postgres (RLS)│
 │                             │                    ├─► Storage       │
 │                             │                    └─► Edge Functions│
 └────────────────────┘        │                            │         │
                               │        send-budget-reminder┴─► Resend│
                               └──────────────────────────────────────┘
```

### 1.3 Domain model at a glance

| Group | Tables |
|---|---|
| Identity / settings | `auth.users` → `profiles` |
| Money in/out | `categories`, `category_allocations`, `monthly_plans`, `transactions`, `subscriptions` |
| Wealth | `portfolio_entries`, `assets`, `goals` |

### 1.4 Security model

- Every `public` table has **Row-Level Security enabled**.
- Policy pattern: `auth.uid() = user_id` (or `auth.uid() = id` for `profiles`).
- Grants: `authenticated` gets CRUD, `service_role` gets ALL. No `anon` access.
- A user can only ever see or mutate their own rows. There is no cross-user data path in the client.

---

## 2. Detailed Reference

### 2.1 Tables

Standard columns present on almost every table: `id uuid PK default gen_random_uuid()`, `user_id uuid NOT NULL` (references the authenticated user), `created_at timestamptz default now()`. They are omitted from the per-column tables below.

#### `profiles`
User-level settings. One row per `auth.users` row (id = user id, created by trigger).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, matches `auth.users.id` |
| `birth_year` | int | default `2001`, used by FIRE math |
| `monthly_expenses` | numeric | default `16_500_000` |
| `inflation_rate` | numeric | default `4` |
| `return_rate` | numeric | default `10` |
| `essentials_pct` | numeric | default `50` |
| `lifestyle_pct` | numeric | default `30` |
| `savings_pct` | numeric | default `20` |
| `updated_at` | timestamptz | auto |

Used by: `Profile`, `FireGoals`, `Dashboard`, onboarding checklist.

#### `categories`
Buckets used to classify transactions.

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `emoji` | text | default `'📁'` |
| `type` | text | one of `income`, `essential`, `nonessential`, `savings`, `investment` |

Used by: `CategoriesManager`, `Transactions`, `BudgetPlan`, `Report`.

#### `category_allocations`
Percentage of income allocated to each category.

| Column | Type | Notes |
|---|---|---|
| `category_id` | uuid | FK → `categories.id` |
| `percentage` | numeric | 0–100 |

Used by: `BudgetPlan` (allocation math).

#### `monthly_plans`
Planned spend per category per month.

| Column | Type | Notes |
|---|---|---|
| `month_key` | text | e.g. `2026-07` |
| `category_id` | uuid | FK → `categories.id` |
| `planned` | numeric | |

Used by: `BudgetPlan`, `Dashboard` progress bars.

#### `transactions`
Every income/expense/investing/saving/sell/dividend event.

| Column | Type | Notes |
|---|---|---|
| `date` | date | |
| `amount` | numeric | |
| `type` | text | `income`, `expense`, `investing`, `saving`, `sell`, `dividend` |
| `category_id` | uuid nullable | FK → `categories.id` |
| `note` | text nullable | |
| `portfolio_entry_id` | uuid nullable | FK → `portfolio_entries.id`; set for buys/sells/dividends |
| `quantity` | numeric nullable | used to recompute average price on buys |
| `realized_gain` | numeric nullable | recorded on sells |
| `quality` | text nullable | for `income`: `active`, `scalable`, `passive` |

> ⚠ There is **no `updated_at`** on `transactions`. Never send it in an update payload.

Used by: `Transactions`, `Dashboard`, `Report`, `Portfolio` (via linked entries).

#### `subscriptions`
Recurring monthly bills.

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `amount` | numeric | |
| `due_day` | int | day of month, default `1` |

Used by: `Dashboard` (subscription alerts), `Transactions`.

#### `portfolio_entries`
Investment holdings.

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `type` | text | e.g. `ETF`, `Crypto`, `Stocks`, `Gold`, `Savings` |
| `tier` | text nullable | `Defensive`, `Safe`, `Income`, `Growth`, `Risk` |
| `account` | text | default `'Unassigned'` |
| `quantity` | numeric | |
| `purchase_price` | numeric | average cost basis |
| `current_price` | numeric | latest mark |
| `notes` | text nullable | |
| `updated_at` | timestamptz | auto-updated by trigger |

Used by: `Portfolio`, linked from `transactions`.

#### `assets`
Non-invested personal assets (laptop, phone, deposits, …).

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `emoji` | text | default `'💰'` |
| `value` | numeric | |

Used by: `Portfolio` (Personal Assets section), `Dashboard` net worth.

#### `goals`
Savings/FIRE targets.

| Column | Type | Notes |
|---|---|---|
| `name` | text | |
| `current` | numeric | |
| `target` | numeric | |

Used by: `FireGoals`, `Dashboard`.

### 2.2 Database functions & triggers

- **`public.handle_new_user()`** — `SECURITY DEFINER`. Fires on `auth.users` insert and creates the matching `profiles` row so every new user has settings ready.
- **`public.update_updated_at_column()`** — generic trigger function. Attached to `portfolio_entries` to keep `updated_at` fresh on every update.

### 2.3 Row-Level Security

Every public table has RLS enabled with a single "manage own rows" policy:

```sql
-- pattern used on categories, transactions, portfolio_entries, etc.
CREATE POLICY "Users manage own rows"
ON public.<table>
FOR ALL
TO authenticated
USING  (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

`profiles` uses `auth.uid() = id` and additionally has policies that let a user `SELECT`, `INSERT`, and `UPDATE` their own profile (3 policies).

**Grants** (all tables):
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
-- no GRANT to anon
```

### 2.4 Authentication

- Provider: **Supabase Auth**, email + password.
- Session persisted in browser storage by the Supabase client; hydrated by `src/contexts/AuthContext.tsx`.
- Password reset flow: `/reset-password` (`src/pages/ResetPassword.tsx`).
- Sign-in / sign-up UI: `src/pages/Auth.tsx`.
- New-user side effect: `handle_new_user()` trigger seeds `profiles`.

### 2.5 Storage

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | Yes | User avatar images |

Upload path convention is `<user_id>/<filename>` (required by the bucket's RLS — see `mem://tech/storage-logic`). URLs are read via `getPublicUrl`.

### 2.6 Edge Functions

#### `send-budget-reminder`
- Path: `supabase/functions/send-budget-reminder/index.ts`
- Config: `verify_jwt = false` (safe to invoke on a schedule).
- Uses the service-role client to list verified users, then sends a weekly budget check-in email via **Resend** with a link back to `/budget`.
- Env: `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Returns `{ message, sent, errors }`.

### 2.7 Secrets

Configured in Lovable Cloud (names only — values not shown):

- `RESEND_API_KEY` — Resend transactional email
- `LOVABLE_API_KEY` — Lovable AI Gateway
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` — managed by Lovable Cloud

### 2.8 Client integration

- `src/integrations/supabase/client.ts` — auto-generated Supabase JS client. **Do not edit.**
- `src/integrations/supabase/types.ts` — auto-generated `Database` types. **Do not edit.**
- `src/hooks/use-app-data.ts` — the single data-access layer: loads all user rows on auth, exposes typed `add* / update* / delete*` mutations, wraps async in try/catch with `toast` errors.
- `src/contexts/AppContext.tsx` — exposes the loaded `AppData` and mutations to the whole app.
- `src/contexts/AuthContext.tsx` — session, sign-in/out, password reset.

### 2.9 Data-flow examples

**Adding a transaction**
1. UI (`Transactions.tsx` / `QuickAddTransaction.tsx`) calls `addTransaction()` on the context.
2. `use-app-data.ts` inserts into `public.transactions` with `user_id = auth.uid()`.
3. RLS `WITH CHECK` validates ownership; insert succeeds.
4. Local state updates optimistically; a refetch keeps totals in sync.

**Editing a portfolio entry**
1. `Portfolio.tsx` calls `updatePortfolioEntry()`.
2. Row is updated in `portfolio_entries`; the `update_updated_at_column` trigger stamps `updated_at`.
3. Portfolio "Last edited" chip re-renders from the new value.

**Weekly budget reminder**
1. Scheduler pings the `send-budget-reminder` edge function.
2. Function lists verified users via service role and sends one Resend email per user.
3. Result summary returned; failures are aggregated in the `errors` array.

---

## 3. Conventions & Gotchas

- **English-only UI copy.**
- **Tier vocabulary**: `Defensive`, `Safe`, `Income`, `Growth`, `Risk` (portfolio only).
- **Transaction types**: `income`, `expense`, `investing`, `saving`, `sell`, `dividend`.
- **Income quality**: `active`, `scalable`, `passive` (transactions of type `income`).
- **`updated_at` only exists on `portfolio_entries`** — do not include it in `transactions` (or any other table's) update payload.
- **Never edit** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` values (`VITE_SUPABASE_*`), or project-level `supabase/config.toml` settings — all auto-generated.
- **Every new `public` table** must ship with GRANTs + RLS enabled + at least one policy in the same migration, or the Data API will return permission errors.
- **Number format**: German (`de-DE`) monetary format with dot thousands separators (e.g. `10.000.000`).
