# Interactive School Mapping System — Project Write-Up & Defense Talking Points

> Prepared for the ND2 Computer Science project defense. **Everything in this document
> is grounded in what was actually built and verified in the repository**
> (`/home/leonix/Documents/School-Mapping-System`) as of 2026-08-12.
> Pair this with the academic report in `Report-Write_up.docx` (background,
> objectives, literature review), which this document does not repeat.
>
> Status: Phases A–L of the implementation plan are complete, including **Phase K
> (Supabase)**. **80 unit tests pass**, the production build is clean, and the app
> was verified end-to-end in a browser with zero console errors.

---

## Part 1 — Project write-up

### 1.1 What the system is

An **Interactive School Mapping System** for a study area of **898.116 hectares**
along **Ilaro/Oja-Odan Road, Ogun State, Nigeria**. It is a web application that:

- shows the study area on an interactive map (OpenStreetMap base + optional Esri
  satellite imagery),
- displays school locations as clickable markers with details,
- lets visitors search and filter schools by name, type, education level and
  facilities,
- presents site media (a drone screencast and site captures supplied by the
  student) as visual evidence,
- gives an administrator a protected dashboard to create, view, edit and delete
  school records and media records,
- is **ready to render the real survey boundary** the moment the boundary file is
  obtained — no code changes required.

The system is built to spec: a 35-section specification was followed across ten
phases, with the full plan and per-phase checkpoints in
`.hermes/plans/2026-08-11_2250-school-mapping-mvp.md`.

### 1.2 Why it matters (the problem)

School mapping combines school locations with attribute data (capacity,
facilities, education level, accessibility) so planners can see *where* schools
are and *what* they offer. Without an interactive platform, it is hard to
identify areas with inadequate coverage, compare distribution, or plan new
facilities. This system demonstrates that workflow end-to-end: record a school
in the admin dashboard → it appears on the public map instantly.

### 1.3 What was delivered

| Area | What exists |
|---|---|
| **Map** (`/map`) | OSM + Esri satellite base layers, school markers with popups, study-area layer, site-feature layer, layer control, scale + zoom controls, search/filter sidebar (dimmed markers), mobile drawer, deep links (`/map?school=<id>`) |
| **Study-area boundary** | Drop-in GeoJSON loader — validated, auto-drawn, auto-framed, with area computed from the polygon shown separately from the documented 898.116 ha |
| **Public pages** | Home (live stats + media strip), Schools (search/filter + cards), School details, 404 + error boundary |
| **Media** | Public gallery with tabs (satellite / drone images / drone videos / site photos); admin uploader (file or URL), list and delete |
| **Admin** | Protected routes, dashboard with live stats, school CRUD, site-feature CRUD (buildings/roads/facilities with a click-to-place map picker), media management, one-click "Reset demo data" for demos |
| **Data layer** | Local adapter (in-memory + localStorage) with cross-tab sync; same service interface a future Supabase adapter will implement |

### 1.4 Architecture & technology

**Stack (locked from spec Section 3):**

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, TypeScript (strict), Tailwind CSS 4 |
| Routing | react-router-dom 7 |
| Mapping | Leaflet 1.9 + react-leaflet 5 (OpenStreetMap tiles, no API key) |
| Satellite tiles | Esri World Imagery (public, no key for moderate use) |
| Backend (optional) | Supabase (Postgres + Auth + Storage) — `VITE_DATA_BACKEND=supabase` |
| Local default    | In-memory + `localStorage` adapter |
| Tests | Vitest + jsdom (58 tests) |
| Package manager | pnpm |

**Four architectural decisions worth explaining to the panel:**

1. **Service-adapter pattern.** All data flows through typed services
   (`src/services/{schools,media,siteFeatures,auth}.ts`). **Two adapters ship**
   — local (in-memory + localStorage) and Supabase — and `VITE_DATA_BACKEND`
   picks the active one. Components never talk to storage or Supabase directly.
2. **Geography is configuration, not code.** The 898.116 ha value, the location
   string and the temporary map centre live in one typed file,
   `src/config/studyArea.ts`. The map opens on a clearly-labelled
   `TEMPORARY_CENTRE` constant — nothing is hidden.
3. **Map layers are data-driven.** `src/config/layers.ts` declares each layer
   (id, label, type, source, default visibility). Adding a layer is a config
   change, not a code change.
