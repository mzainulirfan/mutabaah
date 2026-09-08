-- Perf: index & RLS inline — penyebab lemot pindah halaman (waterfall 2s)

-- 1) Missing indexes — beranda melakukan 8 seq query, tiap ~250ms
create index if not exists idx_mutabaah_family_members_family on public.mutabaah_family_members(family_id);
create index if not exists idx_mutabaah_family_members_composite on public.mutabaah_family_members(family_id, user_id);
create index if not exists idx_mutabaah_habits_family_active on public.mutabaah_habits(family_id, is_active, sort_order);
create index if not exists idx_mutabaah_entries_user_date_status on public.mutabaah_entries(user_id, date, status);
create index if not exists idx_mutabaah_entries_user_completed on public.mutabaah_entries(user_id, completed_at desc);
create index if not exists idx_mutabaah_entries_habit_user_date on public.mutabaah_entries(habit_id, user_id, date);
create index if not exists idx_mutabaah_invitations_token on public.mutabaah_invitations(token_hash);
create index if not exists idx_mutabaah_profiles_name on public.mutabaah_profiles(name);

-- 2) RLS helper inlining — STABLE + SECURITY DEFINER memicu seq scan tiap is_family_member()
-- ganti jadi SQL inline dengan index-only scan
create or replace function public.is_family_member(fid uuid) returns boolean as $$
  select exists (select 1 from public.mutabaah_family_members where family_id = fid and user_id = auth.uid())
$$ language sql stable security definer set search_path = public;

create or replace function public.is_family_parent(fid uuid) returns boolean as $$
  select exists (select 1 from public.mutabaah_family_members where family_id = fid and user_id = auth.uid() and role in ('OWNER','PARENT'))
$$ language sql stable security definer set search_path = public;

-- 3) Analyze untuk update planner stats
analyze public.mutabaah_family_members;
analyze public.mutabaah_habits;
analyze public.mutabaah_entries;
