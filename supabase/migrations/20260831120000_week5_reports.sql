-- Week 5 review + reports: return notes, immutable snapshot JSON, share links, download log.
-- Tenant isolation remains repository-enforced; RLS on new tables matches Week 2 org-select.

alter table inspections
  add column if not exists returned_at timestamptz,
  add column if not exists review_note text,
  add column if not exists reviewed_by_user_id uuid references users (id) on delete set null;

alter table report_snapshots
  add column if not exists snapshot jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz;

create index if not exists report_snapshots_inspection_idx on report_snapshots (inspection_id);

create table if not exists report_share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  snapshot_id uuid not null references report_snapshots (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_share_links_org_idx on report_share_links (organization_id);
create index if not exists report_share_links_snapshot_idx on report_share_links (snapshot_id);

create table if not exists report_downloads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  snapshot_id uuid not null references report_snapshots (id) on delete cascade,
  share_link_id uuid references report_share_links (id) on delete set null,
  source text not null default 'verify',
  actor_user_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_downloads_org_idx on report_downloads (organization_id);
create index if not exists report_downloads_snapshot_idx on report_downloads (snapshot_id);

alter table report_share_links enable row level security;
alter table report_downloads enable row level security;

drop policy if exists report_share_links_org_select on report_share_links;
create policy report_share_links_org_select on report_share_links
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));

drop policy if exists report_downloads_org_select on report_downloads;
create policy report_downloads_org_select on report_downloads
  for select to authenticated
  using (organization_id in (select inspectstack_active_org_ids()));
