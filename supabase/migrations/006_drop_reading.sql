-- Drop reading feature — fitur baca Quran dihapus, kembali ke Tilawah manual QUANTITY
-- Hapus tabel yang dibuat 006_reading.sql (sudah dihapus dari repo)
drop table if exists public.mutabaah_reading_logs cascade;
drop table if exists public.mutabaah_reading_positions cascade;

-- Hapus function helper jika ada (getMadinahPage tidak ada di DB, tapi untuk kebersihan)
drop function if exists public.get_invitation_by_token(text);
-- get_invitation_by_token di 007, jangan drop jika masih dipakai — biarkan
-- recreate jika terhapus
create or replace function public.get_invitation_by_token(p_hash text) returns setof public.mutabaah_invitations
language sql security definer set search_path=public,pg_temp as $$
  select * from public.mutabaah_invitations where token_hash = p_hash and (expires_at is null or expires_at > now()) and used_at is null limit 1;
$$;
revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to authenticated;
