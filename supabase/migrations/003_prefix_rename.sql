-- Migration for existing DBs that used unprefixed names — renames to mutabaah_*
-- Safe to run even if already prefixed (IF EXISTS)

alter table if exists public.profiles rename to mutabaah_profiles;
alter table if exists public.families rename to mutabaah_families;
alter table if exists public.family_members rename to mutabaah_family_members;
alter table if exists public.habits rename to mutabaah_habits;
alter table if exists public.habit_schedules rename to mutabaah_habit_schedules;
-- mutabaah_entries already has prefix, keep as is; but handle legacy name `entries` if any
alter table if exists public.invitations rename to mutabaah_invitations;
alter table if exists public.notification_preferences rename to mutabaah_notification_preferences;

-- rename indexes if they exist with old names
alter index if exists idx_family_members_user rename to idx_mutabaah_family_members_user;
alter index if exists idx_habits_family rename to idx_mutabaah_habits_family;
alter index if exists idx_entries_user_date rename to idx_mutabaah_entries_user_date;
alter index if exists idx_entries_habit rename to idx_mutabaah_entries_habit;
