-- Remove the security-test account. Deleting the auth user cascades to
-- its profile row.
delete from auth.users where email = 'sectest.eventlab@gmail.com';

select email, name, role from public.profiles;
