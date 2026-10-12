-- Week 4 runner: media capture metadata (field, time, GPS, annotation).
-- Tenant isolation remains repository-enforced; RLS policies are unchanged.

alter table media
  add column if not exists field_key text,
  add column if not exists captured_at timestamptz,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists annotation jsonb not null default '{}'::jsonb;

create index if not exists media_field_idx on media (inspection_id, field_key);

update media
set field_key = 'smoke_photo'
where field_key is null
  and caption = 'Seed evidence';
