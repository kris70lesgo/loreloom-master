drop policy if exists "users are readable by anon" on public.users;
create policy "users can read their own profile"
on public.users for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "worlds are readable by anon" on public.worlds;
create policy "users can read their own worlds"
on public.worlds for select
to authenticated
using ((select auth.uid()) = creator_id);

drop policy if exists "chapters are readable by anon" on public.chapters;
create policy "users can read chapters in their own worlds"
on public.chapters for select
to authenticated
using (
  exists (
    select 1
    from public.worlds
    where worlds.id = chapters.world_id
      and worlds.creator_id = (select auth.uid())
  )
);

drop policy if exists "jobs are readable by anon" on public.generation_jobs;
create policy "users can read jobs for their own worlds"
on public.generation_jobs for select
to authenticated
using (
  exists (
    select 1
    from public.worlds
    where worlds.id = generation_jobs.world_id
      and worlds.creator_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.chapters
    join public.worlds on worlds.id = chapters.world_id
    where chapters.id = generation_jobs.chapter_id
      and worlds.creator_id = (select auth.uid())
  )
);

drop policy if exists "mints are readable by anon" on public.mint_transactions;
create policy "users can read mints for their own worlds"
on public.mint_transactions for select
to authenticated
using (
  exists (
    select 1
    from public.worlds
    where worlds.id = mint_transactions.world_id
      and worlds.creator_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.chapters
    join public.worlds on worlds.id = chapters.world_id
    where chapters.id = mint_transactions.chapter_id
      and worlds.creator_id = (select auth.uid())
  )
);
