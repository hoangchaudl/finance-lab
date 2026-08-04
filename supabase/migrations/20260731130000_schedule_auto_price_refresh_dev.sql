-- DEV project (cqqqbxvjmihzoqusuebk) — schedule automatic portfolio price
-- refresh so Stocks/ETFs/Funds/Gold/Crypto update daily without needing a
-- manual click on "Refresh Prices" in the Portfolio page.
--
-- This reuses the existing `update-prices` edge function (already handles
-- ETF prices via TCBS and mutual fund NAVs via Fmarket) and the pg_cron /
-- pg_net extensions already enabled in this project.
--
-- ── ONE-TIME MANUAL SETUP (do this BEFORE running this migration) ──────────
-- Secrets can't live in a migration file that's committed to git, so:
--
--   1. Set the edge function's secret (authenticates cron calls to it):
--        supabase secrets set PRICE_CRON_SECRET=<a-long-random-string> \
--          --project-ref cqqqbxvjmihzoqusuebk
--
--   2. Store that SAME value in Supabase Vault, in the SQL editor for THIS
--      (dev) project, so the cron job below can read it:
--        select vault.create_secret('<the-same-long-random-string>', 'price_cron_secret');
--
-- Do the equivalent for the prod project separately — see the sibling
-- ..._prod.sql migration. Dev and prod have independent secrets.
-- ─────────────────────────────────────────────────────────────────────────

select cron.unschedule('refresh-portfolio-prices-daily')
where exists (
  select 1 from cron.job where jobname = 'refresh-portfolio-prices-daily'
);

select cron.schedule(
  'refresh-portfolio-prices-daily',
  '0 9 * * 1-5', -- 09:00 UTC = 16:00 ICT, weekdays — after VN market close
  $$
  select net.http_post(
    url := 'https://cqqqbxvjmihzoqusuebk.supabase.co/functions/v1/update-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'price_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
