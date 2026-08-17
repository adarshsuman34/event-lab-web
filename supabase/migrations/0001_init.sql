-- ============================================================
-- EventLab — initial schema
-- Paste into Supabase Studio → SQL Editor → Run.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- ---------- Categories ----------
create table if not exists public.categories (
  id     text primary key,
  label  text not null,
  color  text not null,
  icon   text not null,
  sort   int  not null default 0
);

insert into public.categories (id, label, color, icon, sort) values
  ('workshop',  'Workshop',  '#6C5CE7', '🔧', 1),
  ('fest',      'Fest',      '#FD79A8', '🎉', 2),
  ('seminar',   'Seminar',   '#00CEC9', '🎤', 3),
  ('sports',    'Sports',    '#FDCB6E', '⚽', 4),
  ('cultural',  'Cultural',  '#E17055', '🎭', 5),
  ('hackathon', 'Hackathon', '#00B894', '💻', 6),
  ('club-meet', 'Club Meet', '#A29BFE', '🤝', 7),
  ('other',     'Other',     '#636E72', '📌', 8)
on conflict (id) do nothing;

-- ---------- Profiles ----------
-- One row per auth user. `role` is the authorization source of truth and is
-- protected from self-escalation by the trigger further down.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  role        text not null default 'viewer'
                check (role in ('viewer', 'organizer', 'admin')),
  avatar_url  text,
  club        text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Events ----------
create table if not exists public.events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (length(trim(title)) > 0),
  description       text not null check (length(trim(description)) > 0),
  category          text not null references public.categories(id),
  date_start        timestamptz not null,
  date_end          timestamptz,
  location          text,
  is_online         boolean not null default false,
  online_link       text,
  cover_image       text,
  organizer_id      uuid not null references public.profiles(id) on delete cascade,
  organizer         text not null,
  contact_email     text,
  contact_phone     text,
  registration_link text,
  rsvp_enabled      boolean not null default false,
  capacity          int check (capacity is null or capacity > 0),
  tags              text[] not null default '{}',
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  is_verified       boolean not null default false,
  view_count        int not null default 0,
  rsvp_count        int not null default 0,
  created_at        timestamptz not null default now(),
  -- The app validated this client-side; enforce it in the database too.
  constraint events_end_after_start check (date_end is null or date_end > date_start)
);

create index if not exists events_status_date_idx on public.events (status, date_start);
create index if not exists events_organizer_idx   on public.events (organizer_id);

-- ---------- RSVPs ----------
-- One row per person per event; the unique constraint is what makes
-- double-RSVP impossible no matter what the client does.
create table if not exists public.rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id)   on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ============================================================
-- Triggers
-- ============================================================

-- New auth user -> profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block privilege escalation: nobody may change their own role or verified
-- flag. Only an existing admin can promote someone.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  if new.role is distinct from old.role
     or new.is_verified is distinct from old.is_verified then
    select role into caller_role from public.profiles where id = auth.uid();
    if coalesce(caller_role, 'viewer') <> 'admin' then
      raise exception 'Only an admin can change role or verification status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- Block self-approval: an organizer cannot move their own event to approved.
create or replace function public.guard_event_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role text;
begin
  if new.status is distinct from old.status then
    select role into caller_role from public.profiles where id = auth.uid();
    if coalesce(caller_role, 'viewer') <> 'admin' then
      raise exception 'Only an admin can change event status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists events_guard_status on public.events;
create trigger events_guard_status
  before update on public.events
  for each row execute function public.guard_event_status();

-- Keep events.rsvp_count in sync, and refuse RSVPs beyond capacity.
create or replace function public.sync_rsvp_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cap int;
  current_count int;
begin
  if tg_op = 'INSERT' then
    select capacity, rsvp_count into cap, current_count
      from public.events where id = new.event_id for update;
    if cap is not null and current_count >= cap then
      raise exception 'This event is full';
    end if;
    update public.events set rsvp_count = rsvp_count + 1 where id = new.event_id;
    return new;
  else
    update public.events
       set rsvp_count = greatest(0, rsvp_count - 1)
     where id = old.event_id;
    return old;
  end if;
end;
$$;

drop trigger if exists rsvps_sync_count on public.rsvps;
create trigger rsvps_sync_count
  after insert or delete on public.rsvps
  for each row execute function public.sync_rsvp_count();

-- ============================================================
-- Row Level Security
-- The publishable key is public, so these policies — not the UI — are what
-- actually protect the data.
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.events     enable row level security;
alter table public.rsvps      enable row level security;
alter table public.categories enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_post()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role in ('organizer', 'admin')
  );
$$;

-- Categories: readable by anyone, writable by no one through the API.
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);

-- Profiles: publicly readable (organizer names appear on cards).
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Events: approved ones are public; your own and admins' views are broader.
drop policy if exists events_read on public.events;
create policy events_read on public.events for select
  using (status = 'approved' or organizer_id = auth.uid() or public.is_admin());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert
  with check (
    organizer_id = auth.uid()
    and public.can_post()
    and status = 'pending'   -- everything enters the moderation queue
  );

drop policy if exists events_update on public.events;
create policy events_update on public.events for update
  using (organizer_id = auth.uid() or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_admin());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete
  using (organizer_id = auth.uid() or public.is_admin());

-- RSVPs: you may only ever see and touch your own.
drop policy if exists rsvps_read_own on public.rsvps;
create policy rsvps_read_own on public.rsvps for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists rsvps_insert_own on public.rsvps;
create policy rsvps_insert_own on public.rsvps for insert
  with check (user_id = auth.uid());

drop policy if exists rsvps_delete_own on public.rsvps;
create policy rsvps_delete_own on public.rsvps for delete
  using (user_id = auth.uid());

-- Storage lives in 0003_storage.sql (needs different privileges).
