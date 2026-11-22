-- Google Calendar event id, so edits update the same calendar entry.
alter table public.events add column if not exists google_event_id text;
