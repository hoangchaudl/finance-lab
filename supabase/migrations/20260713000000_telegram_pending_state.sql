-- Pending conversation state for the Telegram bot invest flow
alter table public.telegram_links add column if not exists pending jsonb;

notify pgrst, 'reload schema';
