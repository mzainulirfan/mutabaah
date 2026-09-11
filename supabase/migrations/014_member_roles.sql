-- 014: promosi/demosi peran PARENT <-> MEMBER oleh OWNER.
-- Tidak perlu ubah RLS: OWNER/PARENT sudah diakui sebagai pengelola di semua policy.

create or replace function public.set_member_role(p_family_id uuid, p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_caller_role text; v_target_role text;
begin
  if p_role not in ('PARENT','MEMBER') then raise exception 'Peran tidak valid.'; end if;
  select role into v_caller_role from public.mutabaah_family_members
  where family_id = p_family_id and user_id = auth.uid();
  if v_caller_role is distinct from 'OWNER' then raise exception 'Hanya pemilik yang bisa mengatur peran.'; end if;
  if p_user_id = auth.uid() then raise exception 'Peran sendiri tidak bisa diubah.'; end if;
  select role into v_target_role from public.mutabaah_family_members
  where family_id = p_family_id and user_id = p_user_id;
  if v_target_role is null then raise exception 'Anggota tidak ditemukan.'; end if;
  if v_target_role = 'OWNER' then raise exception 'Peran pemilik tidak bisa diubah.'; end if;
  if v_target_role = p_role then return; end if;
  update public.mutabaah_family_members
  set role = p_role
  where family_id = p_family_id and user_id = p_user_id;
end; $$;
revoke all on function public.set_member_role(uuid, uuid, text) from public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
