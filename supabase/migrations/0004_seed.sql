-- ============================================================================
-- 0004_seed.sql — demo data + reset RPC
--
-- Seeds the same placeholder data the local adapter seeds:
--   * the demo admin email (create the matching Auth user in the dashboard),
--   * one placeholder school marked TODO at the temporary map centre,
--   * the curated site media (drone screencast + five screenshots) served
--     from the app itself at /media/... — the same files public/media/
--     serves in local mode. If the app is hosted elsewhere, re-upload these
--     files to the school-media bucket and update the URLs.
--
-- The reset_demo_data() RPC powers the admin dashboard's "Reset demo data"
-- button on the Supabase backend.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The seed itself, defined once so both the migration and the reset RPC can
-- use it.
-- ---------------------------------------------------------------------------
create or replace function public.seed_demo_data() returns void
language sql security definer as $$
  insert into public.admins (email) values ('admin@school.local')
  on conflict (email) do nothing;

  insert into public.schools (
    id, name, school_type, education_level, address, latitude, longitude,
    capacity, facilities, topography, noise_information, description, is_public
  ) values (
    '00000000-0000-4000-8000-000000000001',
    'Sample School (placeholder — replace with real records)',
    'public', 'senior_secondary',
    'TODO: REQUIRED PROJECT GIS DATA — enter the real school address',
    6.828, 3.09, 0, '{}',
    'TODO: enter real topography description',
    'TODO: enter real noise context',
    'Placeholder school record seeded so the map has something to render. ' ||
    'Replace with real records through the admin dashboard. ' ||
    'See TODO: REQUIRED PROJECT GIS DATA.',
    true
  )
  on conflict (id) do nothing;

  insert into public.media (id, title, description, media_type, file_url, thumbnail_url, is_public)
  values
    (
      '00000000-0000-4000-8000-000000000101',
      'Drone site tour — screencast (2026-08-11)',
      'Screen capture of the site exploration flight (~170 s, 1600×900). Non-georeferenced screen capture used as visual site evidence.',
      'drone_video', '/media/site-tour-2026-08-11.mp4', '/media/captures/site-221205.png', true
    ),
    (
      '00000000-0000-4000-8000-000000000102',
      'Site capture — 22:03 (2026-08-11)',
      'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
      'site_photo', '/media/captures/site-220320.png', null, true
    ),
    (
      '00000000-0000-4000-8000-000000000103',
      'Site capture — 22:04 (2026-08-11)',
      'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
      'site_photo', '/media/captures/site-220437.png', null, true
    ),
    (
      '00000000-0000-4000-8000-000000000104',
      'Site capture — 22:06 (2026-08-11)',
      'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
      'site_photo', '/media/captures/site-220640.png', null, true
    ),
    (
      '00000000-0000-4000-8000-000000000105',
      'Site capture — 22:09 (2026-08-11)',
      'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
      'site_photo', '/media/captures/site-220919.png', null, true
    ),
    (
      '00000000-0000-4000-8000-000000000106',
      'Site capture — 22:12 (2026-08-11)',
      'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
      'site_photo', '/media/captures/site-221205.png', null, true
    )
  on conflict (id) do nothing;
$$;

-- ---------------------------------------------------------------------------
-- Reset RPC — deletes every record and re-seeds. Only administrators may
-- call it (the guard runs before any destructive statement).
-- ---------------------------------------------------------------------------
create or replace function public.reset_demo_data() returns void
language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reset demo data.';
  end if;
  delete from public.media;
  delete from public.schools;
  delete from public.site_features;
  perform public.seed_demo_data();
end;
$$;

-- Seed the database on first apply.
select public.seed_demo_data();

-- seed_demo_data runs with definer privileges; it is only meant to be
-- invoked by reset_demo_data (a security definer function, so it still
-- works) and by this migration. Block direct public/authenticated calls.
revoke execute on function public.seed_demo_data() from anon, authenticated;
