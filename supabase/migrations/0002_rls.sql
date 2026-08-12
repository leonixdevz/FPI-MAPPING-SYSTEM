-- ============================================================================
-- 0002_rls.sql — Row Level Security
--
-- Model (matches the spec):
--   * Anonymous visitors: read-only access to *public* rows
--     (schools.is_public = true, media.is_public = true, all site_features).
--   * Administrators (emails in public.admins): full read/write.
--   * No anonymous writes, ever.
-- ============================================================================

-- The admin predicate used by every write policy. `auth.jwt() ->> 'email'`
-- is the signed-in user's email; `security definer` lets the function read
-- admins even though RLS protects that table.
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.admins a
    where a.email = auth.jwt() ->> 'email'
  );
$$;

-- ---------------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------------
alter table public.schools enable row level security;

drop policy if exists "Public read public schools" on public.schools;
create policy "Public read public schools" on public.schools
  for select using (is_public = true);

drop policy if exists "Admin full access to schools" on public.schools;
create policy "Admin full access to schools" on public.schools
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------
alter table public.media enable row level security;

drop policy if exists "Public read public media" on public.media;
create policy "Public read public media" on public.media
  for select using (is_public = true);

drop policy if exists "Admin full access to media" on public.media;
create policy "Admin full access to media" on public.media
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_features — public map content (buildings, roads, facilities), so
-- everyone may read; only administrators write.
-- ---------------------------------------------------------------------------
alter table public.site_features enable row level security;

drop policy if exists "Public read site features" on public.site_features;
create policy "Public read site features" on public.site_features
  for select using (true);

drop policy if exists "Admin full access to site features" on public.site_features;
create policy "Admin full access to site features" on public.site_features
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admins — the allow-list itself is locked down; administrators may view it,
-- nobody else (writes happen via SQL migrations or the dashboard).
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;

drop policy if exists "Admins can view admin list" on public.admins;
create policy "Admins can view admin list" on public.admins
  for select using (public.is_admin());
