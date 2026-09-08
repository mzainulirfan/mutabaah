-- Fix families insert RLS — previous policy with only auth.uid() is not null was not matching when owner_id is checked via session
drop policy if exists "families authenticated insert" on public.mutabaah_families;
create policy "families authenticated insert" on public.mutabaah_families for insert with check (auth.uid() is not null and auth.uid() = owner_id);

drop policy if exists "families member read" on public.mutabaah_families;
create policy "families member read" on public.mutabaah_families for select using (public.is_family_member(id) or owner_id = auth.uid());

drop policy if exists "families owner update" on public.mutabaah_families;
create policy "families owner update" on public.mutabaah_families for update using (public.is_family_parent(id) or owner_id = auth.uid());
