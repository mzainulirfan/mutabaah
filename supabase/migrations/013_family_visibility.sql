-- 013: izin lihat ringkasan keluarga per anggota + RPC overview.
-- Member berflag (atau parent) boleh melihat RINGKASAN sekeluarga
-- (today%, deret 30 hari, kabar terakhir) tanpa nilai mentah per entri.

alter table public.mutabaah_family_members
  add column if not exists can_view_family boolean not null default false;

-- Hanya OWNER yang boleh mengubah flag (via RPC agar atomik + aman dari RLS update).
create or replace function public.set_view_permission(p_family_id uuid, p_user_id uuid, p_allowed boolean)
returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;
begin
  select role into v_role from public.mutabaah_family_members
  where family_id = p_family_id and user_id = auth.uid();
  if v_role is distinct from 'OWNER' then raise exception 'Hanya pemilik yang bisa mengatur izin.'; end if;
  if p_user_id = auth.uid() then raise exception 'Tidak perlu — pemilik selalu bisa melihat.'; end if;
  update public.mutabaah_family_members
  set can_view_family = p_allowed
  where family_id = p_family_id and user_id = p_user_id;
  if not found then raise exception 'Anggota tidak ditemukan.'; end if;
end; $$;
revoke all on function public.set_view_permission(uuid, uuid, boolean) from public;
grant execute on function public.set_view_permission(uuid, uuid, boolean) to authenticated;

-- Ringkasan sekeluarga untuk yang berizin: persen hari ini + deret 30 hari
-- per anggota dan 5 kabar terakhir. Tanpa nilai mentah per entri.
create or replace function public.get_family_overview()
returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_fam uuid;
  v_ok boolean;
  v_today date := current_date;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select fm.family_id into v_fam
  from public.mutabaah_family_members fm where fm.user_id = v_uid limit 1;
  if v_fam is null then raise exception 'Tidak punya keluarga.'; end if;
  select exists (
    select 1 from public.mutabaah_family_members
    where family_id = v_fam and user_id = v_uid
      and (role in ('OWNER','PARENT') or coalesce(can_view_family, false))
  ) into v_ok;
  if not v_ok then raise exception 'Tidak punya izin melihat ringkasan.'; end if;

  return (
    with member_list as (
      select fm.user_id as id, coalesce(p.name, left(fm.user_id::text, 6)) as name
      from public.mutabaah_family_members fm
      left join public.mutabaah_profiles p on p.id = fm.user_id
      where fm.family_id = v_fam
    ),
    habits as (
      select id, type, target_value from public.mutabaah_habits
      where family_id = v_fam and is_active
    ),
    days as (
      select generate_series(v_today - 29, v_today, '1 day')::date as d
    ),
    day_pct as (
      select m.id as user_id, d.d as date,
        coalesce(round(avg(
          case
            when h.type = 'BOOLEAN' then case when coalesce(e.value, 0) > 0 then 100 else 0 end
            else least(100, round(coalesce(e.value, 0) / nullif(h.target_value, 0) * 100))
          end
        )), 0)::int as pct
      from member_list m
      cross join habits h
      cross join days d
      left join public.mutabaah_entries e
        on e.family_id = v_fam and e.user_id = m.id and e.habit_id = h.id and e.date = d.d
      group by m.id, d.d
    ),
    members_json as (
      select m.id, m.name,
        coalesce((select pct from day_pct where user_id = m.id and date = v_today), 0) as today,
        coalesce((select jsonb_agg(pct order by date) from day_pct where user_id = m.id), '[]'::jsonb) as series
      from member_list m
    ),
    recent_json as (
      select coalesce(jsonb_agg(row_to_json(r) order by completed_at desc), '[]'::jsonb) as items from (
        select coalesce(p.name, 'Anggota keluarga') as name, h.name as habit,
          e.status, e.context, e.completed_at
        from public.mutabaah_entries e
        join public.mutabaah_habits h on h.id = e.habit_id
        left join public.mutabaah_profiles p on p.id = e.user_id
        where e.family_id = v_fam and e.completed_at is not null
        order by e.completed_at desc limit 5
      ) r
    )
    select jsonb_build_object(
      'members', coalesce((select jsonb_agg(row_to_json(m)) from members_json m), '[]'::jsonb),
      'recent', (select items from recent_json)
    )
  );
end; $$;
revoke all on function public.get_family_overview() from public;
grant execute on function public.get_family_overview() to authenticated;

analyze public.mutabaah_family_members;
