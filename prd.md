# PRD — Mutabaah

## 1. Ringkasan Produk

**Nama kerja:** Mutabaah  
**Tagline:** Tumbuh dalam kebiasaan baik, sedikit demi sedikit.

Mutabaah adalah Progressive Web App (PWA) untuk membantu individu dan keluarga mencatat, memantau, dan membangun konsistensi dalam ibadah serta kebiasaan baik sehari-hari.

Produk tidak dirancang sebagai sistem kompetisi ibadah. Fokus utamanya adalah:
- konsistensi;
- refleksi pribadi;
- pendampingan orang tua;
- visibilitas perkembangan;
- pencatatan yang cepat dan sederhana.

Target awal adalah keluarga dengan orang tua sebagai pengelola dan anak sebagai anggota yang mengisi mutabaah masing-masing.

---

## 2. Problem Statement

Lembar mutabaah fisik memiliki beberapa masalah:
1. Sulit dibawa dan sering tertinggal.
2. Rekap mingguan/bulanan harus dilakukan manual.
3. Orang tua sulit melihat perkembangan anak secara ringkas.
4. Data historis mudah hilang.
5. Checklist hanya cocok untuk target sederhana.
6. Tidak ada pengingat yang membantu konsistensi.
7. Pengisian di mobile dapat terasa merepotkan jika setiap item membutuhkan banyak langkah.

Mutabaah digital harus mempertahankan kesederhanaan lembar mutabaah, tetapi menambahkan otomatisasi dan insight yang berguna.

---

## 3. Goals

### Primary Goals

- Pengguna dapat mengisi mutabaah harian dalam waktu kurang dari 30 detik.
- Orang tua dapat membuat dan mengatur target anggota keluarga.
- Anggota keluarga dapat mencatat ibadah/kebiasaan berdasarkan target.
- Sistem dapat menghitung progress harian, mingguan, dan bulanan secara otomatis.
- Pengguna dapat melihat riwayat mutabaah.
- Sistem dapat mengirim reminder yang relevan.
- PWA dapat digunakan dengan nyaman di smartphone.

### Non-Goals MVP

- Social feed.
- Chat keluarga.
- Leaderboard.
- Marketplace.
- Komunitas publik.
- Gamification kompleks.
- AI coaching.
- Integrasi kalender eksternal.
- Aplikasi Android/iOS native.

---

## 4. Target User

### 4.1 Parent

Orang tua yang ingin:
- membuat keluarga;
- menambahkan anggota;
- menentukan target mutabaah;
- memantau progress;
- melihat pola konsistensi;
- membantu anak membangun kebiasaan.

### 4.2 Member

Anak atau anggota keluarga yang:
- memiliki daftar target;
- mengisi mutabaah harian;
- melihat progress;
- melihat streak;
- menambahkan catatan jika diperlukan.

---

## 5. Prinsip Produk

### 5.1 Fast

Pengisian harus cepat.

Target UX:

`Open → See → Tap → Done`

### 5.2 Calm

UI tidak boleh terasa seperti aplikasi kompetisi.

### 5.3 Personal

Progress dibandingkan dengan diri sendiri, bukan dengan anggota lain.

### 5.4 Flexible

Sistem mendukung berbagai jenis target:
- boolean;
- quantity;
- counter;
- duration.

### 5.5 Private

Data mutabaah keluarga adalah data privat keluarga.

### 5.6 Supportive

Bahasa sistem harus mendukung, bukan menghakimi.

Contoh:

Kurang baik:
> Kamu gagal menyelesaikan 3 target.

Lebih baik:
> Masih ada 3 target yang belum diisi hari ini.

---

# 6. User Roles

## 6.1 OWNER

Pemilik keluarga.

Permission:
- membuat keluarga;
- mengubah pengaturan keluarga;
- mengelola parent;
- mengelola member;
- mengelola habit;
- melihat progress seluruh anggota.

## 6.2 PARENT

Permission:
- melihat anggota;
- membuat/mengubah habit;
- mengatur target;
- melihat progress;
- melihat history.

