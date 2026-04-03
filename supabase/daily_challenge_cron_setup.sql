-- Daily challenge monthly pre-generation cron setup (Edge Function based).
-- Prereqs:
-- 1) Enable pg_cron + pg_net in Supabase.
-- 2) Store these secrets in Vault:
--    - project_url (example: https://<project-ref>.supabase.co)
--    - daily_challenge_cron_secret (must match function env DAILY_CHALLENGE_CRON_SECRET)
-- 3) Deploy function: supabase/functions/generate-daily-challenges

-- Generate next month on day 25 at 02:05 UTC.
select
  cron.schedule(
    'daily-challenges-next-month',
    '5 2 25 * *',
    $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/generate-daily-challenges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_challenge_cron_secret')
      ),
      body := jsonb_build_object('maxRetries', 3)::text
    );
    $$
  );

-- Optional manual trigger:
-- select net.http_post(
--   url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--     || '/functions/v1/generate-daily-challenges',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_challenge_cron_secret')
--   ),
--   body := jsonb_build_object('maxRetries', 3)::text
-- );

-- Inspect generation logs:
-- select *
-- from public.daily_challenge_generation_runs
-- order by created_at desc
-- limit 30;
