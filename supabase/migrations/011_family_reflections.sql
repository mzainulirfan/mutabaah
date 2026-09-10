-- 011: refleksi sekeluarga untuk slideshow beranda.
-- Anggota hanya boleh melihat TEKS refleksi saudaranya (nama, tanggal, isi),
-- tanpa nilai/status progres. Dijalankan sebagai SECURITY DEFINER yang lebih
-- dulu memastikan pemanggil adalah anggota keluarga yang sama.
create or replace function public.get_family_reflections(p_family_id uuid)
returns table (user_id uuid, name text, date date, note text)
language sql security definer set search_path=public,pg_temp as $$
  select distinct on (e.user_id, e.date)
    e.user_id,
    coalesce(p.name, left(e.user_id::text, 6)),
    e.date,
    e.note
  from public.mutabaah_entries e
  join public.mutabaah_family_members fm
    on fm.family_id = e.family_id and fm.user_id = auth.uid()
  left join public.mutabaah_profiles p on p.id = e.user_id
  where e.family_id = p_family_id
    and e.date >= current_date - interval '30 days'
    and e.note is not null
    and btrim(e.note) <> ''
  order by e.user_id, e.date desc, e.updated_at desc;
$$;
revoke all on function public.get_family_reflections(uuid) from public;
grant execute on function public.get_family_reflections(uuid) to authenticated;
