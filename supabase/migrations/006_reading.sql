-- Reading logs for Tilawah auto-count — mushaf Madinah 604, scroll sampai akhir, dedup per hari
create table if not exists public.mutabaah_reading_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.mutabaah_profiles(id) on delete cascade,
  date date not null,
  page smallint not null check (page between 1 and 604),
  first_read_at timestamptz default now(),
  unique (user_id, date, page)
);

create table if not exists public.mutabaah_reading_positions (
  user_id uuid primary key references public.mutabaah_profiles(id) on delete cascade,
  last_page smallint not null check (last_page between 1 and 604),
  updated_at timestamptz default now()
);

create index if not exists idx_reading_logs_user_date on public.mutabaah_reading_logs(user_id, date);
create index if not exists idx_reading_positions_user on public.mutabaah_reading_positions(user_id);

alter table public.mutabaah_reading_logs enable row level security;
alter table public.mutabaah_reading_positions enable row level security;

drop policy if exists "reading_logs own" on public.mutabaah_reading_logs;
create policy "reading_logs own" on public.mutabaah_reading_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reading_pos own" on public.mutabaah_reading_positions;
create policy "reading_pos own" on public.mutabaah_reading_positions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
