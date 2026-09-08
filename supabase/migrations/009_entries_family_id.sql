-- Simpan keluarga langsung pada setiap entri agar filter dan RLS tidak perlu
-- menelusuri mutabaah_habits untuk setiap baris.
alter table public.mutabaah_entries
  add column if not exists family_id uuid references public.mutabaah_families(id) on delete cascade;

update public.mutabaah_entries entry
set family_id = habit.family_id
from public.mutabaah_habits habit
where entry.habit_id = habit.id
  and entry.family_id is null;

alter table public.mutabaah_entries
  alter column family_id set not null;

create or replace function public.set_mutabaah_entry_family_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select family_id into new.family_id
  from public.mutabaah_habits
  where id = new.habit_id;

  if new.family_id is null then
    raise exception 'Habit % tidak ditemukan', new.habit_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_mutabaah_entries_family_id on public.mutabaah_entries;
create trigger tr_mutabaah_entries_family_id
  before insert or update of habit_id on public.mutabaah_entries
  for each row execute function public.set_mutabaah_entry_family_id();

create index if not exists idx_mutabaah_entries_family_date
  on public.mutabaah_entries(family_id, date);
create index if not exists idx_mutabaah_entries_family_completed
  on public.mutabaah_entries(family_id, completed_at desc);

drop policy if exists "entries member read own + parent read family" on public.mutabaah_entries;
create policy "entries member read own + parent read family" on public.mutabaah_entries for select using (
  user_id = auth.uid() or public.is_family_parent(family_id)
);

drop policy if exists "entries member insert own" on public.mutabaah_entries;
create policy "entries member insert own" on public.mutabaah_entries for insert with check (
  user_id = auth.uid() and public.is_family_member(family_id)
);

drop policy if exists "entries member update own" on public.mutabaah_entries;
create policy "entries member update own" on public.mutabaah_entries for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid() and public.is_family_member(family_id)
);

analyze public.mutabaah_entries;
