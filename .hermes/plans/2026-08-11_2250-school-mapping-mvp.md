# Interactive School Mapping System — Implementation Plan

> **For Hermes:** This plan describes a checkpointed build of an academic MVP. The user is an ND2 Computer Science student preparing for a project defense. **Do not invent geographic facts.** Every coordinate, boundary, and study-area shape must be marked `TODO: REQUIRED PROJECT GIS DATA` until the student supplies real data. The system is designed to function with that data missing.
>
> **Status (2026-08-12): Phases A–L are complete, including Phase K (Supabase).** The user supplied real assets in `data/` (48 PNG screenshots + 1 drone screencast MP4, all screen captures with no GPS metadata). They are wired in as site media (curated subset seeded + served from `public/media/`), not georeferenced layers. Phase K shipped the Supabase adapter, SQL migrations (schema/RLS/storage/seed) and storage-backed media uploads — the local adapter remains the default until a real project is configured. See "Build Status" below.

**Goal:** Build a runnable, defensible interactive school mapping MVP that satisfies the supplied 35-section specification, with real geographic data slotted in by TODO markers that the student can replace once they have the actual project GIS assets.

**Architecture:** Modular monolithic web app. Single Vite + React + TypeScript frontend, Tailwind for styling, Leaflet + OpenStreetMap for the map, Supabase for auth/database/storage when wired (mocked locally for now). No microservices, no paid APIs, no Docker required for local dev.

**Tech Stack (locked from spec Section 3):**

- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4
- Mapping: Leaflet, react-leaflet, OpenStreetMap tiles
- Backend (later): Supabase + PostgreSQL + Supabase Auth + Supabase Storage
- Local mock (Phase 1–10): in-memory + localStorage adapter that matches the future Supabase service interface, so swapping in Supabase later is a one-file change
- Package manager: pnpm
- Deployment: Vercel/Netlify free tier (deferred — not part of MVP acceptance)

**Working directory:** `/home/leonix/Documents/School-Mapping-System/` (project built — Phases A–L done)

---

## Current Context / Assumptions

- **Built.** Phases A–L are implemented, tested (80 vitest tests) and verified in a browser with no console errors.
- **Data now supplied.** `data/` contains 48 PNG screenshots (1600×868; one 797×522) and `Screencast from 2026-08-11 22-20-32.mp4` (H.264 1600×900, ~170 s). Inspection with PIL + ffprobe found **no EXIF/GPS metadata anywhere** — they are screen captures, not georeferenced assets. Per spec Sections 12, 20 and 35 they are used as site media with null coordinates; a curated subset (the video + 5 screenshots) is seeded and copied to `public/media/` (gitignored).
- The student has not provided: real satellite imagery, drone photos with EXIF GPS, KML/KMZ/GeoJSON/Shapefile, GPX, or verified site coordinates. Per spec Section 20 and 35, we treat this as a known state and build the surrounding system without fabricating geography.
- The 898.116-hectare land area is a single documented value supplied in the spec (Section 1, 21). It is stored as a typed `studyArea` config constant, NOT derived from a polygon.
- Supabase is not configured locally (no Docker here, so the local stack was not run). Phase K is implemented: `supabase/migrations/` (schema, RLS, storage, seed) plus a Supabase adapter unit-tested against a mocked client. To go live: create a project, apply the migrations, create the admin Auth user, set `VITE_DATA_BACKEND=supabase` + keys.
- Package manager is pnpm (Node 26, pnpm 11, confirmed in shell).
- The full build was executed in one pass on 2026-08-12 at the user's request ("follow the hermes plan and use the provided data").

---

## Architectural Decisions

1. **Service-layer adapter pattern.** Every data fetch goes through `src/services/{schools,media,siteFeatures,auth}.ts`. Each exports a typed interface. Phase 1 implementation: an in-memory adapter backed by `localStorage` for persistence. Future swap: replace the in-memory adapter with a Supabase adapter. Components never import `@supabase/supabase-js` directly — only the service modules do.
2. **Geography is configuration, not code.** A single `src/config/studyArea.ts` exports the documented values (name, areaHectares, location string, centre coordinates as a clearly-labelled `TEMPORARY_CENTRE` constant). The map centres on this constant with a banner that says "Temporary centre — replace with real survey coordinates." Same pattern for `TODO: REQUIRED PROJECT GIS DATA` markers.
3. **Map layers are data-driven.** A `layers.ts` config declares each layer (id, label, type, source) so adding/removing layers does not require code changes — only config updates and the appropriate data source.
4. **Auth is mocked locally but with the real Supabase Auth surface.** `signIn`, `signOut`, `getSession`, `onAuthStateChange` are all implemented in the mock with the same shapes Supabase returns. Swapping in real Supabase Auth requires changing one file.
5. **No client-side storage of secrets.** Even the mock is structured so that no service-role key, anon key, or any secret would ever end up in a frontend module. The mock has nothing to leak.
6. **Tailwind 4 config.** Tailwind 4 uses CSS-based config; we keep the CSS config file minimal and put design tokens in `src/styles/tokens.css`.

