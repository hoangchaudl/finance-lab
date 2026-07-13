-- Lock down telegram_bot_logs: created without RLS, so it was readable/writable
-- via the anon API. Only the service role (edge functions) should touch it.
alter table public.telegram_bot_logs enable row level security;
-- No policies on purpose: service role bypasses RLS, clients get nothing.

notify pgrst, 'reload schema';
