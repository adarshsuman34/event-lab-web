-- ============================================================
-- Public save COUNT, private save LIST.
--
-- saved_events stays locked to its owner (nobody, not even an admin, can see
-- who saved what). The aggregate lives on events instead, which is already
-- publicly readable — so organisers get the signal without the names.
-- ============================================================

alter table public.events
  add column if not exists save_count int not null default 0;

create or replace function public.sync_save_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.events set save_count = save_count + 1 where id = new.event_id;
    return new;
  else
    update public.events
       set save_count = greatest(0, save_count - 1)
     where id = old.event_id;
    return old;
  end if;
end;
$$;

drop trigger if exists saved_events_sync_count on public.saved_events;
create trigger saved_events_sync_count
  after insert or delete on public.saved_events
  for each row execute function public.sync_save_count();

-- Backfill anything saved before this trigger existed.
update public.events e
   set save_count = (select count(*) from public.saved_events s where s.event_id = e.id);

-- A content edit must not look like a change worth re-reviewing, so make sure
-- save_count is not in guard_event_status()'s list. (It is not — this is just
-- a reminder for whoever reads this next.)

select title, save_count, rsvp_count from public.events order by save_count desc;
