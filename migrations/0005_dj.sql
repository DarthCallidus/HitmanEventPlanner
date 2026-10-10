alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'client', 'dj'));
alter table events add column if not exists dj_user_id text;
create index if not exists events_dj_idx on events (dj_user_id);
