-- ============================================================
-- 2026-07-13: Telegram bot pending state (invest flow)
-- Status: NOT yet applied to prod
-- ============================================================
alter table public.telegram_links add column if not exists pending jsonb;
notify pgrst, 'reload schema';
