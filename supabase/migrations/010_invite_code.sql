-- 010: kode undangan 6 karakter (diketik manual) berdampingan dengan link token

alter table public.mutabaah_invitations add column if not exists code text;

-- Unik untuk undangan yang belum dipakai. Predikat harus IMMUTABLE (tanpa now()):
-- expiry dicek di RPC, dan kode dikosongkan (NULL) saat undangan dipakai.
create unique index if not exists idx_invitations_code_unique_unused
  on public.mutabaah_invitations(code)
  where code is not null and used_at is null;

-- Pratinjau undangan via kode: kembalikan family + nama (non-anggota tak bisa baca langsung karena RLS).
create or replace function public.get_invitation_by_code(p_code text)
returns table (family_id uuid, family_name text)
language sql security definer set search_path=public,pg_temp as $$
  select f.id, f.name
  from public.mutabaah_invitations i
  join public.mutabaah_families f on f.id = i.family_id
  where i.code = upper(p_code)
    and (i.expires_at is null or i.expires_at > now())
    and i.used_at is null
  limit 1;
$$;
revoke all on function public.get_invitation_by_code(text) from public;
grant execute on function public.get_invitation_by_code(text) to authenticated;

-- Terima undangan via kode: atomik, sekali pakai, idempoten bila sudah anggota.
create or replace function public.accept_invitation_by_code(p_code text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_inv public.mutabaah_invitations; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select * into v_inv from public.mutabaah_invitations where code = upper(p_code) for update;
  if not found then raise exception 'Kode tidak ditemukan. Periksa lagi penulisannya.'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then raise exception 'Undangan sudah tidak berlaku.'; end if;
  if v_inv.used_at is not null then raise exception 'Kode sudah digunakan. Minta kode baru.'; end if;
  if exists (select 1 from public.mutabaah_family_members where family_id = v_inv.family_id and user_id = v_uid) then
    return v_inv.family_id;
  end if;
  insert into public.mutabaah_family_members(family_id, user_id, role) values (v_inv.family_id, v_uid, 'MEMBER');
  update public.mutabaah_invitations set used_at = now(), code = null where id = v_inv.id;
  return v_inv.family_id;
end; $$;
revoke all on function public.accept_invitation_by_code(text) from public;
grant execute on function public.accept_invitation_by_code(text) to authenticated;
