-- Mutabaah Initial Schema — per PRD §29 — PREFIX: mutabaah_
-- Run in Supabase SQL Editor or via supabase db push
-- All tables prefixed with mutabaah_ to avoid collision

create extension if not exists "uuid-ossp";

-- profiles
create table if not exists public.mutabaah_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- families
create table if not exists public.mutabaah_families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references public.mutabaah_profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- family_members
create table if not exists public.mutabaah_family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.mutabaah_families(id) on delete cascade,
  user_id uuid not null references public.mutabaah_profiles(id) on delete cascade,
  role text not null check (role in ('OWNER','PARENT','MEMBER')),
  joined_at timestamptz default now(),
  unique (family_id, user_id)
);

-- habits
create table if not exists public.mutabaah_habits (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.mutabaah_families(id) on delete cascade,
  name text not null,
  category text not null,
  type text not null check (type in ('BOOLEAN','QUANTITY','COUNTER','DURATION')),
  target_value numeric default 1,
  unit text,
  frequency text default 'DAILY',
  reminder_time time,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- habit_schedules
create table if not exists public.mutabaah_habit_schedules (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references public.mutabaah_habits(id) on delete cascade,
  frequency text default 'DAILY',
  days integer[]
);

-- mutabaah_entries (already prefixed)
create table if not exists public.mutabaah_entries (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid not null references public.mutabaah_habits(id) on delete cascade,
  user_id uuid not null references public.mutabaah_profiles(id) on delete cascade,
  date date not null,
  value numeric default 0,
  status text not null check (status in ('PENDING','PARTIAL','COMPLETED','SKIPPED')),
  note text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (habit_id, user_id, date)
);

-- invitations
create table if not exists public.mutabaah_invitations (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.mutabaah_families(id) on delete cascade,
  created_by uuid references public.mutabaah_profiles(id) on delete set null,
  token_hash text not null,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz default now()
);

-- notification_preferences
create table if not exists public.mutabaah_notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.mutabaah_profiles(id) on delete cascade unique,
  enabled boolean default true,
  morning_time time default '07:00',
  evening_time time default '20:30',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at triggers
create or replace function public.handle_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists tr_profiles_updated on public.mutabaah_profiles;
create trigger tr_profiles_updated before update on public.mutabaah_profiles for each row execute function public.handle_updated_at();
drop trigger if exists tr_families_updated on public.mutabaah_families;
create trigger tr_families_updated before update on public.mutabaah_families for each row execute function public.handle_updated_at();
drop trigger if exists tr_habits_updated on public.mutabaah_habits;
create trigger tr_habits_updated before update on public.mutabaah_habits for each row execute function public.handle_updated_at();
drop trigger if exists tr_entries_updated on public.mutabaah_entries;
create trigger tr_entries_updated before update on public.mutabaah_entries for each row execute function public.handle_updated_at();

-- auto create profile on signup
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.mutabaah_profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into public.mutabaah_notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- indexes
create index if not exists idx_mutabaah_family_members_user on public.mutabaah_family_members(user_id);
create index if not exists idx_mutabaah_habits_family on public.mutabaah_habits(family_id);
create index if not exists idx_mutabaah_entries_user_date on public.mutabaah_entries(user_id, date);
create index if not exists idx_mutabaah_entries_habit on public.mutabaah_entries(habit_id);
