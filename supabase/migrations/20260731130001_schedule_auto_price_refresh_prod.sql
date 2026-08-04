-- PROD project — same as the sibling ..._dev.sql migration, but for prod.
--
-- ⚠️ VERIFY BEFORE RUNNING: this assumes the prod project ref is
-- "kozjptxyelcvkpzamvtb" (taken from supabase/config.toml's project_id).
-- Double-check that's actually your prod project before applying — if it's
-- wrong, update the ref in the URL below first.
--
-- ── ONE-TIME MANUAL SETUP (do this BEFORE running this migration) ──────────
--   1. supabase secrets set PRICE_CRON_SECRET=<a-long-random-string> \
--        --project-ref kozjptxyelcvkpzamvtb
--      (use a DIFFERENT random value than dev, not the same secret)
--
--   2. In the SQL editor for the PROD project:
--        select vault.create_secret('<the-same-long-random-string>', 'price_cron_secret');
--
-- Also requires pg_cron / pg_net extensions enabled on prod (same as dev —
-- if prod hasn't run the migration that adds them, add
-- `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;` and
-- `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;` first).
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
    url := 'https://kozjptxyelcvkpzamvtb.supabase.co/functions/v1/update-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'price_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
