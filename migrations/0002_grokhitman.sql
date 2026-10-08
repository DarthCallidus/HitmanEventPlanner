-- GrokHitmanENT: one event record shared by the client portal, admin, and Booth.

create table if not exists profiles (
  user_id text primary key,
  role text not null check (role in ('admin', 'client')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null,
  client_user_id text,
  title text not null,
  event_date date,
  venue text not null default '',
  status text not null default 'new',
  locked_at timestamptz,
  booth_notes text not null default '',
  details jsonb not null default '{}'::jsonb
);

create index if not exists events_date_idx on events (event_date);
create index if not exists events_client_idx on events (client_user_id);
create index if not exists events_status_idx on events (status);

create table if not exists event_changes (
  id text primary key,
  event_id text not null references events (id) on delete cascade,
  user_id text not null,
  actor_name text not null default '',
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_changes_event_idx on event_changes (event_id, created_at desc);