---

## File / Directory Structure (target)

```
/home/leonix/Documents/School-Mapping-System/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── postcss.config.js
├── README.md
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── config/
│   │   ├── studyArea.ts
│   │   ├── layers.ts
│   │   └── map.ts
│   ├── lib/
│   │   ├── supabase.ts            # real client; only imported by adapters
│   │   ├── map.ts                 # leaflet helpers
│   │   └── utils.ts
│   ├── services/
│   │   ├── index.ts               # chooses adapter based on env
│   │   ├── schools.ts
│   │   ├── media.ts
│   │   ├── siteFeatures.ts
│   │   ├── auth.ts
│   │   └── adapters/
│   │       ├── local.ts           # in-memory + localStorage
│   │       └── supabase.ts        # stub for now; real impl later
│   ├── types/
│   │   ├── school.ts
│   │   ├── media.ts
│   │   ├── siteFeature.ts
│   │   ├── user.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   ├── SchoolMarker.tsx
│   │   │   ├── StudyAreaLayer.tsx
│   │   │   ├── MediaLayer.tsx
│   │   │   ├── LayerControl.tsx
│   │   │   └── MapBanner.tsx
│   │   ├── schools/
│   │   │   ├── SchoolCard.tsx
│   │   │   ├── SchoolList.tsx
│   │   │   ├── SchoolDetails.tsx
│   │   │   ├── SchoolForm.tsx
│   │   │   └── SchoolSearchFilter.tsx
│   │   ├── media/
│   │   │   ├── MediaGallery.tsx
│   │   │   ├── MediaCard.tsx
│   │   │   └── MediaUploader.tsx
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Modal.tsx
│   │       ├── Spinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── Toast.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── MapPage.tsx
│   │   ├── SchoolsPage.tsx
│   │   ├── SchoolDetailsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminSchools.tsx
│   │       ├── AdminSchoolNew.tsx
│   │       ├── AdminSchoolEdit.tsx
│   │       └── AdminMedia.tsx
│   ├── hooks/
│   │   ├── useSchools.ts
│   │   ├── useMedia.ts
│   │   ├── useAuth.ts
│   │   └── useDebounce.ts
│   └── routes/
│       └── router.tsx
├── supabase/
│   ├── schema.sql                  # tables, types, indexes
│   ├── rls.sql                     # row level security policies
│   └── seed.sql                    # 1 demo school w/ TODO marker
└── .hermes/
    └── plans/
        └── 2026-08-11_2250-school-mapping-mvp.md
```

---

## Phased Plan

The spec has 10 phases (Section 30). I keep those as milestones but break each into 2-5 minute tasks. The user wants checkpoints, so I will pause at the end of each major phase and surface what's done, what's stubbed, and what to verify before continuing.

### Phase A — Project bootstrap (covers spec Phase 1)

- [x] A1. `pnpm create vite@latest . --template react-ts` in the empty project dir; answer the prompts non-interactively.
- [x] A2. Verify scaffold builds: `pnpm install && pnpm build` returns exit 0.
- [x] A3. Install Tailwind 4: `pnpm add -D tailwindcss @tailwindcss/vite`. Wire it in `vite.config.ts` and `src/index.css`. Verify a Tailwind class renders.
- [x] A4. Install routing: `pnpm add react-router-dom`. Create `src/routes/router.tsx` with placeholder routes.
- [x] A5. Install Leaflet + react-leaflet: `pnpm add leaflet react-leaflet @types/leaflet`. Fix Leaflet's default marker icon path issue with a one-liner in `src/lib/leafletIconFix.ts`.
- [x] A6. Add `.env.example`, `.gitignore` (Vite default + `.env` + `node_modules`), and a starter `README.md` documenting setup and the "no real assets yet" state.
- [x] A7. `git init`, initial commit.
- [ ] **Checkpoint:** `pnpm dev` opens, home page renders, Tailwind classes apply, no console errors. User can `cd` in and run the project.

### Phase B — Type system + config (no spec equivalent, but enables everything else)

