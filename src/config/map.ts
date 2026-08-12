/**
 * Map runtime configuration — tile URLs, attribution, default view.
 *
 * All URLs are free / no-key public services, per spec Section 3
 * (no paid APIs, no Google Maps). If you swap in a paid or key-gated
 * tile provider, add the key to .env and reference it here.
 */

/** OpenStreetMap standard tiles. */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const OSM_MAX_ZOOM = 19;

/**
 * Esri World Imagery — public, no key required for moderate use.
 * For high-volume production traffic, switch to a paid plan or a
 * self-hosted tile server. Spec forbids paid APIs in the MVP, so this
 * is acceptable for a student defense demo.
 */
export const ESRI_SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
export const ESRI_SATELLITE_MAX_ZOOM = 19;

/** Initial zoom level when the map first opens. */
export const DEFAULT_ZOOM = 13;

/** Min/max zoom the user can reach. */
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 19;
