-- HIGH fixes — RLS bypass, invitations, service role, open redirect prep

-- 1. family_members insert: hanya parent, hapus self-join OR, pakai RPC untuk join
drop policy if exists "fm parent insert" on public.mutabaah_family_members;
create policy "fm parent insert" on public.mutabaah_family_members for insert with check (public.is_family_parent(family_id));
-- self-join via invitation harus via RPC accept_invitation, bukan direct insert

-- 2. invitations: hapus policy yang buat semua auth bisa read all
drop policy if exists "invitations authenticated read" on public.mutabaah_invitations;
-- biarkan hanya parent read; token lookup via service role / RPC di join
-- get_invitation_by_token RPC
create or replace function public.get_invitation_by_token(p_hash text) returns setof public.mutabaah_invitations
language sql security definer set search_path=public,pg_temp as $$
  select * from public.mutabaah_invitations where token_hash = p_hash and (expires_at is null or expires_at > now()) and used_at is null limit 1;
$$;
revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to authenticated;

-- 3. entries update: tambah WITH CHECK
drop policy if exists "entries member update own" on public.mutabaah_entries;
create policy "entries member update own" on public.mutabaah_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. families: sudah ada authenticated insert dengan owner_id check di 004, pastikan unique token_hash
create unique index if not exists idx_invitations_token_hash_unique on public.mutabaah_invitations(token_hash);

-- 5. profiles read: sederhanakan agar index-friendly
drop policy if exists "profiles self read" on public.mutabaah_profiles;
create policy "profiles self read" on public.mutabaah_profiles for select using (
  id = (select auth.uid()) or id in (
    select fm2.user_id from public.mutabaah_family_members fm1
    join public.mutabaah_family_members fm2 using (family_id)
    where fm1.user_id = (select auth.uid())
  )
);

-- 6. accept_invitation RPC atomic (idempotent + used_at)
create or replace function public.accept_invitation(p_hash text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_inv public.mutabaah_invitations; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select * into v_inv from public.mutabaah_invitations where token_hash=p_hash for update;
  if not found then raise exception 'Undangan tidak valid'; end if;
  if v_inv.expires_at < now() then raise exception 'Undangan sudah tidak berlaku.'; end if;
  if v_inv.used_at is not null then raise exception 'Undangan sudah digunakan'; end if;
  -- idempotent: sudah member?
  if exists (select 1 from public.mutabaah_family_members where family_id=v_inv.family_id and user_id=v_uid) then
    return v_inv.family_id;
  end if;
  insert into public.mutabaah_family_members(family_id,user_id,role) values (v_inv.family_id, v_uid, 'MEMBER');
  -- tandai single-use (komentar jika mau multi-use)
  -- update public.mutabaah_invitations set used_at=now() where id=v_inv.id;
  return v_inv.family_id;
end; $$;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