## 6.3 MEMBER

Permission:
- melihat target sendiri;
- mengisi mutabaah sendiri;
- melihat progress sendiri;
- melihat history sendiri;
- menambahkan catatan.

Member tidak dapat mengubah target yang dibuat parent kecuali diberikan permission khusus pada fase lanjutan.

---

# 7. Core User Flow

## 7.1 First Time User

```text
Landing
  ↓
Sign Up / Login
  ↓
Create Family
  ↓
Family Created
  ↓
Add Member
  ↓
Choose Mutabaah Template
  ↓
Customize Habits
  ↓
Dashboard
```

## 7.2 Member Join

```text
Open Invite Link
  ↓
Login / Sign Up
  ↓
Confirm Family
  ↓
Join Family
  ↓
See Today's Mutabaah
```

## 7.3 Daily Mutabaah

```text
Dashboard
  ↓
Today Progress
  ↓
Open Mutabaah
  ↓
Tap Habit
  ↓
Status Updated
  ↓
Progress Recalculated
```

---

# 8. Information Architecture

## Parent

```text
Beranda
Mutabaah
Progress
Keluarga
Profil
```

## Member

```text
Hari Ini
Mutabaah
Progress
Profil
```

### Beranda Parent

- Greeting
- Family progress
- Member progress
- Recent activity
- Reminder
- Quick action

### Mutabaah

- Today
- Calendar
- History

### Progress

- Weekly
- Monthly
- Habit breakdown
- Streak

### Keluarga

- Members
- Habits
- Templates
- Invite

### Profil

- Account
- Notification
- Preferences
- Family settings

---

# 9. Functional Requirements

## FR-001 Authentication

User dapat:
- register;
- login;
- logout;
- reset password.

Acceptance Criteria:
- User tidak dapat mengakses halaman privat tanpa autentikasi.
- Session dipertahankan setelah refresh.
- Logout menghapus session lokal.

---

## FR-002 Family Management

Parent dapat:
- membuat keluarga;
- mengubah nama keluarga;
- melihat anggota;
- mengundang anggota;
- menghapus anggota.

Family fields:
- name;
- owner;
- created_at;
- updated_at.

Acceptance Criteria:
- Satu user dapat menjadi member dari family.
- Data antar-family tidak boleh bocor.

---

## FR-003 Family Invitation

Parent dapat membuat invitation.

Invitation memiliki:
- token;
- family_id;
- created_by;
- expires_at;
- status.

Flow:

```text
Parent
→ Generate Invite
→ Share Link
→ Member Opens Link
→ Login
→ Confirm
→ Join Family
```

Acceptance Criteria:
- Token invalid tidak dapat digunakan.
- Invitation expired tidak dapat digunakan.
- Member tidak dapat join family tanpa konfirmasi.

---

# 10. Habit / Amalan Management

Habit adalah item yang dimonitor.

Contoh:

```text
Shalat Subuh
Tilawah
Hafalan
Dzikir Pagi
Membaca
Membantu Orang Tua
```

## Habit Properties

- id
- family_id
- name
- category
- type
- target_value
- unit
- frequency
- reminder_time
- is_active
- sort_order
- created_at
- updated_at

## Habit Types

### BOOLEAN

Untuk:

`Shalat Subuh`

Value:

`true / false`

### QUANTITY

Untuk:

`Tilawah 2 halaman`

Value:

`0, 1, 2, ...`

### COUNTER

Untuk:

`Dzikir 100x`

Value:

`0–100`

### DURATION

Untuk:

`Membaca 20 menit`

Value:

`duration in minutes`

---

# 11. Habit Categories

Default categories:

- Ibadah Wajib
- Ibadah Sunnah
- Al-Qur'an
- Dzikir & Doa
- Akhlak
- Belajar
- Kebiasaan Baik
- Custom

Parent dapat membuat kategori custom pada fase lanjutan.

---

# 12. Mutabaah Entry

Setiap habit memiliki entry per user per tanggal.