- [x] B1. Create `src/types/school.ts` matching spec Section 6 fields, plus `id`, `created_at`, `updated_at`. Use camelCase in TS, snake_case comments noting DB column names.
- [x] B2. Create `src/types/media.ts` matching spec Section 12.
- [x] B3. Create `src/types/siteFeature.ts` matching spec Section 14.
- [x] B4. Create `src/types/user.ts` with `id`, `email`, `role: 'admin' | 'public'`.
- [x] B5. Create `src/config/studyArea.ts` with `name: 'School Study Area'`, `areaHectares: 898.116`, `location: 'Ilaro/Oja-Odan Road, Ogun State, Nigeria'`, `TEMPORARY_CENTRE: { lat: 6.8280, lng: 3.0900, label: 'Ilaro (approximate, replace with real survey coordinates)' }`. Above the constant, write a comment block explaining the TODO and citing spec Sections 20, 21, 35.
- [x] B6. Create `src/config/layers.ts` declaring 5 layer objects: `base`, `satellite`, `schools`, `studyArea`, `siteFeatures`. Each carries `id`, `label`, `enabled`, `type`, and a `dataSource` key that points to a service module.
- [x] B7. Create `src/config/map.ts` with default zoom (13), tile URL, attribution, max bounds.
- [ ] **Checkpoint:** Types compile cleanly. User can read the config files and see the "temporary centre" notice.

### Phase C — Local service adapter (covers spec Phases 2, 4 backend stub)

- [x] C1. Define service interfaces in `src/services/{schools,media,siteFeatures,auth}.ts`. Each function returns typed `Promise<T>`. No implementation yet.
- [x] C2. Build `src/services/adapters/local.ts` backed by `localStorage` with key namespaces `sms.schools`, `sms.media`, `sms.siteFeatures`, `sms.session`. Implement all 4 service interfaces against this store. Seed one demo school on first load so the map has something to render.
- [x] C3. Build `src/services/index.ts` that selects adapter based on `import.meta.env.VITE_DATA_BACKEND`. Default to `'local'`. Document the env var in `.env.example`.
- [x] C4. Build `src/hooks/useSchools.ts`, `useMedia.ts`, `useAuth.ts` as thin React wrappers around the services. Cache results in component state.
- [x] C5. Add a `__DEV__` reset button (admin dashboard only) that clears the localStorage namespaces — useful for the defense demo.
- [ ] **Checkpoint:** Hooks return data; admin can reset; demo school is present on first load.

### Phase D — Layout + public pages (covers spec Section 16)

- [x] D1. Build `Header` with project title and nav (Home, Map, Schools, Login). Tailwind for styling.
- [x] D2. Build `Footer` with project metadata (study area name, areaHectares, location).
- [x] D3. Build `Layout` shell that wraps routes. Public vs admin layouts differ only in the admin nav.
- [x] D4. Build `Home` page: hero with project title, description, "Explore Map" CTA, summary cards (Total Schools, Study Area, Media count — all live from services).
- [x] D5. Build `MapPage`: full-screen map view with the layer control and search/filter sidebar.
- [x] D6. Build `SchoolsPage`: list view of all schools with cards.
- [x] D7. Build `SchoolDetailsPage`: full info view for one school.
- [ ] **Checkpoint:** All public pages render, navigation works, no console errors. Mobile breakpoint verified (≤640 px).

### Phase E — Map (covers spec Phases 3, 4, 7)

- [x] E1. Build `MapView` with OpenStreetMap base tiles. Centre on `TEMPORARY_CENTRE` from config. Show a translucent `MapBanner` overlay that says "Temporary centre — replace with real survey coordinates."
- [x] E2. Build `SchoolMarker` rendering one school from the `schools` service. Popup shows name, type, level, capacity.
- [x] E3. Build `LayerControl` with toggles for the 5 declared layers. Disabled if data source is empty (e.g. study area polygon not yet supplied).
- [x] E4. Build `StudyAreaLayer`. For now, renders nothing (data is `TODO`). Includes a `TODO: REQUIRED PROJECT GIS DATA` placeholder polygon in the file with a `// eslint-disable-next-line` comment block explaining why it's commented out.
- [x] E5. Build `MediaLayer` that shows media items with valid lat/lng as markers. Filters by `media_type`. Markers disabled if no media has coords yet.
- [x] E6. Wire the map page to the services. Schools render from data, study area renders nothing until data arrives.
- [ ] **Checkpoint:** Map loads, OSM tiles render, school markers visible (demo seed), layer control toggles work, no fabricated study-area polygon.

