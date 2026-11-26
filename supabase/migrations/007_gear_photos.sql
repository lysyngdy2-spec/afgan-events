-- Gear from a photo: any member can photograph a piece of gear and add it to the
-- warehouse. The photo becomes the front face of its isometric object in the app.
alter table public.equipment
  add column if not exists photo_url text,
  add column if not exists tone text check (tone is null or tone ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists catalog_group text,
  add column if not exists added_by uuid references public.profiles on delete set null;

drop policy if exists equipment_member_insert on public.equipment;
create policy equipment_member_insert on public.equipment for insert
  with check (
    public.is_member() and added_by = auth.uid()
    and char_length(name) between 1 and 80 and quantity between 1 and 999
    and category in ('מיקסרים ושולחנות','רמקולים ומערכות','סאבים','מוניטורים','מיקרופונים','מקורות ונגנים','תאורה','מסכי לד ווידאו','במות, טראסים ותלייה','חשמל וכבילה','קשר והפקה')
    and (photo_url is null or photo_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/equipment/' || auth.uid()::text || '/[0-9a-f-]{36}\.(webp|jpg)$'))
  );

-- Public bucket for gear photos (only gear, never people). Small webp/jpeg only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment', 'equipment', true, 1572864, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists equipment_photo_insert on storage.objects;
create policy equipment_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists equipment_photo_admin on storage.objects;
create policy equipment_photo_admin on storage.objects for delete to authenticated
  using (bucket_id = 'equipment' and public.is_admin());
