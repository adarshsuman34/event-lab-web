-- ============================================================
-- Saved events ("bookmarks").
--
-- Separate from rsvps on purpose: an RSVP is a public commitment that counts
-- toward capacity, while a save is a private bookmark nobody else can see.
-- ============================================================

create table if not exists public.saved_events (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id)   on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Saving twice is a no-op rather than a duplicate row.
  unique (event_id, user_id)
);

create index if not exists saved_events_user_idx on public.saved_events (user_id);

alter table public.saved_events enable row level security;

-- Strictly private: no one, not even an admin, reads another user's saves.
drop policy if exists saved_read_own on public.saved_events;
create policy saved_read_own on public.saved_events for select
  using (user_id = auth.uid());

drop policy if exists saved_insert_own on public.saved_events;
create policy saved_insert_own on public.saved_events for insert
  with check (user_id = auth.uid());

drop policy if exists saved_delete_own on public.saved_events;
create policy saved_delete_own on public.saved_events for delete
  using (user_id = auth.uid());

-- Must return 0 for an anonymous caller.
select count(*) as visible_to_caller from public.saved_events;
