-- Week 6 operations: recurring jobs, finding comments.
-- Sites/assets hierarchy + unique external ids already exist from Week 2.
-- Tenant isolation remains repository-enforced; RLS on new tables matches Week 2 org-select.

create table if not exists schedule_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  site_id uuid references sites (id) on delete set null,
  asset_id uuid references assets (id) on delete set null,
  template_version_id uuid not null references template_versions (id),
  assigned_to_user_id uuid references users (id) on delete set null,
  name text not null,
  frequency text not null,
  time_zone text not null,
  local_hour integer not null default 17,
  local_minute integer not null default 0,
  weekday integer,
  day_of_month integer,
  interval_days integer,
  once_local_date date,
  next_run_local_date date,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_rules_org_idx on schedule_rules (organization_id);
create index if not exists schedule_rules_next_idx on schedule_rules (next_run_local_date);

create table if not exists schedule_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  schedule_rule_id uuid not null references schedule_rules (id) on delete cascade,
  local_date date not null,
  inspection_id uuid references inspections (id) on delete set null,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists schedule_jobs_rule_date_uidx
  on schedule_jobs (schedule_rule_id, local_date);
create index if not exists schedule_jobs_org_idx on schedule_jobs (organization_id);

create table if not exists finding_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  finding_id uuid not null references findings (id) on delete cascade,
  author_user_id uuid references users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists finding_comments_org_idx on finding_comments (organization_id);
create index if not exists finding_comments_finding_idx on finding_comments (finding_id);

drop trigger if exists schedule_rules_updated_at on schedule_rules;
create trigger schedule_rules_updated_at
  before update on schedule_rules
  for each row execute function inspectstack_set_updated_at();

alter table schedule_rules enable row level security;
alter table schedule_jobs enable row level security;
alter table finding_comments enable row level security;

drop policy if exists schedule_rules_org_select on schedule_rules;
create policy schedule_rules_org_select on schedule_rules
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

drop policy if exists schedule_jobs_org_select on schedule_jobs;
create policy schedule_jobs_org_select on schedule_jobs
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

drop policy if exists finding_comments_org_select on finding_comments;
create policy finding_comments_org_select on finding_comments
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));