4. **Auth mirrors Supabase's real surface.** `signIn`, `signOut`, `getSession`,
   `onAuthStateChange` match Supabase Auth shapes, so the mock behaves like the
   real thing. Demo credentials come from environment variables
   (`VITE_DEMO_ADMIN_EMAIL` / `VITE_DEMO_ADMIN_PASSWORD`), never hard-coded
   secrets in components.

### 1.5 Data handling & academic integrity (the heart of the defense)

**What data the student supplied** (in `data/`, provided 2026-08-11):

- **48 PNG screenshots** of a site-exploration session (mostly 1600×868),
- **1 MP4 screencast** of a drone site tour (~170 s, H.264 1600×900).

**What we verified before building:** every PNG was inspected with PIL and the
video with ffprobe. **None contain EXIF/GPS metadata; the video has no GPS
track.** They are screen captures — rich *visual evidence*, but **not
georeferenced data**.

**What the system therefore does — and does NOT do:**

- ✅ Uses the assets as **site media**: the screencast plus five representative
  screenshots are curated, seeded and served from `public/media/`. They are
  labelled as non-georeferenced screen captures.
- ✅ Stores the **898.116 ha as a documented constant** from the spec — never
  derived from any polygon.
- ✅ Keeps every coordinate the map uses under a **`TODO: REQUIRED PROJECT GIS
  DATA`** marker, clearly searchable in the codebase.
- ❌ **No coordinates were invented.** The single seeded demo school sits at the
  labelled `TEMPORARY_CENTRE` and its record literally says "placeholder".
- ❌ **No boundary was drawn by hand.** We did not draw a shape and label it
  "898.116 hectares" — that would be fabricated precision.
- ✅ **The boundary is wired to be *real* when it arrives:** drop a WGS84
  GeoJSON file at `public/data/study-area-boundary.geojson`; the app validates
  it (coordinate ranges, closed rings, supported geometry types), draws it,
  frames the map to it, and shows the area **computed from the polygon** in a
  separate banner — never merged with the documented value.

This honesty is a **feature for the defense**: a panel member can open the
code, find every TODO, and see exactly where real survey data plugs in.

### 1.6 Testing & quality

- **80 unit tests** (Vitest + jsdom): adapter round-trips and persistence,
  school/media input validation, search/filter logic, the GeoJSON boundary
  parser (geometry types, WGS84 range checks, closed-ring rule, geodesic area,
  bounds, holes), the boundary loader (404, malformed file, SPA-fallback HTML,
  network errors), and the Supabase adapter (camelCase↔snake_case mappers,
  storage upload flow, auth session mapping, reset RPC) against a mocked client.
- **Production build is clean** (`pnpm build` exits 0); the map route is
  code-split so the main bundle stays lean.
- **Browser-verified end-to-end** against the built app: home → map → markers →
  popups → search → admin login → CRUD → media, plus **both boundary states**
  (boundary present → teal confirmation banner; absent → amber "temporary
  centre" banner). Zero console errors in every pass.
- **Accessibility pass:** focus rings, aria-labels, `role="status"` live
  regions on the map banner, Esc closes modals, logical tab order.

### 1.7 Limitations & future work (state these openly)

- **No real geographic coordinates yet** — by design; they come from the survey
  data when obtained.
- **Supabase (Phase K) is implemented but not configured**: the adapter, four SQL
  migrations (schema, RLS, storage bucket, seed) and media uploads to Storage
  are ready. To go live you create a free Supabase project, apply
  `supabase/migrations/`, create the admin Auth user, and set
  `VITE_DATA_BACKEND=supabase` + the project keys in `.env`.
- **Media files** are referenced by URL in the local adapter, not uploaded to
  cloud storage.
- **Admin authentication is demo-grade** (env-configured single account);
  Supabase Auth + Row-Level Security are the planned production path (schema and
  RLS drafts exist in the plan, Phase K).
- **Boundary file must be WGS84 GeoJSON** (EPSG:4326); other projections need a
  one-line conversion (`ogr2ogr -t_srs EPSG:4326`, documented in
  `public/data/README.md`).

---

## Part 2 — Defense talking points

### 2.1 The 60-second pitch

> "This is an interactive web map of our 898.116-hectare study area along
> Ilaro/Oja-Odan Road. It solves a real planning problem: school records are
> usually scattered across papers or tables, but decisions need to see *where*
> schools are and *what* they offer. My system centralises school information
> and shows it spatially — an administrator records a school and it appears on
> the public map instantly, with search, filters, and site media attached. The
> whole thing runs on free, no-key services — React, Leaflet, OpenStreetMap.
> Crucially, I did not fabricate any geographic data: the map centre is
> explicitly temporary, the 898.116-hectare value is the documented figure from
> the brief, and the system is wired to load the real survey boundary as a
> GeoJSON file the moment it is obtained."

### 2.2 Demo script (5–7 minutes)

1. **Home** — live stat cards (schools, media, features, study area). Mention
   they come from real app state, not hard-coded numbers.
2. **Map** — OSM tiles, satellite toggle in the layer control, the amber banner
   ("temporary map centre"), the 898.116 ha chip, the single placeholder school
   marker → click it → popup → "View details".
3. **Search/filter** — type a query; watch the list narrow and non-matching
   markers *dim* on the map (deliberate UX choice: keep spatial context).
4. **Admin** — log in with demo credentials → dashboard → add a school with
   real-looking fields (validation rejects bad lat/lng — demo it) → it appears
   on the public map. Then add a site feature (building/road/facility) by
   clicking the map to place it → it appears on the map's Site features layer,
   colour-coded by type. Delete with the confirm modal. "Reset demo data"
   restores the seed.
5. **Media** — gallery tabs; show the drone screencast and site captures; note
   they are non-georeferenced evidence.
6. **Boundary (the showpiece)** — explain the drop-in: "when the survey team
   hands over the boundary, we save one GeoJSON file here, and the map draws it,
   frames to it, and shows the polygon-computed area — watch." (If time, do the
   live drop-in demo; otherwise describe it.)

