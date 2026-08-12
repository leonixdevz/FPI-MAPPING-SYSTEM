# Interactive School Mapping System

> **Academic MVP** — ND2 Computer Science project. Study area: Ilaro/Oja-Odan Road, Ogun State, Nigeria. Documented land area: **898.116 ha**.

A web-based interactive mapping system that lets users explore the school location, school information, and available mapped/site information through an interactive geographic interface. Public users can browse the map and search schools; administrators can sign in and manage the underlying data.

This project follows a 35-section specification. The full implementation plan lives in [`.hermes/plans/2026-08-11_2250-school-mapping-mvp.md`](./.hermes/plans/2026-08-11_2250-school-mapping-mvp.md).

---

## Current status

**The full MVP is built.** Phases A–J and L of the implementation plan are complete: scaffold, type system, config, local service adapter (localStorage, no Supabase needed), public pages (Home, Map, Schools, School details, Login), the Leaflet map with OSM + Esri satellite base layers and a layer control, school search/filter, admin authentication with CRUD for schools and media, and the site-media gallery. 36 unit tests pass and the production build is clean.

The project now ships with **real project assets** in `data/` (48 site screenshots + a drone screencast video, provided 2026-08-11). They are screen captures with **no GPS/EXIF metadata**, so they are wired in as *site media* (a curated subset is seeded and copied to `public/media/`), not as georeferenced layers. See "Why no real coordinates" below.

## Quick start

Requires Node ≥ 20 and pnpm ≥ 11.

```bash
pnpm install
cp .env.example .env       # optional — defaults are fine for local dev
pnpm dev                   # http://127.0.0.1:5173/
```

Build, preview & test:

```bash
pnpm build                 # type-check + production bundle to dist/
pnpm preview               # serve dist/ locally
pnpm test                  # vitest unit tests (36 tests)
```

Demo admin login (local backend): `admin@school.local` / `admin123` (set via `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD` in `.env`).

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

The spec is explicit (Sections 20, 33, 35) that the system must NOT fabricate coordinates, site boundary, building locations, roads, facility locations, land measurements, or school locations. The supplied assets in `data/` were inspected: all 48 PNGs have **zero EXIF/GPS metadata** and the MP4 has **no GPS track** (`ffprobe`/PIL checks), so they are screen captures — usable as site media, not as georeferenced data. Every coordinate is therefore marked with a `TODO: REQUIRED PROJECT GIS DATA` comment and the map centres on a clearly-labelled `TEMPORARY_CENTRE` constant.

This is a feature, not a gap. A defence panel can see exactly where real data plugs in: `src/config/studyArea.ts` (centre + boundary), `src/config/layers.ts` (layer wiring), and the `StudyAreaLayer` component.

## Project data

- `data/` — the original assets supplied by the student (48 PNG screenshots + `Screencast from 2026-08-11 22-20-32.mp4`). **Gitignored and never modified.**
- `public/media/` — curated copies (video + 5 representative screenshots with safe filenames) served by the app. **Gitignored**; re-copy from `data/` if missing:
  ```bash
  mkdir -p public/media/captures
  cp 'data/Screencast from 2026-08-11 22-20-32.mp4' public/media/site-tour-2026-08-11.mp4
  cp 'data/Screenshot from 2026-08-11 22-03-20.png' public/media/captures/site-220320.png
  cp 'data/Screenshot from 2026-08-11 22-04-37.png' public/media/captures/site-220437.png
  cp 'data/Screenshot from 2026-08-11 22-06-40.png' public/media/captures/site-220640.png
  cp 'data/Screenshot from 2026-08-11 22-09-19.png' public/media/captures/site-220919.png
  cp 'data/Screenshot from 2026-08-11 22-12-05.png' public/media/captures/site-221205.png
  ```
- The local adapter seeds these curated media records (plus one placeholder demo school) on first load; the admin dashboard's **Reset demo data** button restores them.

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
