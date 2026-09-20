# Federal Polytechnic Ilaro — Campus Spatial Information Management System
## Full Project Documentation (for Chapter 3 / Methodology Write-up)

---

## 1. Project Overview

**Title:** Design and implementation of a web-based spatial information
management system for Federal Polytechnic Ilaro.

**Purpose:** To develop an interactive web system that stores campus
buildings, roads, walkways and facilities in a **spatial database
(PostgreSQL/PostGIS)** and exposes them through a **public web map** (view,
search, locate, identify) plus an **administrative dashboard** that lets
authorized users **Create, Read, Update and Delete** campus features
(CRUD) — including their geographic geometries.

The system therefore goes beyond a static map viewer: it is a live,
database-driven **campus spatial information management system**.

**Domain:** `federalpolyilaro.edu.ng`
**Approximate Campus Coordinates:** Latitude 6.894°N, Longitude 2.985°E
**Bounding Box (used for data queries):** (6.88, 2.96) to (6.91, 3.01)

### 1.1 Project Objectives (as implemented)

1. Design and implement a **spatial database** (PostgreSQL + PostGIS) for
   storing and managing the geographic and attribute information of selected
   campus features.
2. Develop an **administrative interface** that enables authorized users to
   **create, retrieve, update and delete** campus spatial features (CRUD),
   including on-map geometry drawing.
3. Build an **interactive public web map** over the same data source —
   pan/zoom, building identification, road/walkway display, search and
   user geolocation.

---

## 2. System Architecture

```
                    ┌────────────────────┐
                    │       QGIS         │   Data preparation (base layers)
                    │  (editing/exports) │
                    └─────────┬──────────┘
                              │  GeoJSON exports
                              ▼
                    ┌────────────────────┐
                    │ PostgreSQL/PostGIS │   Spatial database (source of truth)
                    │  buildings/roads/  │
                    │  walkways/entrances│
                    └─────────┬──────────┘
                              │  SQL (ST_AsGeoJSON etc.)
                              ▼
                    ┌────────────────────┐
                    │   Backend API      │   Express (Node.js) — REST + auth
                    └──────┬───────┬─────┘
             ┌─────────────┘       └──────────────┐
             ▼                                    ▼
   ┌──────────────────┐                 ┌──────────────────┐
   │  Public Web Map  │                 │ Admin Dashboard  │
   │  view + search   │                 │  CRUD operations │
   └──────────────────┘                 └──────────────────┘
```

**Data flow:** QGIS-prepared GeoJSON exports are imported into PostGIS by a
seed script (`server/scripts/seed.js`). The Express API reads features out of
PostGIS (using `ST_AsGeoJSON`) and serves them as GeoJSON to both front ends.
Admin mutations (create/update/delete) write back to PostGIS through the same
API. QGIS therefore remains the GIS **data preparation tool** while PostGIS is
the **live spatial database**.

---

## 3. Technology Stack

### Spatial Database (new)
| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Relational database server |
| PostGIS 3.4+ | Spatial extension — geometry types, GiST indexes, spatial functions (`ST_GeomFromGeoJSON`, `ST_AsGeoJSON`, `ST_SetSRID`). Docker image pins 3.4; verified on 3.6 |

### Backend API (new)
| Technology | Purpose |
|---|---|
| Node.js ≥ 20 | JavaScript runtime |
| Express 4 | HTTP routing / REST API |
| `pg` (node-postgres) | PostgreSQL client with parameterised queries |
| In-memory bearer-token sessions | Simple admin authentication (12 h TTL) |

### Frontend (Map Interface)
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.x | UI framework (public map + admin dashboard) |
| TypeScript | 6.0.x | Type-safe JavaScript |
| Vite | 8.2.x | Build tool and dev server (proxies `/api` to the backend) |
| Leaflet | 1.9.4 | Interactive map rendering library |
| react-leaflet | 5.0.x | React bindings for Leaflet |
| leaflet-draw | 1.0.4 | Drawing toolbar used by the admin geometry editor |
| ESLint | 10.9.x | Code linting |
| Inter font (Google Fonts) | — | UI typography |

### Data Collection & Processing (Python Scripts)
| Technology | Purpose |
|---|---|
| Python 3 | Scripting language |
| `requests` | HTTP requests to APIs and websites |
| `BeautifulSoup4` | HTML parsing for web scraping |
| `pandas` / `openpyxl` | Excel export of crawled facility inventory |
| Overpass API (OpenStreetMap) | Crowdsourced geospatial building/road data |

