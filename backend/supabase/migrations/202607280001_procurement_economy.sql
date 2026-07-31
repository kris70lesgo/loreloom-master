create table if not exists public.provider_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- 'story', 'portrait', 'illustration', 'voice', 'music', 'animation'
  base_cost_hbar numeric not null default 0,
  latency_ms integer not null default 1000,
  reliability_score numeric not null default 1.0, -- 0.0 to 1.0
  style_tags jsonb not null default '[]'::jsonb,
  endpoint_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_plans (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  plan_type text not null, -- 'budget', 'balanced', 'premium'
  estimated_cost_hbar numeric not null,
  estimated_duration_ms integer not null,
  estimated_quality_score numeric not null,
  provider_allocations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.worlds 
add column if not exists budget_hbar numeric default 100,
add column if not exists target_quality integer default 5,
add column if not exists deadline_seconds integer default 120,
add column if not exists active_plan_id uuid references public.production_plans(id) on delete set null;

create table if not exists public.procurements (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  provider_id uuid not null references public.provider_registry(id),
  task_type text not null,
  status text not null default 'pending', -- 'pending', 'purchased', 'delivered', 'failed'
  cost_hbar numeric,
  payment_receipt text,
  hashscan_url text,
  asset_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_reputation_history (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_registry(id) on delete cascade,
  procurement_id uuid references public.procurements(id) on delete cascade,
  event_type text not null, -- 'success', 'failure', 'latency_penalty'
  score_delta numeric not null,
  created_at timestamptz not null default now()
);

-- Realtime for procurement dashboards
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'procurements'
  ) then
    alter publication supabase_realtime add table public.procurements;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'production_plans'
  ) then
    alter publication supabase_realtime add table public.production_plans;
  end if;
end $$;

-- Policies for anon/authenticated
grant select on public.provider_registry to anon, authenticated;
grant select on public.production_plans to anon, authenticated;
grant select on public.procurements to anon, authenticated;
grant select on public.provider_reputation_history to anon, authenticated;

alter table public.provider_registry enable row level security;
alter table public.production_plans enable row level security;
alter table public.procurements enable row level security;
alter table public.provider_reputation_history enable row level security;

create policy "provider_registry readable by anon" on public.provider_registry for select to anon, authenticated using (true);
create policy "production_plans readable by anon" on public.production_plans for select to anon, authenticated using (true);
create policy "procurements readable by anon" on public.procurements for select to anon, authenticated using (true);
create policy "provider_reputation_history readable by anon" on public.provider_reputation_history for select to anon, authenticated using (true);

-- Triggers for updated_at
drop trigger if exists provider_registry_set_updated_at on public.provider_registry;
create trigger provider_registry_set_updated_at
before update on public.provider_registry
for each row execute function public.set_updated_at();

drop trigger if exists procurements_set_updated_at on public.procurements;
create trigger procurements_set_updated_at
before update on public.procurements
for each row execute function public.set_updated_at();
