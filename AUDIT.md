# Finance Lab — Product & Technical Audit

*2026-07-13 · audited on `main` @ 2437d8a*

## Verdict

The feature surface is wide for an MVP (8 pages, budget, portfolio, FIRE math, reports, Telegram bot) but three things undermine the phase-1 goal of validating interest: the flagship differentiator (Telegram logging) is unreachable by users, there is zero instrumentation to measure activation, and the core "Aha" numbers (net worth, FIRE date) depend on manual data entry that goes stale within a week. Fix reach and measurement before adding anything new.

## P0 — Blockers for PMF validation

**1. Telegram bot has no connect UI.** The webhook tells users "Finance Lab → Settings → Connect Telegram", but no such section exists — `telegram` appears nowhere in `src/pages/`. Nobody can generate a `link_code` without writing SQL. The bot you just invested in is dead weight until Profile gets a "Connect Telegram" card that inserts a code into `telegram_links` and shows `/link CODE`. Half a day of work, unlocks your best retention feature.

**2. No analytics, no error tracking.** Phase 1 is "validate interest", but there is no PostHog/GA/Sentry anywhere. You cannot see activation funnel, day-7 retention, or which features get used. You are flying blind on the only question that matters right now. Instrument signup → first transaction → first week retention before driving any traffic.

**3. Stale prices kill the core loop.** `portfolio_entries.current_price` is only updated by hand in the Portfolio form. Net worth, FIRE progress, and Crossover Point all derive from it — a week of neglect and every headline number is wrong, which reads as "this app is broken". Even a daily pg_cron job updating just Gold (SJC) and Crypto (CoinGecko, free) would keep the dashboard honest. VN stocks can wait.

## P1 — High-leverage improvements

**4. FIRE page answers the wrong question.** `FireGoals.tsx` hardcodes `yearsToGrow = 14` and tells users what to save to retire in exactly 14 years. The emotional hook is the inverse: "at your current savings rate, you're free at age 34." Solve for years-to-FI from actual savings behavior (you already have the transaction history), make the horizon a slider, and this page becomes the screenshot people share.

**5. `goals` table is dead code.** Loaded in `use-app-data.ts`, rendered nowhere. Either ship a goals feature (good fit: "Emergency fund 100tr by Dec") or drop the fetch and table. Right now it's schema debt plus a wasted query on every load.

**6. Subscriptions track but never remind.** `subscriptions` has `due_day` but nothing fires. You already planned Smart Reminders via Telegram — now that the bot pipeline exists, a daily pg_cron → sendMessage("Netflix 260k due tomorrow") is cheap and is exactly the kind of daily touchpoint that builds a logging habit.

**7. CSV export exists, import doesn't.** New users face an empty app and manual entry — the biggest onboarding cliff. A bank-statement CSV import (Techcombank/VCB export formats) that maps rows to transactions would cut time-to-populated-dashboard from an hour to minutes.

## P2 — Monetization readiness

**8. Zero conversion surface.** No pricing page, no plan concept, no feature gating anywhere in the app (only marketing copy on Landing). Correct for phase 1 — but decide the free/paid line now so you build toward it: natural premium candidates are auto price sync, Telegram bot, CSV import, and advanced reports. At 99k VND/mo you need ~700 subscribers for 70M MRR; the funnel math should inform how aggressively free-tier features feed the paid ones.

**9. Naming collision incoming.** `subscriptions` today means "user's Netflix bills". Your PayOS plan will introduce SaaS subscriptions. Name the future table `plan_subscriptions` (or rename the current one to `recurring_bills`) before both exist.

## P2 — Technical debt worth tracking

**10. Unbounded data load.** `loadFromDB` pulls *all* transactions across 9 tables on every mount, and any portfolio-linked transaction triggers a full reload. Fine under ~2k transactions; add a date-range filter on transactions and optimistic portfolio updates before Phase 2.

**11. Buy/sell math lives in two places.** Average-price recalc exists in `use-app-data.ts` (client) and now in `agent-log-transaction` (edge). They can drift, and concurrent writes can race. Consolidate into a Postgres function both call — one source of truth for money math.

**12. Financial math is untested.** One placeholder test file. PMT, crossover, avg-price recalc, and sell-quantity validation are exactly the code that silently corrupts user trust when wrong. A dozen vitest cases over `use-app-data` calculations and the webhook parser is an afternoon.

**13. Net worth ignores cash flow.** `getNetWorth = assets + portfolio`. Logged income/expenses never move net worth unless the user manually edits an asset — users will log diligently for a month and see a flat line. Either derive a cash balance from transactions or make the disconnect explicit in UI copy.

**14. Minor:** `any` typing throughout the data-mapping layer despite a types file; no account-deletion option in Profile (trust/compliance signal for a finance app).

## Suggested sequence

| # | Item | Effort | Why now |
|---|------|--------|---------|
| 1 | Telegram connect UI in Profile | 0.5d | Unlocks shipped feature |
| 2 | PostHog + Sentry | 0.5d | Can't validate PMF blind |
| 3 | Price auto-update (gold + crypto) | 1d | Keeps core numbers true |
| 4 | FIRE solve-for-years + slider | 1d | The shareable Aha |
| 5 | Telegram bill reminders | 1d | Daily habit loop |
| 6 | Money-math test suite | 0.5d | Trust insurance |
| 7 | CSV bank import | 2-3d | Onboarding cliff |

Roughly 7-8 focused days to a materially stronger MVP — all before writing a single new "feature".