Fields:

- id
- habit_id
- user_id
- date
- value
- status
- note
- completed_at
- created_at
- updated_at

## Status

```text
PENDING
PARTIAL
COMPLETED
SKIPPED
```

Untuk boolean:

```text
PENDING → COMPLETED
```

Untuk quantity:

```text
0 / target → PENDING
1–target-1 → PARTIAL
>= target → COMPLETED
```

SKIPPED digunakan jika item tidak berlaku pada hari tersebut.

---

# 13. Daily Mutabaah UI

Halaman utama mutabaah:

```text
Mutabaah
Ahad, 6 September

Progress
82%
7 dari 9 target
```

Habit ditampilkan berdasarkan kategori.

Contoh:

```text
IBADAH WAJIB

Shalat Subuh       ✓
Shalat Dzuhur      ✓
Shalat Ashar       ✓
Shalat Maghrib     ○
Shalat Isya        ○

AL-QUR'AN

Tilawah
3 / 5 halaman      ◐

Hafalan
5 / 5 ayat         ✓
```

Interaction:
- tap card/check button;
- update optimistic;
- sync ke server;
- progress langsung berubah.

---

# 14. Progress Calculation

Daily Progress:

```text
completed_targets / active_targets * 100
```

Untuk MVP, target PARTIAL dihitung proporsional untuk quantity.

Contoh:

Target = 5 halaman  
Actual = 3 halaman

Progress item:

`3 / 5 = 60%`

Daily progress menggunakan rata-rata progress semua target aktif.

---

# 15. Weekly Progress

Weekly progress menampilkan:

- total completion;
- rata-rata harian;
- jumlah hari aktif;
- best day;
- weakest habit;
- streak.

Contoh:

```text
Minggu ini

82%

Sen  ██████████
Sel  ████████
Rab  █████████
Kam  ██████████
Jum  ███████
Sab  █████████
Min  ██████████
```

---

# 16. Monthly Progress

Menampilkan:

- completion rate;
- jumlah target selesai;
- streak terpanjang;
- habit paling konsisten;
- habit yang perlu perhatian.

Contoh insight:

> Tilawah menjadi kebiasaan paling konsisten bulan ini.

---

# 17. Streak

Streak dihitung berdasarkan hari ketika user memenuhi minimum progress harian.

Default threshold:

`>= 70%`

Contoh:

```text
🔥 7 hari
```

Parent dapat menonaktifkan streak pada family settings di fase lanjutan.

Streak tidak boleh menjadi leaderboard.

---

# 18. Calendar

Calendar menampilkan status harian.

Status:

- completed;
- partial;
- low progress;
- no data.

Tap tanggal membuka detail mutabaah.

---

# 19. Parent Dashboard

Parent dashboard:

```text
Selamat pagi, Ayah

Progress keluarga
78%

Ahmad
86%

Aisyah
72%

Yusuf
61%
```

Kemudian:

```text
Aktivitas terbaru

Ahmad
Tilawah selesai

Aisyah
Dzikir pagi selesai

Yusuf
Mutabaah belum diisi
```

Parent dapat tap member untuk membuka detail.

---

# 20. Member Detail

Parent dapat melihat:

- today's progress;
- weekly progress;
- monthly progress;
- habit breakdown;
- streak;
- history.

Parent tidak boleh mengubah entry anak tanpa confirmation pada MVP.

---

# 21. Reminder

Reminder dapat dibuat pada level habit.

Contoh:

```text
07:00
Jangan lupa mutabaah pagi.

20:30
Sudah mengisi mutabaah hari ini?

21:30
Masih ada 2 target yang belum diisi.
```

Requirement:
- user dapat enable/disable notification;
- user dapat mengatur waktu;
- reminder tidak boleh spam;
- reminder hanya dikirim jika masih relevan.

Catatan: web push notification membutuhkan permission browser dan service worker.

---

# 22. Templates

Default templates:

### Mutabaah Anak

