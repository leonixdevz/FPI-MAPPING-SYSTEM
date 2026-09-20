-- ============================================================
-- Federal Polytechnic Ilaro — Campus Mapping System
-- PostGIS spatial database schema
--
-- The runtime spatial database. Base layers (buildings, roads,
-- walkways, boundary) are imported from QGIS/GeoJSON exports by
-- `scripts/seed.js`; entrances and subsequent edits are managed
-- through the admin dashboard (CRUD API).
--
-- NOTE: this file is intentionally destructive (DROP + CREATE) so
-- a demo environment can be reset reliably. Run via:
--   pnpm db:migrate
-- The docker-compose service also executes it on first boot.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- Keeps updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Buildings — polygon footprints of campus buildings/structures
-- ------------------------------------------------------------
DROP TABLE IF EXISTS buildings CASCADE;
CREATE TABLE buildings (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text,
  type        text,                    -- e.g. 'Academic Building', 'Hostel'
  description text,
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- extra attributes (OSM tags, etc.)
  geometry    geometry(Polygon, 4326) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buildings_geom ON buildings USING GIST (geometry);
CREATE TRIGGER trg_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Roads — vehicular roads (primary, secondary, residential, ...)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS roads CASCADE;
CREATE TABLE roads (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text,
  type        text,                    -- usually null; populated by admins if needed
  description text,
  highway     text,                    -- road classification, e.g. 'residential'
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry    geometry(LineString, 4326) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roads_geom ON roads USING GIST (geometry);
CREATE TRIGGER trg_roads_updated_at
  BEFORE UPDATE ON roads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Walkways — footways and pedestrian paths
-- ------------------------------------------------------------
DROP TABLE IF EXISTS walkways CASCADE;
CREATE TABLE walkways (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text,
  type        text,
  description text,
  highway     text,                    -- e.g. 'footway'
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry    geometry(LineString, 4326) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_walkways_geom ON walkways USING GIST (geometry);
CREATE TRIGGER trg_walkways_updated_at
  BEFORE UPDATE ON walkways
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Entrances — point features (gates, building entrances, ...)
-- Added and maintained through the admin dashboard.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS entrances CASCADE;
CREATE TABLE entrances (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text,
  type        text,                    -- e.g. 'Main Gate', 'Building Entrance'
  description text,
  tags        jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry    geometry(Point, 4326) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entrances_geom ON entrances USING GIST (geometry);
CREATE TRIGGER trg_entrances_updated_at
  BEFORE UPDATE ON entrances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Campus boundary — single polygon delimiting the campus.
-- Used for initial view, panning constraints and the mask layer.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS campus_boundary CASCADE;
CREATE TABLE campus_boundary (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name        text,
  geometry    geometry(Polygon, 4326) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
