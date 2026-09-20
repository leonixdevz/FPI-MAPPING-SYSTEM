# Campus Map Interface (React + Leaflet)

The web front end of the FPI campus mapping system. Two views live in one
app, switched by URL hash:

- **Public map** (`#` or `/`) — interactive campus map: pan/zoom constrained
  to campus, building footprints, roads/walkways, entrances, search with
  fly-to, click-to-identify info panel, locate-me, legend.
- **Admin dashboard** (`#/admin`) — login and full **CRUD** over campus
  features with an on-map drawing editor (leaflet-draw).

All spatial data is served by the Express/PostGIS API in `../server` — the
static GeoJSON exports under `public/data/` are the *import source*, not the
runtime data source. The Vite dev server proxies `/api` to
`http://localhost:4000` (see `vite.config.ts`).

## Run

```bash
pnpm install
pnpm dev        # needs the backend running on :4000 (see ../server)
pnpm build      # typecheck + production build into dist/ (served by Express)
pnpm lint
pnpm preview
```

## Stack

React 19 · TypeScript · Vite · Leaflet 1.9 (react-leaflet for future hooks,
map itself uses Leaflet directly) · leaflet-draw (admin editor)