- Shalat 5 waktu
- Tilawah
- Hafalan
- Dzikir pagi
- Dzikir petang
- Membantu orang tua
- Membaca

### Mutabaah Harian

- Shalat 5 waktu
- Tilawah
- Dzikir
- Sedekah
- Membaca
- Olahraga

### Mutabaah Tahfidz

- Murajaah
- Hafalan baru
- Setoran
- Tilawah

### Mutabaah Ramadhan

Template dapat dikembangkan sebagai fitur musiman.

---

# 23. Onboarding

Onboarding maksimal 3–4 langkah.

```text
1. Buat keluarga
2. Tambahkan anggota
3. Pilih template
4. Mulai mutabaah
```

Jangan meminta data yang tidak diperlukan.

---

# 24. UX Requirements

## Speed

Daily check-in harus bisa dilakukan tanpa membuka modal.

## Feedback

Setelah check-in:
- checkbox berubah;
- progress berubah;
- optional micro animation.

## Error

Jika sync gagal:

> Perubahan belum tersimpan. Coba lagi.

Data lokal tidak boleh langsung hilang.

## Empty State

Jika belum memiliki habit:

> Belum ada target mutabaah.
> Tambahkan target pertama untuk memulai.

CTA:

`Tambah Amalan`

---

# 25. Design System

## Design Direction

Calm, modern, friendly, Islamic without excessive decoration.

### Typography

Inter.

### Icon

Hugeicons — Stroke Rounded.

### Shape

- Card radius: 16–20px
- Button radius: 10–14px
- Input radius: 10–12px

### Color Concept

Gunakan semantic tokens:

```text
--background
--foreground
--primary
--primary-foreground
--muted
--muted-foreground
--border
--card
--success
--warning
--destructive
```

Primary dapat menggunakan tone hijau yang tenang.

Accent dapat menggunakan amber lembut.

Jangan menggunakan ornamen Islami pada setiap halaman.

---

# 26. Accessibility

Requirements:
- minimum touch target 44×44px;
- contrast WCAG AA;
- status tidak hanya dibedakan berdasarkan warna;
- semua interactive element memiliki accessible label;
- keyboard navigation untuk desktop;
- reduced motion dihormati.

---

# 27. Responsive Design

Mobile-first.

Breakpoints:

```text
Mobile
< 640px

Tablet
640–1024px

Desktop
> 1024px
```

Mobile:
- bottom navigation.

Desktop:
- sidebar navigation;
- content max-width;
- dashboard dapat menggunakan multi-column layout.

---

# 28. Technical Architecture

## Frontend

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- Hugeicons
- PWA

## Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime jika dibutuhkan

## Deployment

Vercel.

---

# 29. Database Schema

## profiles

```sql
id uuid primary key references auth.users(id)
name text
avatar_url text
created_at timestamptz
updated_at timestamptz
```

## families

```sql
id uuid primary key
name text not null
owner_id uuid references profiles(id)
created_at timestamptz
updated_at timestamptz
```

## family_members

```sql
id uuid primary key
family_id uuid references families(id)
user_id uuid references profiles(id)
role text check (role in ('OWNER', 'PARENT', 'MEMBER'))
joined_at timestamptz
```

Unique:

```text
(family_id, user_id)
```

## habits

```sql
id uuid primary key
family_id uuid references families(id)
name text not null
category text not null
type text not null
target_value numeric
unit text
frequency text
reminder_time time
is_active boolean default true
sort_order integer default 0
created_at timestamptz
updated_at timestamptz
```

## habit_schedules

```sql
id uuid primary key
habit_id uuid references habits(id)
frequency text
days integer[]
```

## mutabaah_entries

