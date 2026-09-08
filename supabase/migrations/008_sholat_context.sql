-- Penanda sholat Sendiri vs Berjamaah di masjid — khusus Ibadah Wajib (BOOLEAN)
-- NULL = data lama / belum memilih (diperlakukan netral, tetap COMPLETED penuh)
alter table if exists public.mutabaah_entries
  add column if not exists context text check (context in ('SENDIRI','BERJAMAAH'));

create index if not exists idx_mutabaah_entries_user_date_context
  on public.mutabaah_entries(user_id, date);
