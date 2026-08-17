-- ============================================================
-- Let any signed-in user submit an event.
--
-- Moderation is unchanged and still does the real gatekeeping:
--   • events_insert forces status = 'pending', so nothing self-publishes
--   • guard_event_status() still lets only an admin change status
--   • events_read only exposes 'approved' rows to the public
--
-- So the change widens WHO MAY SUBMIT, not who may publish.
-- ============================================================

create or replace function public.can_post()
returns boolean language sql stable security definer set search_path = public as $$
  -- A profile row exists only for real signed-up users, and anonymous
  -- sign-ins are disabled, so this means "signed in".
  select exists (
    select 1 from public.profiles where id = auth.uid()
  );
$$;

-- Verify: this must still be false for an anonymous caller.
select public.can_post() as anon_can_post;
