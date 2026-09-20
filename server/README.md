# FPI Campus Server — Express + PostGIS API

Backend for the Federal Polytechnic Ilaro campus mapping system: a REST API
over a **PostgreSQL/PostGIS** spatial database, serving both the public map
and the guarded admin CRUD dashboard.

```
QGIS → GeoJSON (map_interface/public/data)
        │  pnpm db:seed   (scripts/seed.js)
        ▼
PostgreSQL + PostGIS  ←──  Express API (this package)
        ▲                     │
        │                     ├── GET  /api/features, /api/boundary   → public web map
        │                     └── POST/PUT/DELETE /api/admin/*        → admin dashboard
        └──────── auth (Bearer token) ────────────────┘
```

## Requirements

- Node.js ≥ 20 (pnpm)
- A running PostgreSQL 16 with the **PostGIS** extension — easiest via the
  root [`docker-compose.yml`](../docker-compose.yml), or a native install
  (e.g. `postgresql-16-postgis-3` on Ubuntu) with a database/user matching
  `DATABASE_URL`.

## Quick start

```bash
# 1. (docker route) start the database
docker compose up -d
#    (native route) create the database + role yourself, e.g.:
#    createdb fpi_campus  &&  psql -d fpi_campus -c 'CREATE EXTENSION postgis;'

# 2. install dependencies
pnpm install

# 3. create the schema, then load the GeoJSON exports
pnpm db:migrate     # runs db/schema.sql  (DESTRUCTIVE — drops feature tables)
pnpm db:seed        # imports buildings/roads/walkways/boundary from GeoJSON

# 4. run the API (default http://localhost:4000)
pnpm dev            # or: pnpm start
```

Configuration is read from environment variables (see `.env.example`).
Defaults match `docker-compose.yml`, so no `.env` is required for the happy
path.

## Development with the web app

The Vite dev server proxies `/api` to `http://localhost:4000`
(see `map_interface/vite.config.ts`), so run the API and `pnpm dev` inside
`map_interface/` together. For a production-style run, build the web app
(`pnpm --dir ../map_interface build`) and start this server — Express then
serves the built app **and** the API on the same port.

## API reference

Public (no auth):

| Method | Endpoint          | Description                                   |
|--------|-------------------|-----------------------------------------------|
| GET    | `/api/health`     | `{ status, db }` probe used by the UI banner  |
| GET    | `/api/features`   | Every feature as one GeoJSON FeatureCollection |
| GET    | `/api/boundary`   | Campus boundary polygon (FeatureCollection)   |

Auth (`POST /api/auth/login` with `ADMIN_USERNAME`/`ADMIN_PASSWORD` returns
a bearer token; pass it as `Authorization: Bearer <token>`):

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/auth/login`         | Issue a session token              |
| POST   | `/api/auth/logout`        | Revoke the current token           |
| GET    | `/api/admin/stats`        | Feature counts per layer           |
| GET    | `/api/admin/features`     | Full feature list incl. geometry   |
| POST   | `/api/admin/features`     | Create a feature                   |
| PUT    | `/api/admin/features/:id` | Update attributes / geometry       |
| DELETE | `/api/admin/features/:id` | Delete a feature (`?layer=…`)      |

Feature payloads are GeoJSON features with `{ layer, name, type,
description, highway?, tags?, geometry }`, where `layer` is one of
`building | road | walkway | entrance`.

## Spatial schema

Tables (all in SRID 4326, GiST-indexed on `geometry`):

- `buildings`  — `geometry(Polygon,4326)`
- `roads`      — `geometry(LineString,4326)`  (primary/secondary/residential/service…)
- `walkways`   — `geometry(LineString,4326)`  (footways/paths)
- `entrances`  — `geometry(Point,4326)`       (gates, entrances — admin-managed)
- `campus_boundary` — single polygon row framing the map

`scripts/seed.js` reloads the QGIS/GeoJSON exports and splits `path.geojson`
into `roads` and `walkways` by highway tag. Schema source of truth:
`db/schema.sql`.

## Notes & limitations

- Sessions live in server memory (12 h TTL) — tokens are lost on restart.
  Fine for a campus demonstration; swap in a persistent store for production.
- `pnpm db:migrate` drops and recreates the feature tables, so run
  `db:seed` afterwards.