### 2.3 Key technical talking points (pick 3–4 to go deep on)

- **The service-adapter pattern**: "Every feature talks to a typed service
  interface. Today it's a local adapter; Supabase is a one-file swap. That
  decoupling is why the frontend is future-proof."
- **Config-driven geography**: "The study area value, location and centre are
  single-source-of-truth constants — no magic numbers scattered in components."
- **Boundary validation**: "The loader rejects out-of-range coordinates, open
  rings, and unsupported geometry types before anything is drawn; it computes
  area geodesically and never conflates it with the documented 898.116 ha."
- **Shared validation**: "The same pure validation functions run in the admin
  form *and* in the data layer — the same rules a server would enforce under
  Supabase."
- **Resilience**: "The app degrades gracefully: missing boundary → amber banner;
  invalid file → red banner with the reason; missing data → proper empty
  states; cross-tab edits sync via storage events; focus on the tab re-reads the
  boundary file."
- **Testing discipline**: "80 unit tests cover the risky parts — both adapters,
  validation, filtering, and the GeoJSON parser — plus a clean production build
  and browser-verified flows."
- **Real multi-user persistence**: "The Supabase backend ships alongside the
  local one — Postgres schema, Row Level Security, and a Storage bucket for
  media uploads. Multi-user means a school added by one administrator is
  visible to everyone; RLS decides who may write."

### 2.4 Anticipated Q&A (with suggested answers)

**Q: Why is the only marker sitting at the map centre? Why are there no real coordinates?**
> Because none of the supplied assets are georeferenced. I inspected all 49
> files: the screenshots have zero EXIF/GPS and the video has no GPS track.
> The spec is explicit that we must not fabricate coordinates, so the map
> centre is a labelled temporary constant and the seeded school is a clearly
> marked placeholder. Real coordinates plug in through the admin dashboard.

**Q: Where did 898.116 hectares come from?**
> It is the documented land area stated in the project brief (spec sections 1
> and 21). It is stored as a constant. It is **not** derived from any polygon,
> and I deliberately did not draw a polygon and claim it equals that figure.

**Q: If you have the boundary, why didn't you draw it?**
> I don't have it — yet. What I built is the *plumbing*: the system is ready to
> accept a real WGS84 GeoJSON boundary at `public/data/study-area-boundary.geojson`,
> validate it, draw it, frame the map to it, and report the polygon-computed
> area separately from the documented value. When the survey data arrives, it's
> a file drop, not a development task.

**Q: What's the difference between 898.116 ha and the computed area the banner shows?**
> One is the documented figure from the brief; the other is calculated from the
> actual polygon you supplied. If they differ, that's information — it flags
> whether the documented figure matches the surveyed boundary. I keep them
> distinct so the system never pretends the polygon *proves* the number.

