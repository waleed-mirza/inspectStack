-- Week 7 commercially harden: feature flags, impersonation sessions, rate-limit buckets.
-- Tenant isolation remains repository-enforced; RLS on new tables matches Week 2.

alter table organizations
  add column if not exists feature_flags jsonb not null default '{}'::jsonb;

create table if not exists impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references users (id) on delete cascade,
  target_organization_id uuid not null references organizations (id) on delete cascade,
  target_user_id uuid references users (id) on delete set null,
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists impersonation_sessions_actor_idx on impersonation_sessions (actor_user_id);
create index if not exists impersonation_sessions_org_idx on impersonation_sessions (target_organization_id);

create table if not exists rate_limit_buckets (
  bucket_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  primary key (bucket_key, window_start)
);

alter table impersonation_sessions enable row level security;
alter table rate_limit_buckets enable row level security;

drop policy if exists impersonation_sessions_actor_select on impersonation_sessions;
create policy impersonation_sessions_actor_select on impersonation_sessions
  for select to authenticated
  using (actor_user_id = auth.uid());

-- Rate-limit buckets are server-only (service / postgres role). No authenticated policy.
