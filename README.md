# FPI Campus Mapping System

A web-based **spatial information management system** for Federal Polytechnic
Ilaro: an interactive campus map (view, search, identify buildings, roads,
facilities) backed by a **PostgreSQL/PostGIS** spatial database with an
**Express REST API** and an **admin dashboard** for full CRUD management of
campus features.

```
QGIS (data preparation)
   │  export → GeoJSON   (map_interface/public/data)
   ▼
PostgreSQL/PostGIS ── Express API (server/) ── React web map (public)
   ▲                          │                   + React admin dashboard
   └──── seed + admin CRUD ───┘
```

## Repository layout

| Path | What it is |
|---|---|
| `map_interface/` | React + TypeScript + Vite + Leaflet web app (public map **and** admin dashboard at `#/admin`) |
| `server/` | Node/Express REST API over PostGIS (public reads + guarded CRUD) |
| `server/db/schema.sql` | PostGIS schema (buildings, roads, walkways, entrances, boundary) |
| `server/scripts/` | `migrate.js` (apply schema) and `seed.js` (import GeoJSON → PostGIS) |
| `docker-compose.yml` | One-command PostGIS 16 database |
| `bounding_box_fpi.py`, `scrape_base_data.py`, `compilation.txt` | Data-acquisition tooling (Overpass API + FPI website crawler + QGIS query) |
| `PROJECT_DOCUMENTATION.md` | Full system documentation (project/methodology write-up) |
| `SYSTEM_DIAGRAMS.md` | Mermaid sources for the Chapter 3 diagrams (DFD L0/L1, E-R, flowchart) — rendered to `figures/fig-3-*.png` |

## Quick start

```bash
# 1. Database (Docker route)
docker compose up -d
#    or native PostgreSQL 16 + PostGIS: create role/db matching server/.env

# 2. Backend API
cd server
pnpm install
pnpm db:setup          # migrate + seed from GeoJSON exports
pnpm dev               # API on http://localhost:4000

# 3. Web app (another terminal)
cd map_interface
pnpm install
pnpm dev               # open http://localhost:5173
```

The public map loads from `/api/features` (via the Vite dev proxy). Open
**http://localhost:5173/#/admin** for the admin dashboard — default
credentials `admin` / `admin123` (override with `ADMIN_USERNAME` /
`ADMIN_PASSWORD`).

**Production-style single-port run:** `pnpm --dir map_interface build`, then
`pnpm --dir server start` — Express serves the built app and the API together
on port 4000.

See `server/README.md` for API details and the feature data model.