### Geospatial Data
| Format | Purpose |
|---|---|
| GeoJSON | Exchange format between QGIS exports, seed script and REST API |
| QGIS | Desktop GIS for boundary/feature editing and export |
| OpenStreetMap (OSM) | Source of base building/road geometry |

---

## 4. Project Directory Structure

```
School-Mapping-System/
├── docker-compose.yml          # One-command PostGIS database service
├── .env.example                # Environment variable template (API + DB + admin)
├── bounding_box_fpi.py         # Python: OSM/Overpass building+road data fetch
├── scrape_base_data.py         # Python: FPI website crawler (facility metadata)
├── compilation.txt             # Overpass QL query template for QGIS
├── PROJECT_DOCUMENTATION.md    # This document
│
├── server/                     # Express + PostGIS backend (NEW)
│   ├── package.json            # deps: express, pg
│   ├── .env.example
│   ├── README.md
│   ├── db/
│   │   └── schema.sql          # PostGIS schema (buildings, roads, walkways, entrances, boundary)
│   ├── scripts/
│   │   ├── migrate.js          # Applies schema.sql (destructive reset)
│   │   └── seed.js             # Imports GeoJSON exports into PostGIS
│   └── src/
│       ├── index.js            # Entry point (listen)
│       ├── app.js              # Express wiring: public API, auth, admin CRUD, static serving
│       ├── config.js           # Env-var configuration
│       ├── db.js               # pg Pool
│       ├── auth.js             # Login/logout + Bearer-token middleware
│       └── features.js         # Layer registry + row→GeoJSON helpers
│
└── map_interface/              # React web app (public map + admin dashboard)
    ├── package.json
    ├── vite.config.ts          # Dev proxy: /api → http://localhost:4000
    ├── tsconfig*.json / eslint.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── data/               # QGIS exports — IMPORT SOURCE for the seed script
    │       ├── buildings.geojson
    │       ├── path.geojson
    │       └── overall_boundary.geojson
    ├── src/
    │   ├── main.tsx / App.tsx  # App: hash routing + offline banner
    │   ├── api.ts              # Typed REST client + shared types (NEW)
    │   ├── App.css / index.css
    │   └── components/
    │       ├── Map.tsx         # Public map (API-driven, polygons+lines+points)
    │       ├── SearchBar.tsx   # Search across named features (API-driven)
    │       ├── BuildingInfo.tsx# Feature detail panel
    │       ├── MapControls.tsx # Zoom, reset, legend, locate-me
    │       └── admin/          # Admin dashboard (NEW)
    │           ├── AdminPage.tsx        # Login, stats, list, CRUD form
    │           ├── AdminMapEditor.tsx   # leaflet-draw geometry editor
    │           └── Admin.css
    └── dist/                   # Production build (served by Express in prod)
```

---

## 5. Data Collection Pipeline (unchanged — base data)

### 5.1 OpenStreetMap Extraction (`bounding_box_fpi.py`)
Overpass API query downloads `building` and `highway` ways inside the campus
bounding box; results become `buildings.geojson` and `path.geojson`.

### 5.2 Facility Metadata Scraping (`scrape_base_data.py`)
BFS crawler over `federalpolyilaro.edu.ng` extracts facility pages
(buildings, hostels, libraries, centres…) with descriptions and contacts;
categorised and deduplicated into an Excel inventory
(`fpi_buildings.xlsx`). This metadata enriches building attributes and is
maintained afterwards through the admin dashboard.

### 5.3 QGIS Boundary Creation (`compilation.txt`)
Campus boundary polygon is refined in QGIS and exported as
`overall_boundary.geojson`.

---

## 6. Spatial Database Design (implemented)

The runtime database lives in PostgreSQL with the PostGIS extension, in
SRID 4326 (WGS 84). Every geometry column is GiST-indexed for fast spatial
queries. `created_at`/`updated_at` timestamps are maintained by triggers.

### 6.1 Tables

| Table | Geometry | Contents |
|---|---|---|
| `buildings` | `Polygon` | Building footprint polygons |
| `roads` | `LineString` | Vehicular roads (primary, secondary, residential, service, …) |
| `walkways` | `LineString` | Footways and pedestrian paths |
| `entrances` | `Point` | Gates/entrances — added & managed via the admin dashboard |
| `campus_boundary` | `Polygon` | Single-row campus outline (view framing + panning constraint) |

