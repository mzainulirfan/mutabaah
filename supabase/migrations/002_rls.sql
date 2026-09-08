-- RLS per PRD §30 — family-scoped — tables prefixed mutabaah_
alter table public.mutabaah_profiles enable row level security;
alter table public.mutabaah_families enable row level security;
alter table public.mutabaah_family_members enable row level security;
alter table public.mutabaah_habits enable row level security;
alter table public.mutabaah_entries enable row level security;
alter table public.mutabaah_invitations enable row level security;
alter table public.mutabaah_notification_preferences enable row level security;
alter table public.mutabaah_habit_schedules enable row level security;

-- helper
create or replace function public.is_family_member(fid uuid) returns boolean as $$
  select exists (select 1 from public.mutabaah_family_members where family_id = fid and user_id = auth.uid())
$$ language sql stable security definer;

create or replace function public.is_family_parent(fid uuid) returns boolean as $$
  select exists (select 1 from public.mutabaah_family_members where family_id = fid and user_id = auth.uid() and role in ('OWNER','PARENT'))
$$ language sql stable security definer;

-- profiles
drop policy if exists "profiles self read" on public.mutabaah_profiles;
create policy "profiles self read" on public.mutabaah_profiles for select using (id = auth.uid() or exists (select 1 from public.mutabaah_family_members fm1 join public.mutabaah_family_members fm2 on fm1.family_id=fm2.family_id where fm1.user_id=auth.uid() and fm2.user_id=mutabaah_profiles.id));
drop policy if exists "profiles self update" on public.mutabaah_profiles;
create policy "profiles self update" on public.mutabaah_profiles for update using (id = auth.uid());
drop policy if exists "profiles insert own" on public.mutabaah_profiles;
create policy "profiles insert own" on public.mutabaah_profiles for insert with check (id = auth.uid());

-- families
drop policy if exists "families member read" on public.mutabaah_families;
create policy "families member read" on public.mutabaah_families for select using (public.is_family_member(id) or owner_id = auth.uid());
drop policy if exists "families owner update" on public.mutabaah_families;
create policy "families owner update" on public.mutabaah_families for update using (public.is_family_parent(id) or owner_id = auth.uid());
drop policy if exists "families authenticated insert" on public.mutabaah_families;
create policy "families authenticated insert" on public.mutabaah_families for insert with check (auth.uid() is not null and auth.uid() = owner_id);
drop policy if exists "families owner delete" on public.mutabaah_families;
create policy "families owner delete" on public.mutabaah_families for delete using (owner_id = auth.uid());

-- family_members
drop policy if exists "fm member read" on public.mutabaah_family_members;
create policy "fm member read" on public.mutabaah_family_members for select using (public.is_family_member(family_id) or user_id = auth.uid());
drop policy if exists "fm parent insert" on public.mutabaah_family_members;
create policy "fm parent insert" on public.mutabaah_family_members for insert with check (public.is_family_parent(family_id) or user_id = auth.uid());
drop policy if exists "fm parent delete" on public.mutabaah_family_members;
create policy "fm parent delete" on public.mutabaah_family_members for delete using (public.is_family_parent(family_id) or user_id = auth.uid());

-- habits
drop policy if exists "habits member read" on public.mutabaah_habits;
create policy "habits member read" on public.mutabaah_habits for select using (public.is_family_member(family_id));
drop policy if exists "habits parent write" on public.mutabaah_habits;
create policy "habits parent write" on public.mutabaah_habits for insert with check (public.is_family_parent(family_id));
drop policy if exists "habits parent update" on public.mutabaah_habits;
create policy "habits parent update" on public.mutabaah_habits for update using (public.is_family_parent(family_id));
drop policy if exists "habits parent delete" on public.mutabaah_habits;
create policy "habits parent delete" on public.mutabaah_habits for delete using (public.is_family_parent(family_id));

-- habit_schedules
drop policy if exists "schedules member read" on public.mutabaah_habit_schedules;
create policy "schedules member read" on public.mutabaah_habit_schedules for select using (exists (select 1 from public.mutabaah_habits h where h.id=habit_id and public.is_family_member(h.family_id)));
drop policy if exists "schedules parent write" on public.mutabaah_habit_schedules;
create policy "schedules parent write" on public.mutabaah_habit_schedules for all using (exists (select 1 from public.mutabaah_habits h where h.id=habit_id and public.is_family_parent(h.family_id)));

-- entries
drop policy if exists "entries member read own + parent read family" on public.mutabaah_entries;
create policy "entries member read own + parent read family" on public.mutabaah_entries for select using (
  user_id = auth.uid() or exists (select 1 from public.mutabaah_habits h join public.mutabaah_family_members fm on fm.family_id=h.family_id where h.id=habit_id and fm.user_id=auth.uid() and fm.role in ('OWNER','PARENT'))
);
drop policy if exists "entries member insert own" on public.mutabaah_entries;
create policy "entries member insert own" on public.mutabaah_entries for insert with check (user_id = auth.uid() and exists (select 1 from public.mutabaah_habits h where h.id=habit_id and public.is_family_member(h.family_id)));
drop policy if exists "entries member update own" on public.mutabaah_entries;
create policy "entries member update own" on public.mutabaah_entries for update using (user_id = auth.uid());

-- invitations
drop policy if exists "invitations parent read" on public.mutabaah_invitations;
create policy "invitations parent read" on public.mutabaah_invitations for select using (public.is_family_parent(family_id));
drop policy if exists "invitations parent insert" on public.mutabaah_invitations;
create policy "invitations parent insert" on public.mutabaah_invitations for insert with check (public.is_family_parent(family_id));
drop policy if exists "invitations authenticated read" on public.mutabaah_invitations;
create policy "invitations authenticated read" on public.mutabaah_invitations for select using (auth.uid() is not null);

-- notification_preferences
drop policy if exists "notif own" on public.mutabaah_notification_preferences;
create policy "notif own" on public.mutabaah_notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
