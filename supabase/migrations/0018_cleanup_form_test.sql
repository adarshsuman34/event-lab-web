-- Remove leftover test accounts:
--   formtest  — used to verify the new required-field validation
--   attacker/victim — from the admin-bypass test (0013 appears not to have run)
delete from auth.users
 where email in (
   'formtest.eventlab@gmail.com',
   'attacker.eventlab@gmail.com',
   'victim.eventlab@gmail.com'
 );

select email, name, role from public.profiles order by created_at;
