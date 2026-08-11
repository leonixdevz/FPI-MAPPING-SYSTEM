# Interactive School Mapping System

> **Academic MVP** — ND2 Computer Science project. Study area: Ilaro/Oja-Odan Road, Ogun State, Nigeria. Documented land area: **898.116 ha**.

A web-based interactive mapping system that lets users explore the school location, school information, and available mapped/site information through an interactive geographic interface. Public users can browse the map and search schools; administrators can sign in and manage the underlying data.

This project follows a 35-section specification. The full implementation plan lives in [`.hermes/plans/2026-08-11_2250-school-mapping-mvp.md`](./.hermes/plans/2026-08-11_2250-school-mapping-mvp.md).

---

## Current status

**Phase A of the implementation plan is complete.** The scaffold is up: Vite + React 19 + TypeScript + Tailwind 4 + React Router 7 + Leaflet + react-leaflet, with a placeholder home page and the leaflet icon-asset fix in place. The project builds cleanly and the dev server runs at `http://127.0.0.1:5173/`.

Real geographic data is **not yet supplied** — see "Why no real coordinates" below.

## Quick start

Requires Node ≥ 20 and pnpm ≥ 11.

```bash
pnpm install
cp .env.example .env       # optional — defaults are fine for local dev
pnpm dev                   # http://127.0.0.1:5173/
```

Build & preview:

```bash
pnpm build                 # type-check + production bundle to dist/
pnpm preview               # serve dist/ locally
```

## Tech stack

| Layer            | Choice                                  |
|------------------|------------------------------------------|
| Frontend         | React 19 + Vite 6 + TypeScript 5.7        |
| Styling          | Tailwind CSS 4 (CSS-based config)         |
| Routing          | react-router-dom 7                       |
| Map              | Leaflet 1.9 + react-leaflet 5             |
| Tiles            | OpenStreetMap (no API key)                |
| Backend (later)  | Supabase (Postgres + Auth + Storage)      |
| Local mock (now) | In-memory + localStorage adapter          |
| Package manager  | pnpm 11                                  |

## Why no real coordinates (yet)

The spec is explicit (Sections 20, 33, 35) that the system must NOT fabricate coordinates, site boundary, building locations, roads, facility locations, land measurements, or school locations. Until the real project GIS data is supplied — satellite imagery with EXIF GPS, KML/KMZ/GeoJSON boundary files, or a verified survey — every coordinate is marked with a `TODO: REQUIRED PROJECT GIS DATA` comment and the map centres on a clearly-labelled `TEMPORARY_CENTRE` constant.

This is a feature, not a gap. A defence panel can see exactly where real data plugs in.

## Project structure

```
src/
├── main.tsx              # React entry point
├── routes/router.tsx     # Route table (one file, easy to extend)
├── index.css             # Tailwind 4 import + Leaflet CSS + design tokens
├── lib/leafletIconFix.ts # Webpack/Vite-friendly default marker assets
├── components/           # (Phases D–J)
├── pages/                # (Phases D, F, G)
├── services/             # (Phase C — local adapter, Phase K — Supabase)
├── types/                # (Phase B)
├── config/               # (Phase B — studyArea, layers, map config)
└── hooks/                # (Phases C, H)
supabase/                 # (Phase K — schema.sql, rls.sql, seed.sql)
```

## Environment variables

See [`.env.example`](./.env.example). The defaults work for local development. When Supabase is wired (Phase K), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your local `.env` (which is gitignored).

## Development workflow

1. Each phase ends with a **checkpoint**: I run `pnpm build`, start the dev server, curl it, and report what works. You can stop me or redirect me at any checkpoint.
2. Geography is configuration, not code. The single source of truth for the 898.116 ha value and the temporary centre is `src/config/studyArea.ts`.
3. Every data call goes through a service interface (`src/services/*.ts`) so swapping local-only mock → Supabase later is one file change.

## License

Academic project. All rights reserved by the project author.
