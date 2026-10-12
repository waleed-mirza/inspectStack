-- Week 2 foundation schema. Tenant isolation is enforced in repositories;
-- RLS is defense in depth (ADR 0001 / 0007).

create extension if not exists pgcrypto;

create or replace function inspectstack_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type membership_role as enum (
  'owner',
  'admin',
  'template_manager',
  'inspector',
  'reviewer',
  'client_viewer'
);

create type membership_status as enum ('invited', 'active', 'suspended');

create type app_mode as enum ('single_company', 'saas');

create type inspection_status as enum (
  'draft',
  'assigned',
  'in_progress',
  'submitted',
  'approved',
  'returned',
  'archived'
);

create type finding_status as enum (
  'open',
  'acknowledged',
  'in_progress',
  'ready_for_review',
  'closed',
  'reopened'
);

create type template_version_status as enum ('draft', 'published', 'retired');

create type sync_status as enum ('queued', 'sending', 'applied', 'conflict', 'failed');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Australia/Sydney',
  app_mode app_mode not null default 'single_company',
  branding jsonb not null default '{}'::jsonb,
  plan_key text not null default 'single',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role membership_role not null,
  status membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_idx on memberships (user_id);
create index memberships_org_idx on memberships (organization_id);

create or replace function inspectstack_active_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from memberships
  where user_id = auth.uid()
    and status = 'active';
$$;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role membership_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invitations_org_idx on invitations (organization_id);

create table sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  parent_id uuid references sites (id) on delete set null,
  name text not null,
  address_line text,
  tags text[] not null default '{}',
  external_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_org_idx on sites (organization_id);
create unique index sites_org_external_uidx
  on sites (organization_id, external_id)
  where external_id is not null;

create table assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  name text not null,
  tags text[] not null default '{}',
  external_id text,
  qr_token text unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assets_org_idx on assets (organization_id);
create index assets_site_idx on assets (site_id);
create unique index assets_org_external_uidx
  on assets (organization_id, external_id)
  where external_id is not null;

create table templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  pack_key text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index templates_org_idx on templates (organization_id);

create table template_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  template_id uuid not null references templates (id) on delete cascade,
  version integer not null,
  status template_version_status not null default 'draft',
  schema jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create index template_versions_org_idx on template_versions (organization_id);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  template_version_id uuid not null references template_versions (id),
  site_id uuid references sites (id) on delete set null,
  asset_id uuid references assets (id) on delete set null,
  assigned_to_user_id uuid references users (id) on delete set null,
  status inspection_status not null default 'draft',
  number text not null,
  due_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create index inspections_org_idx on inspections (organization_id);
create index inspections_assignee_idx on inspections (assigned_to_user_id);

create table responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  inspection_id uuid not null references inspections (id) on delete cascade,
  field_key text not null,
  value jsonb not null default '{}'::jsonb,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (inspection_id, field_key)
);

create index responses_org_idx on responses (organization_id);

create table findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  inspection_id uuid not null references inspections (id) on delete cascade,
  field_key text,
  title text not null,
  severity text not null default 'medium',
  status finding_status not null default 'open',
  notes text,
  owner_user_id uuid references users (id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index findings_org_idx on findings (organization_id);
create index findings_inspection_idx on findings (inspection_id);

create table media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  inspection_id uuid not null references inspections (id) on delete cascade,
  finding_id uuid references findings (id) on delete set null,
  storage_key text not null unique,
  content_type text not null,
  byte_size integer,
  content_hash text,
  caption text,
  created_at timestamptz not null default now()
);

create index media_org_idx on media (organization_id);
create index media_inspection_idx on media (inspection_id);

create table report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  inspection_id uuid not null references inspections (id) on delete cascade,
  layout_key text not null default 'standard',
  content_hash text not null,
  storage_key text,
  verification_code text not null unique,
  issued_at timestamptz not null default now(),
  issued_by_user_id uuid references users (id) on delete set null,
  revoked_at timestamptz
);

create index report_snapshots_org_idx on report_snapshots (organization_id);

create table sync_operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  inspection_id uuid references inspections (id) on delete cascade,
  client_operation_id text not null,
  status sync_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (organization_id, client_operation_id)
);

create index sync_operations_org_idx on sync_operations (organization_id);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade,
  actor_user_id uuid references users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_org_idx on audit_events (organization_id);
create index audit_events_created_idx on audit_events (created_at desc);

create trigger organizations_updated_at
  before update on organizations
  for each row execute function inspectstack_set_updated_at();

create trigger users_updated_at
  before update on users
  for each row execute function inspectstack_set_updated_at();

create trigger sites_updated_at
  before update on sites
  for each row execute function inspectstack_set_updated_at();

create trigger assets_updated_at
  before update on assets
  for each row execute function inspectstack_set_updated_at();

create trigger templates_updated_at
  before update on templates
  for each row execute function inspectstack_set_updated_at();

create trigger inspections_updated_at
  before update on inspections
  for each row execute function inspectstack_set_updated_at();

create trigger findings_updated_at
  before update on findings
  for each row execute function inspectstack_set_updated_at();

alter table organizations enable row level security;
alter table users enable row level security;
alter table memberships enable row level security;
alter table invitations enable row level security;
alter table sites enable row level security;
alter table assets enable row level security;
alter table templates enable row level security;
alter table template_versions enable row level security;
alter table inspections enable row level security;
alter table responses enable row level security;
alter table findings enable row level security;
alter table media enable row level security;
alter table report_snapshots enable row level security;
alter table sync_operations enable row level security;
alter table audit_events enable row level security;

create policy organizations_member_select on organizations
  for select to authenticated
  using (id in (select inspectstack_active_org_ids()));

create policy users_self_select on users
  for select to authenticated
  using (id = auth.uid() or id in (
    select m.user_id from memberships m
    where m.organization_id in (select inspectstack_active_org_ids())
  ));

create policy memberships_own_select on memberships
  for select to authenticated
  using (user_id = auth.uid() or organization_id in (select inspectstack_active_org_ids()));

create policy invitations_org_select on invitations
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy sites_org_select on sites
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy assets_org_select on assets
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy templates_org_select on templates
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy template_versions_org_select on template_versions
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy inspections_org_select on inspections
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy responses_org_select on responses
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy findings_org_select on findings
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy media_org_select on media
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy report_snapshots_org_select on report_snapshots
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy sync_operations_org_select on sync_operations
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

create policy audit_events_org_select on audit_events
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create policy evidence_select_own_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] in (
      select inspectstack_active_org_ids::text from inspectstack_active_org_ids()
    )
  );

create policy evidence_insert_own_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] in (
      select inspectstack_active_org_ids::text from inspectstack_active_org_ids()
    )
  );

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;
