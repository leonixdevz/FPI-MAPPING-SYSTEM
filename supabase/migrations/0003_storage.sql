-- ============================================================================
-- 0003_storage.sql — media storage bucket
--
-- Public bucket: files are served over the public object URL
-- (…/storage/v1/object/public/school-media/…). Only administrators can
-- upload new files.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('school-media', 'school-media', true)
on conflict (id) do nothing;

-- Everyone may read files in the bucket (also enforced by the public URL).
drop policy if exists "Public read school-media" on storage.objects;
create policy "Public read school-media" on storage.objects
  for select using (bucket_id = 'school-media');

-- Only administrators may upload. Storage policies can call the same
-- public.is_admin() predicate used by the table policies.
drop policy if exists "Admin upload to school-media" on storage.objects;
create policy "Admin upload to school-media" on storage.objects
  for insert
  with check (bucket_id = 'school-media' and public.is_admin());

drop policy if exists "Admin delete from school-media" on storage.objects;
create policy "Admin delete from school-media" on storage.objects
  for delete using (bucket_id = 'school-media' and public.is_admin());
