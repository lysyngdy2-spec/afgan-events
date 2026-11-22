-- Afgan S&L: schema + row level security.
-- Rule: workers never see money. Money lives in admin-only tables.

create extension if not exists pgcrypto;

-- Who may sign in. Nir adds people here from the Team screen.
create table public.members (
  email text primary key check (email = lower(email)),
  name text not null,
  role text not null default 'worker' check (role in ('admin','worker')),
  can_edit_events boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique references public.members(email) on update cascade,
  name text not null,
  phone text,
  calendar_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Admin-only pay rates.
create table public.rates (
  email text primary key references public.members(email) on delete cascade,
  rate_type text not null default 'day' check (rate_type in ('day','hour')),
  amount numeric(10,2) not null default 0
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.members m
  join public.profiles p on p.email = m.email
  where p.id = auth.uid() and m.active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null
$$;

create or replace function public.can_edit_events() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m join public.profiles p on p.email = m.email
    where p.id = auth.uid() and m.active and (m.role = 'admin' or m.can_edit_events)
  )
$$;

-- Create a profile on first Google sign in, only for invited emails.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  select * into m from public.members where email = lower(new.email) and active;
  if found then
    insert into public.profiles (id, email, name)
    values (new.id, m.email, m.name)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Also link users who signed in before Nir invited them.
create or replace function public.link_existing_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  select u.id, new.email, new.name from auth.users u
  where lower(u.email) = new.email
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_member_added
  after insert on public.members
  for each row execute function public.link_existing_user();

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  setup_time time,
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  contact_name text,
  contact_phone text,
  status text not null default 'confirmed' check (status in ('draft','confirmed','done','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Start/end as timestamps (end past midnight rolls to next day). Used for clash checks.
create or replace function public.event_range(e public.events) returns tstzrange
language sql stable as $$
  select tstzrange(
    ((e.event_date + coalesce(e.setup_time, e.start_time)) at time zone 'Asia/Jerusalem'),
    ((e.event_date + e.end_time + case when e.end_time <= e.start_time then interval '1 day' else interval '0' end) at time zone 'Asia/Jerusalem')
  )
$$;

create table public.event_finance (
  event_id uuid primary key references public.events on delete cascade,
  price numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','deposit','paid')),
  client_name text,
  client_phone text
);

create table public.event_staff (
  event_id uuid references public.events on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','confirmed','declined')),
  hours numeric(5,2),
  pay_override numeric(10,2),
  primary key (event_id, user_id)
);

-- Inventory: what Nir actually owns.
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  quantity int not null default 1 check (quantity >= 0),
  unique (category, name)
);

create table public.event_equipment (
  event_id uuid references public.events on delete cascade,
  equipment_id uuid references public.equipment on delete cascade,
  quantity int not null check (quantity > 0),
  primary key (event_id, equipment_id)
);

-- External vendors (LED installers, stage, rigging...)
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  phone text
);

create table public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  vendor_id uuid references public.vendors on delete set null,
  type text not null,
  name text not null,
  arrival_time time,
  cost numeric(10,2) not null default 0,
  paid_by text not null default 'us' check (paid_by in ('us','client')),
  status text not null default 'pending' check (status in ('pending','confirmed'))
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete set null,
  description text not null,
  amount numeric(10,2) not null,
  spent_on date not null default current_date
);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.rates enable row level security;
alter table public.events enable row level security;
alter table public.event_finance enable row level security;
alter table public.event_staff enable row level security;
alter table public.equipment enable row level security;
alter table public.event_equipment enable row level security;
alter table public.vendors enable row level security;
alter table public.event_vendors enable row level security;
alter table public.expenses enable row level security;
alter table public.push_subscriptions enable row level security;

create or replace function public.is_on_event(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_staff where event_id = eid and user_id = auth.uid())
$$;

