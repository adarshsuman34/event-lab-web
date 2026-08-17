-- Remove the accounts used for the admin-bypass test suite.
-- Cascades to their profiles and events.
delete from auth.users
 where email in ('attacker.eventlab@gmail.com', 'victim.eventlab@gmail.com');

select email, name, role from public.profiles;
