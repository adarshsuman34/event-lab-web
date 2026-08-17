-- ============================================================
-- 1) FIX A PRIVACY LEAK
--    profiles_read was `using (true)`, so anyone holding the publishable
--    key — which ships in the browser bundle — could download every user's
--    email address. Restrict rows to the owner and admins.
--
--    Event cards are unaffected: events store the organizer name as text,
--    and the client already falls back to a generated avatar when the
--    joined profile is not visible.
--
-- 2) ADD AN ADMIN MEMBER DIRECTORY
-- ============================================================

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- ---------- Admin member directory ----------
-- security definer so it can read every row, but the WHERE clause means a
-- non-admin caller simply gets zero rows back.
create or replace function public.admin_list_users()
returns table (
  id           uuid,
  name         text,
  email        text,
  role         text,
  avatar_url   text,
  club         text,
  is_verified  boolean,
  created_at   timestamptz,
  event_count  bigint,
  rsvp_count   bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id, p.name, p.email, p.role, p.avatar_url, p.club,
    p.is_verified, p.created_at,
    (select count(*) from public.events e where e.organizer_id = p.id),
    (select count(*) from public.rsvps r  where r.user_id     = p.id)
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------- Let an admin change someone's role ----------
-- guard_profile_privileges() already blocks non-admins, so this only needs
-- to expose the action; the trigger remains the real enforcement.
create or replace function public.admin_set_role(target_id uuid, new_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  if new_role not in ('viewer', 'organizer', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;
  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin access';
  end if;

  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Verify the leak is closed: this must return 0 rows for an anonymous caller.
select count(*) as rows_visible_to_anon from public.profiles;
