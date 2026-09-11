-- 012: izin kelola amalan per anggota (owner memberi/mencabut).
-- Tanpa izin ini hanya OWNER/PARENT yang bisa tulis habits (perilaku lama tetap).

alter table public.mutabaah_family_members
  add column if not exists can_manage_habits boolean not null default false;

-- Pengelola = parent ATAU anggota berflag. Gaya sama dengan helper 005 (STABLE + DEFINER).
create or replace function public.can_manage_habits(fid uuid) returns boolean as $$
  select exists (
    select 1 from public.mutabaah_family_members
    where family_id = fid and user_id = auth.uid()
      and (role in ('OWNER','PARENT') or can_manage_habits)
  )
$$ language sql stable security definer set search_path = public;

-- Alihkan policy tulis habits + schedules ke helper baru (baca tidak berubah).
drop policy if exists "habits parent write" on public.mutabaah_habits;
create policy "habits manager write" on public.mutabaah_habits for insert with check (public.can_manage_habits(family_id));

drop policy if exists "habits parent update" on public.mutabaah_habits;
create policy "habits manager update" on public.mutabaah_habits for update using (public.can_manage_habits(family_id));

drop policy if exists "habits parent delete" on public.mutabaah_habits;
create policy "habits manager delete" on public.mutabaah_habits for delete using (public.can_manage_habits(family_id));

drop policy if exists "schedules parent write" on public.mutabaah_habit_schedules;
create policy "schedules manager write" on public.mutabaah_habit_schedules for all using (
  exists (select 1 from public.mutabaah_habits h where h.id = habit_id and public.can_manage_habits(h.family_id))
);

-- Hanya OWNER yang boleh mengubah flag (via RPC agar atomik + aman dari RLS update).
create or replace function public.set_manage_permission(p_family_id uuid, p_user_id uuid, p_allowed boolean)
returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;
begin
  select role into v_role from public.mutabaah_family_members
  where family_id = p_family_id and user_id = auth.uid();
  if v_role is distinct from 'OWNER' then raise exception 'Hanya pemilik yang bisa mengatur izin.'; end if;
  if p_user_id = auth.uid() then raise exception 'Tidak perlu — pemilik selalu bisa mengelola.'; end if;
  update public.mutabaah_family_members
  set can_manage_habits = p_allowed
  where family_id = p_family_id and user_id = p_user_id;
  if not found then raise exception 'Anggota tidak ditemukan.'; end if;
end; $$;
revoke all on function public.set_manage_permission(uuid, uuid, boolean) from public;
grant execute on function public.set_manage_permission(uuid, uuid, boolean) to authenticated;

analyze public.mutabaah_family_members;
