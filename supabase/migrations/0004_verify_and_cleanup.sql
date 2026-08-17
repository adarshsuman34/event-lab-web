-- ============================================================
-- 1) Confirm the privilege guard is back ON after the admin bootstrap.
-- 2) Remove the throwaway test accounts.
-- ============================================================

-- ---------- Verify security ----------
select
  tgname as trigger_name,
  case tgenabled when 'D' then '❌ DISABLED — NOT SAFE' else '✅ enabled' end as status
from pg_trigger
where tgname in ('profiles_guard_privileges', 'events_guard_status')
order by tgname;

-- Expect exactly one admin: aadarshsuman4275@gmail.com
select email, name, role, is_verified from public.profiles order by role;

-- ---------- Clean up test accounts ----------
-- These were created only to test the signup flow. Deleting the auth user
-- cascades to their profile row.
delete from auth.users
 where email in ('eventlab.test.001@gmail.com', 'eventlab.sectest@gmail.com');

-- Final state:
select email, name, role from public.profiles;
