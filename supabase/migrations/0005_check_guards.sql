-- Only one query, so Supabase cannot hide the result behind a later one.
-- Both rows MUST say '✅ enabled'.
select
  tgname as trigger_name,
  case tgenabled when 'D' then '❌ DISABLED — NOT SAFE' else '✅ enabled' end as status
from pg_trigger
where tgname in ('profiles_guard_privileges', 'events_guard_status')
order by tgname;
