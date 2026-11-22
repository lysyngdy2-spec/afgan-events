-- Saved equipment specs ("decks") that can be loaded into an event.
create table if not exists public.spec_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  items jsonb not null default '[]',  -- [{ "equipment_id": uuid, "quantity": int }]
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.spec_presets enable row level security;
drop policy if exists spec_presets_edit on public.spec_presets;
create policy spec_presets_edit on public.spec_presets for all
  using (public.can_edit_events()) with check (public.can_edit_events());
grant select, insert, update, delete on public.spec_presets to authenticated;