### Phase F — Auth + protected routes (covers spec Phase 5, Section 15)

- [x] F1. Implement local auth: `signIn(email, password)` checks against a hardcoded `VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD` pair from `.env.example` (clearly marked "DEMO ONLY — replace when Supabase is wired"). On success, sets `sms.session` localStorage key.
- [x] F2. Implement `signOut`, `getSession`, `onAuthStateChange` matching Supabase's surface.
- [x] F3. Build `LoginPage` with email + password form. Validation: required, email format.
- [x] F4. Build `ProtectedRoute` HOC. Unauthenticated users hitting `/admin/*` get redirected to `/login?next=...`.
- [x] F5. Add logout button to admin header.
- [ ] **Checkpoint:** `/admin` redirects to login when not signed in. Demo creds log in. Logout returns to public view.

### Phase G — Admin CRUD (covers spec Phase 5, Section 18)

- [x] G1. Build `AdminDashboard` with stat cards (Total Schools, Total Facilities, Total Mapped Features, Total Media, Study Area) — all live from services, no fake numbers.
- [x] G2. Build `AdminSchools` list page with table + add button + per-row edit/delete.
- [x] G3. Build `AdminSchoolNew` form. Validation per spec Section 19: name required, lat/lng numeric in valid range, capacity ≥ 0.
- [x] G4. Build `AdminSchoolEdit` form. Same validation. Pre-populated from current record.
- [x] G5. Implement delete with confirm modal.
- [x] G6. Empty state ("No schools yet") and loading state (spinner).
- [x] G7. `AdminSiteFeatures` page — CRUD for site features (buildings, roads, facilities) with shared validation, a lazy click-to-place map picker, and per-type marker colours on the public map's Site features layer.
- [ ] **Checkpoint:** Full school CRUD works against the local adapter. Validation rejects bad lat/lng.

### Phase H — Search + filter (covers spec Phase 6, Section 7)

- [x] H1. Build `SchoolSearchFilter` component: text input (name), select (type), select (education level), checkbox group (facilities).
- [x] H2. Implement client-side filter on the schools list. No DB query engine — simple in-memory match, as spec demands.
- [x] H3. Debounce text input with `useDebounce` (250 ms).
- [x] H4. Show "X of Y schools" count. Reset button clears all filters.
- [x] H5. Wire search to map: filtered-out schools' markers go dimmed, not removed (better UX during panning).
- [ ] **Checkpoint:** Search by name works. Filters by type/level/facilities work together. Map updates.

### Phase I — Media (covers spec Phases 8, 11, 12)

- [x] I1. Build `MediaGallery` for the public site. Tabs: All, Satellite, Drone Images, Drone Videos, Site Photos. Lazy-load images. Videos show thumbnail + play button overlay.
- [x] I2. Build `MediaCard` with title, type badge, description.
- [x] I3. Build `MediaUploader` for admin: title, description, type select, file picker (file or URL), lat/lng optional, feature_id optional, is_public toggle. File -> object URL for local adapter; URL field for remote hosting later.
- [x] I4. Implement media list / create / delete in `media` service.
- [x] I5. Build `AdminMedia` page with the uploader + list.
- [x] I6. For now, the local adapter stores media references only (URL or blob URL), not real uploads. Document this clearly in the service file.
- [ ] **Checkpoint:** Admin can add a media record, public gallery displays it, video metadata preserved when supplied.

### Phase J — UI refinement (covers spec Phase 9, Section 26)

- [x] J1. Audit every page for mobile (≤640 px), tablet (≤1024 px), desktop. Map must remain usable on mobile.
- [x] J2. Error states: 404 page, generic error boundary, "Failed to load" toasts.
- [x] J3. Loading states: spinners on async, skeleton placeholders on map while tiles load.
- [x] J4. Empty states: no schools, no media, no search results.
- [x] J5. Accessibility pass: focus rings on all interactive elements, alt text on images, aria-labels on icon buttons, keyboard-navigable map controls where Leaflet supports it.
- [x] J6. Keyboard: Esc closes modals, Enter submits forms, Tab order logical.
- [ ] **Checkpoint:** Lighthouse a11y score ≥ 90 on home and map pages. No console warnings.

### Phase K — Supabase wiring (covers spec Phase 2) — DONE 2026-08-12

Implemented on request ("real multi-user persistence"). Files live under `supabase/migrations/` (0001 schema → 0002 rls → 0003 storage → 0004 seed) so they can be pasted into the project's SQL editor in order, or applied with the CLI (`npx supabase start` / `db push`, requires Docker).

