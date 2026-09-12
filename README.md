# Mutabaah

PWA keluarga untuk konsistensi ibadah & kebiasaan baik — `Open → See → Tap → Done` < 30 detik.

## Quick start

```bash
cp .env.example .env.local # isi NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (wajib)
npm install
npm run dev # http://localhost:3000
```

Aplikasi membutuhkan env Supabase — tanpa itu halaman menampilkan error konfigurasi.

## Supabase setup

1. Buat project di supabase.com
2. SQL Editor → jalankan berurutan:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `003_prefix_rename.sql` … `010_invite_code.sql` (urutan nomor)
3. Auth → enable Email provider
4. Isi `.env.local` sesuai `.env.example`
5. (opsional) `supabase/seed.sql` untuk data contoh

## Struktur

- `src/app/page.tsx` landing
- `src/app/(app)/beranda|mutabaah|progress|keluarga|profil` — AppShell bottom nav / sidebar
- `src/lib/supabase/{client,server,middleware}` — SSR auth + middleware proteksi
- `src/lib/actions/{auth,family,habit}` — Server Actions
- `src/lib/progress.ts` — daily/weekly calc (PRD §14-17, streak >=70%)
- `src/components/app/{app-shell,habit-card,progress-ring,sw-register}`

## PWA

`public/manifest.json` + `public/sw.js` (last-write-wins) + `SWRegister`. Install via browser prompt.

## Pengingat server (opsional, agar bunyi walau aplikasi mati)

1. SQL Editor → jalankan `supabase/migrations/015_push_subscriptions.sql`
2. Generate kunci VAPID (sekali saja) lalu isi `.env.local` + hosting:
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:kamu@email.com`
3. Deploy Edge Function (butuh Supabase CLI login):
   ```bash
   supabase functions deploy send-reminders
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:kamu@email.com
   ```
4. Aktifkan cron 5-menitan — SQL di bagian bawah file `015` (butuh ekstensi `pg_cron` + `pg_net`, paket berbayar/Pro sesuai tier).
5. Di aplikasi: Profil → Pengingat → Aktifkan (mendaftarkan perangkat ke push server).

Tanpa langkah ini, pengingat tetap jalan versi lokal (bunyi bila aplikasi pernah dibuka).

## Progress formula

`daily = avg(value/target*100)` capped 100, BOOLEAN 0/100, PARTIAL proporsional. Streak = hari dengan progress >=70%.
