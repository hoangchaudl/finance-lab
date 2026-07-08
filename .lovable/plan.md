# Plan: Backend Structure Documentation

Create a single file **`docs/BACKEND.md`** that documents the Lovable Cloud (Supabase) backend powering Finance Lab. Structured so the top reads as a quick overview and the lower sections serve as a detailed reference.

## Document outline

### 1. High-Level Overview (1–2 pages)
- **Stack summary** — Lovable Cloud (Postgres + Auth + Storage + Edge Functions), accessed from the React app via `src/integrations/supabase/client.ts`.
- **Architecture diagram** (ASCII) — React app ⇄ Supabase Client ⇄ (Auth, Postgres w/ RLS, Storage, Edge Functions, Resend).
- **Domain model at a glance** — grouped entity map:
  - Identity: `auth.users` → `profiles`
  - Money in/out: `categories`, `transactions`, `subscriptions`, `monthly_plans`, `category_allocations`
  - Wealth: `portfolio_entries`, `assets`, `goals`
- **Security model** — per-user isolation via RLS on `auth.uid()`; every table scoped to `user_id` (except `profiles` which uses `id`).
- **Data access layer** — all reads/writes go through `src/hooks/use-app-data.ts`; global state in `src/contexts/AppContext.tsx`.

### 2. Detailed Reference

#### 2.1 Tables
For each table: purpose, columns (name / type / notes), relationships, RLS policy summary, and which UI feature uses it.
- `profiles` — user settings (FIRE inputs, income allocation %s, birth year).
- `categories` — income/essential/nonessential/savings/investment buckets.
- `category_allocations` — % split per category.
- `monthly_plans` — planned amount per category per month (`month_key`).
- `transactions` — income/expense/investing/saving/sell/dividend entries; optional `portfolio_entry_id`, `quantity`, `realized_gain`, `quality`.
- `portfolio_entries` — holdings with tier, account, quantity, purchase/current price, notes; has `updated_at`.
- `assets` — non-invested personal assets.
- `goals` — savings/FIRE targets.
- `subscriptions` — recurring bills.

#### 2.2 Database Functions & Triggers
- `handle_new_user()` — SECURITY DEFINER; creates a `profiles` row on new `auth.users` insert.
- `update_updated_at_column()` — generic trigger fn (used by `portfolio_entries`).
- Note: trigger wiring on `auth.users` and `portfolio_entries`.

#### 2.3 Row-Level Security
- Policy pattern: `auth.uid() = user_id` (or `= id` for profiles).
- Note the GRANT model (authenticated + service_role, no anon).

#### 2.4 Authentication
- Email/password via Supabase Auth; session persisted client-side.
- `AuthContext` flow, `ResetPassword` page, redirect handling.

#### 2.5 Storage
- Bucket `avatars` (public). Path convention required by RLS (per `mem://tech/storage-logic`).

#### 2.6 Edge Functions
- `send-budget-reminder` (public, `verify_jwt = false`) — scheduled Resend email; env vars used (`RESEND_API_KEY`, `LOVABLE_API_KEY`).

#### 2.7 Secrets
List names only (RESEND_API_KEY, LOVABLE_API_KEY, SUPABASE_* managed keys). No values.

#### 2.8 Client Integration
- `src/integrations/supabase/client.ts` (auto-generated, do not edit).
- `src/integrations/supabase/types.ts` (auto-generated Database types).
- Mutation patterns in `use-app-data.ts` (try/catch + toast).

#### 2.9 Data Flow Examples
Short walkthroughs:
- Adding a transaction (UI → hook → insert → RLS check → refetch).
- Editing a portfolio entry (updates `updated_at` via trigger).
- Budget reminder cron → edge function → Resend.

### 3. Conventions & Gotchas
- English-only UI copy.
- Tier vocabulary: Defensive / Safe / Income / Growth / Risk.
- Transaction types + income quality enums.
- `updated_at` only exists on `portfolio_entries` (not `transactions`).
- Never modify auto-generated files or `supabase/config.toml` project-level settings.

## Deliverable
- New file: `docs/BACKEND.md`
- No code or schema changes.
- Content sourced from live schema (via read-only SQL) + repo files (`use-app-data.ts`, `AuthContext.tsx`, edge function, `types.ts`).