- [x] K1. `supabase/migrations/0001_schema.sql` — admins, schools, media, site_features tables + constraints + updated_at triggers.
- [x] K2. `supabase/migrations/0002_rls.sql` — public read on `is_public = true` rows; admin full read/write via `is_admin()` email allow-list; no anon writes; locked-down admins table.
- [x] K3. `supabase/migrations/0004_seed.sql` — demo admin email, one placeholder school flagged TODO, curated media; guarded `reset_demo_data()` RPC powers the dashboard reset.
- [x] K4. `src/services/adapters/supabase.ts` — implements all four service interfaces (snake_case/camelCase mappers, media upload to the `school-media` Storage bucket, session/role mapping via `is_admin()`). Unit-tested against a mocked client (22 tests).
- [x] K5. README "Running with Supabase (Phase K)" — CLI + dashboard instructions.
- [x] K6. Switching is `VITE_DATA_BACKEND=supabase` + `.env` keys (`src/services/index.ts`).

### Phase L — Testing + acceptance (covers spec Phase 10, Section 31)

- [x] L1. Vitest setup with `jsdom` for component tests.
- [x] L2. Unit tests for service adapters (local) — round-trip a school, validate lat/lng, etc.
- [x] L3. Component tests for `SchoolForm` (validation), `SchoolSearchFilter` (filtering), `ProtectedRoute` (redirect).
- [x] L4. Run `pnpm build` — exit 0, no warnings.
- [x] L5. Run `pnpm preview` and curl `/`, `/map`, `/schools`, `/admin` — all return 200.
- [x] L6. Walk the spec's Section 31 acceptance checklist, mark off every item, surface anything that fails.
- [x] L7. Final README with: how to run, where TODO markers live, how to swap Supabase in, defense talking points.

---

## Checkpoint Discipline

After every phase marked **Checkpoint**, I will:

1. Run `pnpm build` and report exit code.
2. Run `pnpm dev` in the background, curl `http://localhost:5173/`, report status.
3. List what was added in that phase (file paths).
4. List what's stubbed and what real data the user needs to provide.
5. Wait for the user to say "continue" or redirect before starting the next phase.

If the user redirects at any checkpoint, I stop, surface the state, and adjust the plan rather than pressing on.

---

## What I will NOT do (per spec)

- Invent coordinates, site boundary, building locations, roads, facility locations, land measurements, or school locations.
- Draw an arbitrary polygon and claim it represents 898.116 hectares.
- Add microservices, Kubernetes, Docker, AWS, paid VPS, Google Maps API, ML models, knowledge graphs, or complex GIS servers.
- Use Tailwind plugins that pull in heavy JS (no `@tailwindcss/typography` for now unless needed).
- Add libraries not justified by the spec.
- Commit secrets, anon keys, or service-role keys.

---

## Risks / Open Questions

- **Tailwind 4 stability.** Tailwind 4 is the spec's choice; some plugins lag. If we hit a blocker, fall back to Tailwind 3 with `tailwind.config.js` — same component code, different config file. Document the swap.
- **react-leaflet + React 19 strict mode.** Some versions of react-leaflet have warnings under strict mode. Pin to a known-good pair; verify in Phase A.
- **Local adapter for media blobs.** Storing `File` objects in localStorage is fragile (size limit, serialization). For now, the local adapter stores only URLs and file references; real files stay in memory only for the session. Document this.
- **Vite + Supabase env vars.** Vite requires `VITE_` prefix for client-exposed env vars. The anon key is safe to expose; the service-role key is NOT. The local adapter needs no Supabase keys at all, which is the right default.

---

## How to resume

When the user says "continue" or names a phase (e.g. "do Phase E"), I:

1. Verify the working directory is `/home/leonix/Documents/School-Mapping-System/`.
2. Verify `pnpm install` has been run since the last phase (re-run if `node_modules` is missing or stale).
3. Run the named phase's tasks top to bottom.
4. Hit the checkpoint discipline above before proceeding.

If the user pauses for an hour or more, I re-read this plan and the latest checkpoint notes before resuming.

---

## Save & Sign-off

Plan written to `/home/leonix/Documents/School-Mapping-System/.hermes/plans/2026-08-11_2250-school-mapping-mvp.md`.

The user has confirmed:
- pnpm for the package manager.
- No Supabase for now (local-only mock with adapter pattern).
- Plan first, build with checkpoints.

Waiting for the user to say "start Phase A" (or to redirect the plan) before any code is written.
