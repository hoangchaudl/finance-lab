-- ============================================================
-- 2026-07-13: Telegram bot pending state (invest flow)
-- Status: NOT yet applied to prod
-- ============================================================
alter table public.telegram_links add column if not exists pending jsonb;
notify pgrst, 'reload schema';
-- ============================================================
-- 2026-07-13: Enable RLS on telegram_bot_logs (security fix)
-- Status: NOT yet applied to prod
-- ============================================================
alter table public.telegram_bot_logs enable row level security;
notify pgrst, 'reload schema';
