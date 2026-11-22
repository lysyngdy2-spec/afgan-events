-- 1) Hardening: users may only edit their own name/phone, never their email
--    (changing email would let a worker take over another member's role),
--    and nobody can read anyone's calendar token directly.
revoke update on public.profiles from authenticated, anon;
grant update (name, phone) on public.profiles to authenticated;
revoke select on public.profiles from authenticated, anon;
grant select (id, email, name, phone, created_at) on public.profiles to authenticated;

-- The signed-in user's own private calendar token.
create or replace function public.my_calendar_token() returns uuid
language sql stable security definer set search_path = public as $$
  select calendar_token from public.profiles where id = auth.uid()
$$;
revoke all on function public.my_calendar_token() from public, anon;
grant execute on function public.my_calendar_token() to authenticated;

-- New token if a link leaked; old subscriptions stop working.
create or replace function public.rotate_calendar_token() returns uuid
language sql volatile security definer set search_path = public as $$
  update public.profiles set calendar_token = gen_random_uuid()
  where id = auth.uid() returning calendar_token
$$;
revoke all on function public.rotate_calendar_token() from public, anon;
grant execute on function public.rotate_calendar_token() to authenticated;

-- 2) Calendar feed for one person, looked up by their secret token.
--    Workers get events they're assigned to (not declined); admins get all.
--    No money, no client details.
create or replace function public.calendar_feed(p_token uuid)
returns table (id uuid, title text, starts timestamptz, ends timestamptz, setup_time time,
               location text, notes text, status text, my_status text, updated_at timestamptz, crew text)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, lower(public.event_range(e)), upper(public.event_range(e)), e.setup_time,
         e.location, e.notes, e.status, s.status, e.updated_at,
         (select string_agg(p2.name, ', ' order by p2.name)
            from public.event_staff s2 join public.profiles p2 on p2.id = s2.user_id
           where s2.event_id = e.id and s2.status <> 'declined')
  from public.profiles p
  join public.members m on m.email = p.email and m.active
  join public.events e on e.status <> 'draft' and e.event_date >= current_date - 60
  left join public.event_staff s on s.event_id = e.id and s.user_id = p.id
  where p.calendar_token = p_token
    and (m.role = 'admin' or (s.user_id is not null and s.status <> 'declined'))
  order by e.event_date
$$;
revoke all on function public.calendar_feed(uuid) from public;
grant execute on function public.calendar_feed(uuid) to anon, authenticated;
