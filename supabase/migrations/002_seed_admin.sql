-- First admin. Add Nir from the Team screen after signing in.
insert into public.members (email, name, role, can_edit_events)
values ('lysyngdy44@gmail.com', 'אלישי', 'admin', true)
on conflict (email) do nothing;