**Q: Why localStorage instead of a database?**
> The default backend uses localStorage so the system runs with zero setup. The
> Supabase backend is implemented too — Postgres with Row Level Security, Auth,
> and a Storage bucket for media — and it is one env-var switch away
> (`VITE_DATA_BACKEND=supabase`). Both backends expose identical service
> interfaces, so the frontend never changes.

**Q: How did you wire Supabase?**
> Four SQL migrations define the schema, Row-Level Security (public read only on
> public rows, admin write via an email allow-list), the `school-media` Storage
> bucket, and the seed data plus a guarded `reset_demo_data()` RPC. A Supabase
> adapter implements the same service interfaces as the local one, including
> uploading picked media files to Storage and mapping the session to the app's
> admin role via an `is_admin()` RPC. Flip `VITE_DATA_BACKEND=supabase`, add the
> project keys, and the app reads and writes real Postgres.

**Q: Why Leaflet/OpenStreetMap instead of Google Maps?**
> The spec forbids paid APIs. Leaflet + OpenStreetMap is free, open source, and
> has no API key requirement; Esri satellite imagery is also publicly
> accessible. This keeps the system free to run and easy to deploy.

**Q: How do you stop unauthorised people editing data?**
> Admin routes are wrapped in a protected route — unauthenticated users are
> redirected to login with a return URL. Sessions expire after 8 hours. In the
> planned Supabase phase, Row-Level Security enforces the same rule at the
> database level.

**Q: What testing did you do?**
> 58 unit tests across the adapter, validation, filtering and the GeoJSON
> boundary parser; a clean production build; and end-to-end browser checks of
> the public and admin flows plus both boundary states, with zero console
> errors.

**Q: How does search work — is it a database query?**
> It's client-side filtering with a 250 ms debounce on the text input, matching
> the spec's requirement for a simple in-memory matcher at this stage. Filters
> combine (AND across categories, OR within facilities). It will work the same
> way against Supabase because filtering happens after fetch.

**Q: What would you do next with more time?**
> Three things: wire Supabase end-to-end, ingest the real survey boundary and
> site features, and add a proper media upload pipeline to storage. The
> architecture already anticipates all three.

**Q: Is the media real?**
> Yes — it's the student's own site-exploration assets: a drone-tour screencast
> and screen captures from 2026-08-11. They are authentic visual evidence; what
> they are *not* is georeferenced imagery, and the system labels them exactly
> that way.

### 2.5 The honesty playbook (if the panel probes hard)

- **Never overclaim.** If data isn't there, say "by design — here's where it
  plugs in" and point to the TODO marker.
- **Show the markers.** `TODO: REQUIRED PROJECT GIS DATA` appears in
  `src/config/studyArea.ts`, the seed data, and the boundary loader docs.
  Searching for it proves nothing is hidden.
- **Distinguish the three numbers out loud:** documented 898.116 ha, the
  temporary centre (labelled as such), and the polygon-computed area (only shown
  once a real file loads).
- **Frame limits as architecture.** "Not implemented yet" beats "not considered"
  — the adapter pattern, config-driven layers and boundary loader are the
  evidence the system was *designed* for the real data.

### 2.6 Cheat sheet

| Item | Value / location |
|---|---|
| Run it | `pnpm install` → `pnpm dev` → http://127.0.0.1:5173/ |
| Build & test | `pnpm build` (clean) · `pnpm test` (80 tests) |
| Demo admin | `admin@school.local` / `admin123` (from `.env`) |
| Documented area | 898.116 ha — `src/config/studyArea.ts` |
| Temporary centre | `TEMPORARY_CENTRE` — `src/config/studyArea.ts` |
| Boundary drop-in | `public/data/study-area-boundary.geojson` (instructions in `public/data/README.md`) |
| TODO markers | search codebase for `TODO: REQUIRED PROJECT GIS DATA` |
| Data backend switch | `VITE_DATA_BACKEND=local\|supabase` (`src/services/index.ts`) |
| Supabase SQL | `supabase/migrations/` (schema, RLS, storage bucket, seed + reset RPC) |
| Layer config | `src/config/layers.ts` |
| Seed data | `src/services/adapters/local.ts` |
| Plan & spec mapping | `.hermes/plans/2026-08-11_2250-school-mapping-mvp.md` |
| Version history | 10 phase-grouped commits (Phase A → L, boundary wiring, Phase K) |
