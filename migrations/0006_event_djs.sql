create table if not exists event_djs (
  event_id text not null references events (id) on delete cascade,
  user_id text not null,
  primary key (event_id, user_id)
);

create index if not exists event_djs_user_idx on event_djs (user_id);
