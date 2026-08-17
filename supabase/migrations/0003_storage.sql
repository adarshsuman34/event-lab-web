-- ============================================================
-- Storage bucket for event poster images.
--
-- Run this AFTER creating the bucket in the dashboard:
--   Storage → New bucket → name: event-covers → Public: ON → Save
--
-- The bucket row itself is created through the UI because storage.buckets
-- and storage.objects are owned by supabase_storage_admin, and the SQL
-- Editor's role often cannot write to them directly.
-- ============================================================

-- Enforce the size/type limits server-side (the UI does not set these).
update storage.buckets
   set public             = true,
       file_size_limit    = 5242880,  -- 5MB, matching the client-side check
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'event-covers';

-- Anyone may view posters; only approved organizers may upload.
drop policy if exists covers_read on storage.objects;
create policy covers_read on storage.objects for select
  using (bucket_id = 'event-covers');

drop policy if exists covers_insert on storage.objects;
create policy covers_insert on storage.objects for insert
  with check (bucket_id = 'event-covers' and public.can_post());

drop policy if exists covers_delete on storage.objects;
create policy covers_delete on storage.objects for delete
  using (bucket_id = 'event-covers' and (owner = auth.uid() or public.is_admin()));

-- Verify:
-- select id, public, file_size_limit from storage.buckets where id = 'event-covers';