```sql
id uuid primary key
habit_id uuid references habits(id)
user_id uuid references profiles(id)
date date not null
value numeric default 0
status text not null
note text
completed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Unique:

```text
(habit_id, user_id, date)
```

## invitations

```sql
id uuid primary key
family_id uuid references families(id)
created_by uuid references profiles(id)
token_hash text not null
expires_at timestamptz
used_at timestamptz
created_at timestamptz
```

## notification_preferences

```sql
id uuid primary key
user_id uuid references profiles(id)
enabled boolean default true
morning_time time
evening_time time
created_at timestamptz
updated_at timestamptz
```

---

# 30. Security / RLS

Semua tabel family-scoped wajib menggunakan Row Level Security.

Rules:

### Parent

Parent hanya dapat:
- melihat data family tempat mereka menjadi member;
- mengelola habit family;
- melihat entry anggota family.

### Member

Member hanya dapat:
- melihat habit family;
- membaca entry miliknya;
- membuat/mengubah entry miliknya.

Member tidak dapat:
- membaca family lain;
- mengubah habit;
- mengubah entry member lain;
- mengubah role.

### Invitation

Token tidak boleh disimpan sebagai plaintext jika tidak diperlukan.

---

# 31. Offline / PWA

MVP mendukung basic offline experience.

Ketika offline:
- UI tetap dapat dibuka;
- checklist dapat diubah secara lokal;
- perubahan masuk queue;
- data disinkronkan ketika koneksi kembali.

Conflict strategy MVP:

`last-write-wins`

Untuk entry mutabaah.

---

# 32. API / Server Actions

Recommended operations:

```text
createFamily()
updateFamily()

addFamilyMember()
removeFamilyMember()

createInvitation()
acceptInvitation()

createHabit()
updateHabit()
deleteHabit()

getTodayMutabaah()
updateMutabaahEntry()

getWeeklyProgress()
getMonthlyProgress()

getMemberProgress()

updateNotificationPreferences()
```

Server-side authorization wajib dilakukan meskipun UI sudah membatasi akses.

---

# 33. Important Edge Cases

### User tidak mengisi sehari

Jangan otomatis dianggap gagal.

Status:

`NO_DATA`

### Habit dibuat di tengah minggu

Habit hanya dihitung mulai tanggal aktif.

### Habit dinonaktifkan

History lama tetap ada.

### Target berubah

Entry lama tidak boleh berubah secara retroaktif.

### User keluar family

Data historical tetap mengikuti policy retention yang ditentukan.

### Invitation expired

Tampilkan:

> Undangan ini sudah tidak berlaku.

### Offline

Tampilkan indicator:

`Offline — perubahan akan disinkronkan.`

---

# 34. Analytics

MVP hanya mengumpulkan event produk yang diperlukan.

Events:

```text
signup_completed
family_created
member_added
template_selected
habit_created
mutabaah_completed
mutabaah_partial
reminder_enabled
weekly_progress_viewed
```

Jangan mengumpulkan isi catatan pribadi secara analytics.

---

# 35. Success Metrics

### Activation

Persentase user baru yang:
- membuat family;
- membuat minimal 3 habit;
- melakukan check-in pertama.

### Engagement

- Daily Active Users;
- Weekly Active Users;
- average check-ins/day;
- percentage of active users completing mutabaah.

### Retention

- D7 retention;
- D30 retention.

### Core Product Metric

**Percentage of active families completing mutabaah at least 5 days per week.**

---

# 36. MVP Scope

## Must Have

- Authentication
- Family
- Member
- Invitation
- Habit
- Template
- Daily mutabaah
- Boolean/quantity target
- Daily progress
- Weekly progress
- Calendar
- Basic PWA
- RLS
- Responsive UI

## Should Have

- Reminder
- Monthly progress
- Streak
- Notes
- Offline queue

## Could Have

- Achievement
- Export PDF
- Custom categories
- Multiple families

## Won't Have

- Chat
- Public profile
- Leaderboard
- Social feed
- AI
- Marketplace

---

# 37. Development Phases

## Phase 1 — Foundation

- Next.js setup
- Tailwind
- shadcn
- Supabase
- Auth
- Database
- RLS
- PWA configuration

## Phase 2 — Family

- Create family
- Family member
- Invitation
- Role management

## Phase 3 — Mutabaah

- Habit CRUD
- Template
- Daily checklist
- Entry
- Progress calculation

## Phase 4 — Progress

- Weekly
- Monthly
- Calendar
- Streak

## Phase 5 — Notifications

- Push permission
- Reminder settings
- Scheduled reminders

## Phase 6 — Polish

- Loading state
- Empty state
- Error state
- Offline state
- Accessibility
- Performance
- Responsive QA

---

# 38. Acceptance Criteria MVP

Produk dianggap siap MVP apabila:

1. User dapat register/login.
2. User dapat membuat family.
3. Parent dapat menambahkan member.
4. Member dapat join melalui invitation.
5. Parent dapat memilih template.
6. Parent dapat membuat/edit/delete habit.
7. Member dapat melihat target hari ini.
8. Member dapat menyelesaikan target dengan satu tap.
9. Quantity habit dapat mencatat nilai aktual.
10. Progress harian dihitung otomatis.
11. Progress mingguan tersedia.
12. History dapat dilihat melalui calendar.
13. Member tidak dapat melihat data family lain.
14. RLS aktif pada tabel yang relevan.
15. PWA dapat di-install.
16. Layout nyaman digunakan pada smartphone.
17. Daily mutabaah dapat diisi dengan cepat.
18. Error network ditangani dengan baik.

---

# 39. Future Features

Setelah MVP tervalidasi:

### Family Insights

```text
Kebiasaan paling konsisten:
Tilawah

