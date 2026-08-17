-- Remove the test account used to verify that a normal user can submit
-- events. Deleting the auth user cascades to their profile AND to any
-- events they created, so the test event goes with it.
delete from auth.users where email = 'normaluser.eventlab@gmail.com';

select email, name, role from public.profiles;
