-- Configurar cron job para verificar assinaturas expiradas diariamente às 02:00
SELECT cron.schedule(
  'check-subscription-expiry-daily',
  '0 2 * * *', -- Executa diariamente às 02:00 UTC
  $$
  select
    net.http_post(
        url:='https://xcectuiohvwzxywrcyce.supabase.co/functions/v1/check-subscription-expiry',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZWN0dWlvaHZ3enh5d3JjeWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMzQ0NTIsImV4cCI6MjA2NjkxMDQ1Mn0.x5xYxbwgvLyom0xcZTRvOxyiVtuzxSTv4GY4XmETVHU"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);