Kebiasaan yang perlu perhatian:
Dzikir petang
```

### Monthly Reflection

User menjawab:

```text
Apa kebiasaan yang paling berkembang?

Apa yang ingin diperbaiki bulan depan?
```

### Achievement

Achievement personal tanpa leaderboard.

### PDF Report

Parent dapat export:

`Mutabaah Ahmad — September 2026.pdf`

### Seasonal Template

- Ramadhan
- Dzulhijjah
- Liburan sekolah
- Tahun ajaran baru

### AI

AI dapat membantu membuat target yang realistis berdasarkan pola penggunaan, tetapi tidak menjadi bagian dari core MVP.

---

# 40. Product Philosophy

Mutabaah bukan aplikasi untuk menghitung seberapa "baik" seseorang beribadah.

Mutabaah adalah alat untuk membantu seseorang melihat:

> Apa yang sudah dilakukan?
>
> Apa yang belum konsisten?
>
> Apa yang ingin diperbaiki besok?

Karena itu, desain, copywriting, gamification, dan analytics harus selalu mendukung **konsistensi dan refleksi**, bukan kompetisi.

---

# 41. Recommended MVP Navigation

### Parent

```text
┌──────────────────────────┐
│ Beranda                  │
│                          │
│ Progress keluarga        │
│ Ahmad       86%          │
│ Aisyah      72%          │
│                          │
│ Aktivitas terbaru        │
│                          │
│ [Lihat Mutabaah]         │
└──────────────────────────┘

Beranda | Mutabaah | Progress | Keluarga | Profil
```

### Member

```text
┌──────────────────────────┐
│ Assalamu'alaikum, Ahmad  │
│                          │
│ Hari ini                 │
│ 82%                      │
│                          │
│ Shalat       3/5         │
│ Tilawah      2/2         │
│ Hafalan      5/5         │
│                          │
│ [Isi Mutabaah]           │
└──────────────────────────┘

Hari Ini | Mutabaah | Progress | Profil
```

---

# 42. Final Recommendation

Mulai dari pengalaman **daily mutabaah** terlebih dahulu.

Jangan membangun dashboard yang kompleks sebelum core loop terbukti:

```text
Target dibuat
      ↓
Reminder
      ↓
User membuka aplikasi
      ↓
User melakukan check-in
      ↓
Progress berubah
      ↓
User melihat konsistensi
      ↓
Besok melakukan lagi
```

Jika loop ini nyaman dan digunakan secara rutin, fitur keluarga, insight, achievement, dan laporan dapat dibangun di atasnya.

**Core product loop:**

`Set Target → Check In → Track Progress → Reflect → Repeat`
