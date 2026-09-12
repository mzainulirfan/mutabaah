-- 015: langganan Web Push per perangkat untuk pengingat server.
-- Satu user bisa punya banyak perangkat; endpoint unik per perangkat.

create table if not exists public.mutabaah_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.mutabaah_profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table public.mutabaah_push_subscriptions enable row level security;

drop policy if exists "push own all" on public.mutabaah_push_subscriptions;
create policy "push own all" on public.mutabaah_push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_push_subscriptions_user on public.mutabaah_push_subscriptions(user_id);

-- Jadwal pengiriman: AKTIFKAN manual di dashboard setelah deploy Edge Function.
-- 1) Supabase Dashboard → Edge Functions → deploy `send-reminders`,
--    isi secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT=mailto:mutabaah@example.com
-- 2) SQL Editor → jalankan (butuh ekstensi pg_cron + pg_net):
--
--    create extension if not exists pg_cron;
--    create extension if not exists pg_net;
--    select cron.schedule(
--      'send-reminders-5min',
--      '*/5 * * * *',
--      $$select net.http_post(
--        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--        ),
--        body := '{}'::jsonb
--      ) as request_id;$$
--    );
