create table if not exists event_operators (
  event_id text not null references events (id) on delete cascade,
  user_id text not null,
  primary key (event_id, user_id)
);

create index if not exists event_operators_user_idx on event_operators (user_id);

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'client', 'dj', 'operator'));
