create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text,
  intake jsonb not null default '{}'::jsonb,
  character_sheet jsonb not null default '{}'::jsonb,
  world_facts jsonb not null default '[]'::jsonb,
  open_threads jsonb not null default '[]'::jsonb,
  reference_image_url text,
  style_lock text,
  genesis_token_id text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worlds_status_check check (status in ('draft', 'portrait_ready', 'locked', 'minting', 'active', 'failed'))
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  chapter_index integer not null,
  content text,
  image_url text,
  scene_description text,
  chapter_token_id text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_status_check check (status in ('draft', 'text_ready', 'image_ready', 'minting', 'minted', 'failed')),
  constraint chapters_world_index_unique unique (world_id, chapter_index),
  constraint chapters_chapter_index_positive check (chapter_index > 0)
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references public.worlds(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  checkpoint jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  run_at timestamptz not null default now(),
  worker_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint generation_jobs_type_check check (job_type in ('portrait.generate', 'genesis.mint', 'chapter.generate', 'chapter.image', 'chapter.mint')),
  constraint generation_jobs_status_check check (status in ('queued', 'processing', 'succeeded', 'failed', 'retrying', 'dead')),
  constraint generation_jobs_retry_count_check check (retry_count >= 0),
  constraint generation_jobs_max_retries_check check (max_retries >= 0)
);

create table if not exists public.mint_transactions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  tx_hash text,
  token_id text,
  contract_address text,
  tx_type text not null,
  world_id uuid references public.worlds(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mint_transactions_type_check check (tx_type in ('genesis', 'chapter')),
  constraint mint_transactions_status_check check (status in ('pending', 'submitted', 'confirmed', 'failed')),
  constraint mint_transactions_world_or_chapter_check check (world_id is not null or chapter_id is not null)
);

create index if not exists worlds_creator_id_idx on public.worlds (creator_id);
create index if not exists chapters_world_id_idx on public.chapters (world_id);
create index if not exists generation_jobs_world_id_idx on public.generation_jobs (world_id);
create index if not exists generation_jobs_chapter_id_idx on public.generation_jobs (chapter_id);
create index if not exists mint_transactions_world_id_idx on public.mint_transactions (world_id);
create index if not exists mint_transactions_chapter_id_idx on public.mint_transactions (chapter_id);

create index if not exists generation_jobs_claim_idx
  on public.generation_jobs (run_at, created_at)
  where status in ('queued', 'retrying');

create index if not exists generation_jobs_status_created_at_idx
  on public.generation_jobs (status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists worlds_set_updated_at on public.worlds;
create trigger worlds_set_updated_at
before update on public.worlds
for each row execute function public.set_updated_at();

drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

drop trigger if exists generation_jobs_set_updated_at on public.generation_jobs;
create trigger generation_jobs_set_updated_at
before update on public.generation_jobs
for each row execute function public.set_updated_at();

drop trigger if exists mint_transactions_set_updated_at on public.mint_transactions;
create trigger mint_transactions_set_updated_at
before update on public.mint_transactions
for each row execute function public.set_updated_at();

create or replace function public.claim_next_generation_job(p_worker_id text)
returns setof public.generation_jobs
language sql
set search_path = public
as $$
  update public.generation_jobs
  set
    status = 'processing',
    worker_id = p_worker_id,
    started_at = now(),
    error_message = null
  where id = (
    select id
    from public.generation_jobs
    where status in ('queued', 'retrying')
      and run_at <= now()
    order by run_at asc, created_at asc
    limit 1
    for update skip locked
  )
  returning *;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.claim_next_generation_job(text) from public;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.claim_next_generation_job(text) from anon, authenticated;
grant execute on function public.claim_next_generation_job(text) to service_role;

grant select on public.users to anon, authenticated;
grant select on public.worlds to anon, authenticated;
grant select on public.chapters to anon, authenticated;
grant select on public.generation_jobs to anon, authenticated;
grant select on public.mint_transactions to anon, authenticated;

alter table public.users enable row level security;
alter table public.worlds enable row level security;
alter table public.chapters enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.mint_transactions enable row level security;

drop policy if exists "users are readable by anon" on public.users;
create policy "users are readable by anon"
on public.users for select
to anon, authenticated
using (true);

drop policy if exists "worlds are readable by anon" on public.worlds;
create policy "worlds are readable by anon"
on public.worlds for select
to anon, authenticated
using (true);

drop policy if exists "chapters are readable by anon" on public.chapters;
create policy "chapters are readable by anon"
on public.chapters for select
to anon, authenticated
using (true);

drop policy if exists "jobs are readable by anon" on public.generation_jobs;
create policy "jobs are readable by anon"
on public.generation_jobs for select
to anon, authenticated
using (true);

drop policy if exists "mints are readable by anon" on public.mint_transactions;
create policy "mints are readable by anon"
on public.mint_transactions for select
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'worlds'
  ) then
    alter publication supabase_realtime add table public.worlds;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chapters'
  ) then
    alter publication supabase_realtime add table public.chapters;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'generation_jobs'
  ) then
    alter publication supabase_realtime add table public.generation_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mint_transactions'
  ) then
    alter publication supabase_realtime add table public.mint_transactions;
  end if;
end $$;
