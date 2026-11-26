-- Presets ("תבניות") that Nir and editors build themselves: a name, an icon, the gear
-- (catalog model names, so a template can include gear not yet in the warehouse),
-- default hours and notes for the crew.
alter table public.spec_presets
  add column if not exists icon text not null default 'sound',
  add column if not exists setup_time time,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists notes text;
comment on column public.spec_presets.items is '[{ "category": text, "name": text, "quantity": int }] (catalog model names; resolved to equipment rows when loaded into an event)';
