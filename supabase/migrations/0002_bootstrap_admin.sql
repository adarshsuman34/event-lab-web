-- ============================================================
-- Make aadarshsuman4275@gmail.com the first admin.
--
-- ⚠️ RUN THIS *AFTER* SIGNING UP ON THE WEBSITE.
--
-- Why the trigger dance below:
-- guard_profile_privileges() blocks any role change unless auth.uid() belongs
-- to an existing admin. In the SQL Editor auth.uid() is NULL, so the guard
-- (correctly) refuses — which is exactly why there is no first admin yet.
-- We switch the guard off for this one statement and back on immediately.
--
-- This runs as a single transaction: if anything fails, the disable is
-- rolled back too, so the guard can never be left off by accident.
-- ============================================================

alter table public.profiles disable trigger profiles_guard_privileges;

do $$
declare
  target_email text := 'aadarshsuman4275@gmail.com';
  updated_count int;
begin
  update public.profiles
     set role = 'admin',
         is_verified = true
   where email = target_email;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception
      'No profile found for %. Sign up on the website with this email first, then re-run this file.',
      target_email;
  end if;
end $$;

alter table public.profiles enable trigger profiles_guard_privileges;

-- Confirm the admin exists AND the guard is back on.
select
  (select count(*) from public.profiles where role = 'admin') as admin_count,
  (select tgenabled <> 'D'
     from pg_trigger
    where tgname = 'profiles_guard_privileges'
      and tgrelid = 'public.profiles'::regclass) as guard_enabled;

select email, name, role, is_verified
  from public.profiles
 where role = 'admin';
