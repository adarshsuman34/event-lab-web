-- Remove the account used to prove the moderation bypass is closed.
-- Cascades to its profile and its event.
delete from auth.users where email = 'retest.eventlab@gmail.com';

select email, name, role from public.profiles;