-- members: everyone signed in sees the team list; only admin changes it
create policy members_read on public.members for select using (public.is_member());
create policy members_admin on public.members for all using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy profiles_read on public.profiles for select using (public.is_member());
create policy profiles_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- money: admin only
create policy rates_admin on public.rates for all using (public.is_admin()) with check (public.is_admin());
create policy finance_admin on public.event_finance for all using (public.is_admin()) with check (public.is_admin());
create policy expenses_admin on public.expenses for all using (public.is_admin()) with check (public.is_admin());
create policy vendors_admin on public.vendors for all using (public.is_admin()) with check (public.is_admin());
create policy event_vendors_admin on public.event_vendors for all using (public.is_admin()) with check (public.is_admin());

-- events: editors see all; workers see the events they are on
create policy events_read on public.events for select using (public.can_edit_events() or public.is_on_event(id));
create policy events_write on public.events for all using (public.can_edit_events()) with check (public.can_edit_events());

create policy staff_read on public.event_staff for select using (public.can_edit_events() or public.is_on_event(event_id));
create policy staff_write on public.event_staff for all using (public.can_edit_events()) with check (public.can_edit_events());
-- a worker answers for themself only (column limits enforced by trigger below)
create policy staff_answer on public.event_staff for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.staff_answer_guard() returns trigger
language plpgsql as $$
begin
  if not public.can_edit_events() then
    if new.event_id <> old.event_id or new.user_id <> old.user_id
       or new.hours is distinct from old.hours or new.pay_override is distinct from old.pay_override then
      raise exception 'workers can only change their answer';
    end if;
  end if;
  return new;
end $$;
create trigger staff_answer_guard before update on public.event_staff
  for each row execute function public.staff_answer_guard();

create policy equipment_read on public.equipment for select using (public.is_member());
create policy equipment_admin on public.equipment for all using (public.is_admin()) with check (public.is_admin());

create policy event_equipment_read on public.event_equipment for select using (public.can_edit_events() or public.is_on_event(event_id));
create policy event_equipment_write on public.event_equipment for all using (public.can_edit_events()) with check (public.can_edit_events());

create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Vendors without money, for the crew on that event.
create or replace function public.event_vendor_info(eid uuid)
returns table (type text, name text, arrival_time time, status text)
language sql stable security definer set search_path = public as $$
  select v.type, v.name, v.arrival_time, v.status from public.event_vendors v
  where v.event_id = eid and (public.can_edit_events() or public.is_on_event(eid))
  order by v.arrival_time nulls last
$$;

-- Who is double-booked: staff on overlapping events.
create or replace function public.staff_clashes(p_date date, p_setup time, p_start time, p_end time, p_exclude uuid default null)
returns table (user_id uuid, event_title text)
language sql stable security definer set search_path = public as $$
  with r as (
    select tstzrange(
      (p_date + coalesce(p_setup, p_start)) at time zone 'Asia/Jerusalem',
      (p_date + p_end + case when p_end <= p_start then interval '1 day' else interval '0' end) at time zone 'Asia/Jerusalem'
    ) as rng
  )
  select s.user_id, e.title from public.events e
  join public.event_staff s on s.event_id = e.id, r
  where public.can_edit_events() and e.status <> 'cancelled'
    and (p_exclude is null or e.id <> p_exclude)
    and s.status <> 'declined'
    and public.event_range(e) && r.rng
$$;

-- How much of each item is already booked at that time.
create or replace function public.equipment_booked(p_date date, p_setup time, p_start time, p_end time, p_exclude uuid default null)
returns table (equipment_id uuid, booked bigint)
language sql stable security definer set search_path = public as $$
  with r as (
    select tstzrange(
      (p_date + coalesce(p_setup, p_start)) at time zone 'Asia/Jerusalem',
      (p_date + p_end + case when p_end <= p_start then interval '1 day' else interval '0' end) at time zone 'Asia/Jerusalem'
    ) as rng
  )
  select ee.equipment_id, sum(ee.quantity) from public.events e
  join public.event_equipment ee on ee.event_id = e.id, r
  where public.can_edit_events() and e.status <> 'cancelled'
    and (p_exclude is null or e.id <> p_exclude)
    and public.event_range(e) && r.rng
  group by ee.equipment_id
$$;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.handle_new_user() from authenticated, anon, public;
revoke execute on function public.link_existing_user() from authenticated, anon, public;
