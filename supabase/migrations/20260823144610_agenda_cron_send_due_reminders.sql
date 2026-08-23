-- Agenda o envio automático de lembretes push (edge function send-due-reminders).
-- As extensões pg_cron/pg_net já foram habilitadas em uma migração anterior;
-- esta migração cria o job que efetivamente dispara a função periodicamente.
--
-- PRÉ-REQUISITO — antes de aplicar esta migração, rode UMA VEZ no SQL Editor
-- do Supabase (não commitar isso no Git, pois contém a service_role key real):
--
--   select vault.create_secret(
--     'SUA_SERVICE_ROLE_KEY_AQUI',   -- Project Settings > API > service_role key
--     'service_role_key'
--   );
--
-- Também é preciso configurar os secrets da edge function send-due-reminders
-- (Dashboard > Edge Functions > send-due-reminders > Secrets, ou via CLI:
-- supabase secrets set VAPID_PRIVATE_KEY=... CRON_SECRET=...):
--   VAPID_PRIVATE_KEY = a privateKey do par VAPID (a publicKey correspondente já
--                        está hardcoded em src/lib/push.ts e na própria função)
--   CRON_SECRET       = b2c998326c65fd12f798009a6d1bcd5356ef7201c17095af058f4ab94b6b38ac
--                        (mesmo valor usado no header x-cron-secret abaixo)

select
  cron.schedule(
    'send-due-reminders-hourly',
    '0 * * * *', -- a cada hora, no minuto 0
    $$
    select
      net.http_post(
        url := 'https://nxwsuodapmgbdriaqcby.supabase.co/functions/v1/send-due-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
          'x-cron-secret', 'b2c998326c65fd12f798009a6d1bcd5356ef7201c17095af058f4ab94b6b38ac'
        ),
        body := '{}'::jsonb
      );
    $$
  );
