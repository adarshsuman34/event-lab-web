-- Remove the accounts used to test saved events (cascades to their saves).
delete from auth.users
 where email in ('saver.eventlab@gmail.com', 'nosy.eventlab@gmail.com');

select email, name, role from public.profiles;
