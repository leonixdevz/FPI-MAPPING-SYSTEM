-- ============================================================================
-- 0001_schema.sql — tables, constraints, triggers
-- Phase K: Supabase backend for the Interactive School Mapping System.
-- Run via the Supabase SQL editor or `npx supabase db push`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admins — the email allow-list that grants write access via RLS.
-- A Supabase Auth user with one of these emails is an administrator.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- site_features — spec Section 14. Created before media so media can
-- reference it with a foreign key.
-- ---------------------------------------------------------------------------
create table if not exists public.site_features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feature_type text not null check (
    feature_type in ('building', 'road', 'facility', 'open_space', 'other')
  ),
  description text not null default '',
  latitude double precision not null check (latitude >= -90 and latitude <= 90),
  longitude double precision not null check (longitude >= -180 and longitude <= 180),
  geometry jsonb, -- GeoJSON; unused by the MVP, kept for future work
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- schools — spec Section 6. camelCase fields in the app map to snake_case
-- columns here (see src/types/school.ts for the mapping table).
-- ---------------------------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_type text not null check (
    school_type in ('public', 'private', 'mission', 'community', 'other')
  ),
  education_level text check (
    education_level in ('primary', 'junior_secondary', 'senior_secondary', 'vocational', 'tertiary', 'other')
  ),
  address text not null default '',
  latitude double precision not null check (latitude >= -90 and latitude <= 90),
  longitude double precision not null check (longitude >= -180 and longitude <= 180),
  capacity integer not null default 0 check (capacity >= 0),
  facilities text[] not null default '{}',
  topography text not null default '',
  noise_information text not null default '',
  description text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schools_is_public on public.schools (is_public);
create index if not exists idx_schools_name on public.schools (lower(name));

-- ---------------------------------------------------------------------------
-- media — spec Section 12. lat/lng are nullable: the spec forbids forcing
-- coordinates on assets that have no reliable GPS metadata.
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  media_type text not null check (
    media_type in ('satellite', 'drone_image', 'drone_video', 'site_photo')
  ),
  file_url text not null, -- Supabase Storage public URL, app-relative /media path, or external URL
  thumbnail_url text,
  latitude double precision check (latitude >= -90 and latitude <= 90),
  longitude double precision check (longitude >= -180 and longitude <= 180),
  feature_id uuid references public.site_features (id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_is_public on public.media (is_public);

-- ---------------------------------------------------------------------------
-- updated_at trigger — keeps timestamps honest on UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schools_set_updated_at on public.schools;
create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

drop trigger if exists site_features_set_updated_at on public.site_features;
create trigger site_features_set_updated_at
  before update on public.site_features
  for each row execute function public.set_updated_at();
