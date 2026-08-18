-- ============================================================
-- Count views on event detail pages.
--
-- events_update only allows the owner or an admin, so a visitor cannot bump
-- the counter directly. This runs security definer to do that one narrow
-- thing, and nothing else.
-- ============================================================

create or replace function public.increment_view(target_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.events
     set view_count = view_count + 1
   where id = target_id
     -- Only public events; drafts in review should not accrue views.
     and status = 'approved'
     -- An organiser refreshing their own page should not inflate the number.
     and organizer_id is distinct from auth.uid();
end;
$$;

revoke all on function public.increment_view(uuid) from public;
grant execute on function public.increment_view(uuid) to anon, authenticated;

select title, view_count, save_count from public.events;