### 6.2 `buildings` columns (common to feature tables)

| Column | Type | Notes |
|---|---|---|
| `id` | `integer` identity | Primary key |
| `name` | `text` | Human-readable name |
| `type` | `text` | e.g. `Academic Building`, `Main Gate` |
| `description` | `text` | Extra descriptive text |
| `highway` | `text` | Only on `roads`/`walkways` — classification tag |
| `tags` | `jsonb` | Loose attribute bag (OSM tags, `osm_id` provenance, …) |
| `geometry` | `geometry(…, 4326)` | The actual spatial shape/location |
| `created_at` / `updated_at` | `timestamptz` | Audit timestamps (trigger-maintained) |

### 6.3 Seeding (`server/scripts/seed.js`)

The seed script imports the QGIS/GeoJSON exports into PostGIS:

| GeoJSON export | Destination |
|---|---|
| `buildings.geojson` (42 polygons) | `buildings` |
| `path.geojson` — non-pedestrian highways | `roads` (46) |
| `path.geojson` — footways/paths | `walkways` (8) |
| `overall_boundary.geojson` | `campus_boundary` (1 row) |
| — (initially empty) | `entrances` — populated through the admin UI |

Original OSM ids are preserved in `tags.osm_id` so every feature keeps its
provenance. `pnpm db:setup` = migrate + seed for a fresh demo environment.

### 6.4 Sample record (conceptually)

```
id: 12
name: Computer Science Building
type: Academic Building
description: Department of Computer Science
tags: {"osm_id": "way/456534203", "building": "yes"}
geometry: POLYGON((2.9843 6.8931, ...))   -- stored in the geometry column
```

---

## 7. Backend REST API (implemented)

Public endpoints (used by the public map):

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Database/API health probe |
| GET | `/api/features` | All layers as one GeoJSON FeatureCollection |
| GET | `/api/boundary` | Campus boundary polygon |

Authentication endpoints and guarded CRUD (all require
`Authorization: Bearer <token>`):

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Exchanges username/password for a session token |
| POST | `/api/auth/logout` | Revokes the token |
| GET | `/api/admin/stats` | Per-layer feature counts (dashboard cards) |
| GET | `/api/admin/features` | Full feature list including geometry |
| POST | `/api/admin/features` | **Create** a feature (`layer`, attributes, geometry) |
| PUT | `/api/admin/features/:id` | **Update** attributes and/or geometry |
| DELETE | `/api/admin/features/:id` | **Delete** a feature (`?layer=…`) |

- Geometry payloads are validated per layer (buildings → polygon; roads/
  walkways → line; entrances → point) and stored via
  `ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)`.
- Reads use `ST_AsGeoJSON` so the API returns plain GeoJSON.
- Responses are GeoJSON FeatureCollections with feature properties carrying
  `id`, `layer`, `name`, `type`, `description` (and `highway` where relevant)
  merged with `tags`.

### 7.1 Administration & Security

Credentials are environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD` —
defaults `admin`/`admin123`, **change for public deployments**). Login issues
a cryptographically random token stored server-side for 12 hours; sessions
are in memory, which is appropriate for a campus demonstration and
documented in the server README. The public read endpoints never require
authentication.

### 7.2 Deployment Topology

- **Development:** `docker compose up -d` (or native PostGIS) + `pnpm dev`
  in `server/` + `pnpm dev` in `map_interface/`. Vite proxies `/api` to the
  Express server on port 4000.
- **Production-style:** `pnpm --dir map_interface build`, then start only the
  Express server — it serves the built web app **and** the API on one port.

---

## 8. Frontend Application

### 8.1 Routing & Data Source

The React app now loads **all** spatial data from the API
(`GET /api/features`, `GET /api/boundary`) instead of static GeoJSON files —
the database is the single source of truth, so admin edits appear on the
public map immediately after refresh. A `#/admin` hash route switches between
the public map and the admin dashboard; when the API/database is unreachable,
the public map shows a banner warning that campus data is unavailable until the backend is restarted.

### 8.2 Public Map (`Map.tsx`, `SearchBar.tsx`, `BuildingInfo.tsx`, `MapControls.tsx`)

- One GeoJSON feed split client-side into: **paths** (roads & walkways,
  styled by highway classification with the existing visual hierarchy),
  **building footprints** (hover/click, tooltip, selection, fly-to) and
  **entrance points** (styled circle markers with the same interactions).
