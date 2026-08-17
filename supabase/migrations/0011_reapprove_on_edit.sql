-- ============================================================
-- Close a moderation bypass.
--
-- events_update lets an owner edit their own event, and the status column was
-- left untouched. So the sequence below defeated review entirely:
--   1. submit something harmless        -> pending
--   2. admin approves                   -> live
--   3. owner rewrites title/description -> still live, never re-reviewed
--
-- Fix: when a non-admin edits the CONTENT of an already-approved event, send
-- it back to the pending queue automatically.
--
-- This replaces guard_event_status() so both rules live in one trigger and
-- cannot fight each other over the same column.
-- ============================================================

create or replace function public.guard_event_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
  content_changed boolean;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  -- Admins may do anything, including approving and rejecting.
  if coalesce(caller_role, 'viewer') = 'admin' then
    return new;
  end if;

  -- Nobody else may set the status directly.
  if new.status is distinct from old.status then
    raise exception 'Only an admin can change event status';
  end if;

  -- Did any reviewable field actually change? rsvp_count and view_count are
  -- maintained by the system, so changes to them must NOT trigger re-review.
  content_changed :=
       new.title             is distinct from old.title
    or new.description       is distinct from old.description
    or new.category          is distinct from old.category
    or new.date_start        is distinct from old.date_start
    or new.date_end          is distinct from old.date_end
    or new.location          is distinct from old.location
    or new.is_online         is distinct from old.is_online
    or new.online_link       is distinct from old.online_link
    or new.cover_image       is distinct from old.cover_image
    or new.organizer         is distinct from old.organizer
    or new.registration_link is distinct from old.registration_link
    or new.capacity          is distinct from old.capacity
    or new.tags              is distinct from old.tags;

  -- Editing a live event pulls it back into the queue.
  if content_changed and old.status = 'approved' then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

-- Trigger definition is unchanged; recreate it so the new body is bound.
drop trigger if exists events_guard_status on public.events;
create trigger events_guard_status
  before update on public.events
  for each row execute function public.guard_event_status();

-- Clean up the bypass-test account (cascades to its event).
delete from auth.users where email = 'bypasstest.eventlab@gmail.com';
