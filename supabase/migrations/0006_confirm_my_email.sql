-- ============================================================
-- Can you actually log in?
--
-- A profile row is created the moment you sign up, BEFORE you confirm your
-- email — so its existence does not mean login will work. This checks the
-- real flag, and confirms your address manually so you are not stuck behind
-- the free-tier email rate limit.
-- ============================================================

-- Mark your own address as confirmed (you own this project, so this is
-- equivalent to clicking the link in the email).
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email = 'aadarshsuman4275@gmail.com';

-- Result must show '✅ can log in'.
select
  email,
  case when email_confirmed_at is null
       then '❌ NOT confirmed — login will fail'
       else '✅ can log in'
  end as login_status
from auth.users
where email = 'aadarshsuman4275@gmail.com';