- Boundary polygon drives the initial view, panning constraints (`maxBounds`,
  zoom 16–18) and the zoom-dependent mask/outline overlay.
- **Search** now matches any named feature (buildings and entrances) and
  flies to polygons, lines or points.
- Locate-me, legend, reset view and zoom controls unchanged.

### 8.3 Admin Dashboard (`admin/AdminPage.tsx` + `AdminMapEditor.tsx`)

The administrative side implements full CRUD:

- **Login** — guarded by the API; token persisted in `localStorage`.
- **Overview** — summary cards with per-layer feature counts.
- **Read** — filterable feature list (all / building / road / walkway /
  entrance). Clicking a row loads it into the editor with its attributes and
  geometry shown on the map.
- **Create** — “+ Add location” → choose layer → fill name/type/description →
  **draw the geometry on the map** with the leaflet-draw toolbar (bottom-right
  of the editor map: polygon/rectangle tools for buildings, line tool for
  roads/walkways, marker for entrances) → Save (`POST /api/admin/features`).
- **Update** — edit attributes and/or redraw the geometry, then Save
  (`PUT`). `updated_at` is refreshed automatically by a database trigger.
- **Delete** — per-row action with confirmation (`DELETE`).

The editor map displays the boundary and existing features as non-interactive
context so new geometries are drawn in the correct place. The edit form itself
floats over the map (fixed to the top-right of the viewport) so it stays
visible while the feature list scrolls and geometry is drawn.

---

## 9. Map Interaction Features Summary

| Feature | Implementation |
|---|---|
| Pan & Zoom | Leaflet, constrained to campus boundary (16–18) |
| Building/Entrance Hover | Colour change + name tooltip |
| Click to Identify | Info panel with attributes + description |
| Search | Substring match across named features, fly-to |
| Locate Me | Browser Geolocation, pulsing dot + accuracy circle |
| Boundary Mask | Semi-transparent overlay outside campus |
| Legend / Reset / Zoom controls | Existing floating controls |
| **Admin CRUD** | Create/Update/Delete features with on-map drawing (leaflet-draw) |

---

## 10. Build & Development

**Package managers:** pnpm (both `server/` and `map_interface/`)

| Command | Where | Purpose |
|---|---|---|
| `docker compose up -d` | root | Start PostGIS database |
| `pnpm db:migrate` / `pnpm db:seed` | server | Apply schema / import GeoJSON (or `pnpm db:setup`) |
| `pnpm dev` | server | Run API on :4000 |
| `pnpm dev` | map_interface | Vite dev server (proxies /api) |
| `pnpm build` / `pnpm lint` | map_interface | Typecheck + production build / ESLint |
| `pnpm start` | server | Serve built app + API (after `pnpm build` in map_interface) |

**TypeScript Configuration:** target ES2023, strict unused checks, react-jsx,
ESLint with React hooks + refresh rules.

---

## 11. Methodology Summary (for Chapter 3/4 write-up)

1. **Data Acquisition** — building/road geometry from OpenStreetMap (Overpass
   API, campus bounding box); facility metadata from crawling the official
   FPI website; campus boundary delineated in QGIS.
2. **Data Processing** — OSM output converted to GeoJSON; QGIS exports cleaned
   (null stripping, provenance tags) and **imported into PostgreSQL/PostGIS**
   by the seed script, which splits roads from walkways by highway tag.
3. **Spatial Database Design & Implementation** — PostGIS tables
   (`buildings`, `roads`, `walkways`, `entrances`, `campus_boundary`) with
   typed geometry columns (Polygon/LineString/Point, SRID 4326), GiST
   spatial indexes and timestamp triggers.
4. **Backend API Development** — Express REST API exposing public GeoJSON
   reads and guarded CRUD endpoints; attribute/geometry validation per layer;
   bearer-token admin authentication.
5. **Frontend Development** — React map interface driven by the API; new
   **admin dashboard** with login, statistics, feature management table and
   an on-map drawing editor implementing **Create, Read, Update and Delete**.
6. **UI/UX Design** — consistent frosted-glass design system, responsive
   layout, accessible search and controls, shared CSS tokens between the
   public map and admin screens.

Chapter 4 demonstrates the implemented CRUD operations with screenshots:
admin login, dashboard statistics, adding a location by drawing it on the
map, editing attributes, and deleting features — with each operation
reflected in the PostGIS database and the public map.
