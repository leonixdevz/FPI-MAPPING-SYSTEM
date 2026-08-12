/**
 * Study-area boundary helpers — pure functions with no React or Leaflet
 * imports, so they stay unit-testable in isolation.
 *
 * The real survey boundary arrives as a GeoJSON file
 * (public/data/study-area-boundary.geojson). The loader in
 * src/services/studyAreaBoundary.ts fetches it; this module validates
 * the file and produces:
 *
 *   - Leaflet-ready polygons ([lat, lng] rings, holes preserved)
 *   - A bounding box for map framing
 *   - A geodesic area computed FROM the polygon (hectares)
 *
 * IMPORTANT — spec Sections 20 & 35: the computed area is a
 * verification value only. It is displayed separately from the
 * documented 898.116 ha (src/config/studyArea.ts) and is never used to
 * relabel that figure. The documented value stays a stated figure from
 * the project brief until the survey file is actually supplied.
 */

export interface BoundaryBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ParsedBoundary {
  /** Geometry type the source reduced to ('MultiPolygon' when several polygons). */
  geometryType: 'Polygon' | 'MultiPolygon';
  /**
   * One entry per polygon. Each polygon is an array of rings in Leaflet
   * order — the first ring is the outer boundary, remaining rings are
   * holes. Coordinates are [lat, lng].
   */
  polygons: Array<Array<Array<[number, number]>>>;
  /** Bounding box of the whole boundary, for map framing. */
  bounds: BoundaryBounds;
  /** Geodesic area of the boundary in hectares, computed from the polygon. */
  areaHectares: number;
  polygonCount: number;
}

export type ParseResult =
  | { ok: true; boundary: ParsedBoundary }
  | { ok: false; errors: string[] };

// --- WGS84 constants & helpers ----------------------------------------------

const WGS84_SEMI_MAJOR_M = 6378137;
const MAX_ABS_LAT = 90;
const MAX_ABS_LNG = 180;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidCoordinate(lng: unknown, lat: unknown): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lng) <= MAX_ABS_LNG &&
    Math.abs(lat) <= MAX_ABS_LAT
  );
}

/**
 * Signed geodesic area of a single ring in m², using the spherical
 * excess method (the same algorithm turf's `area` uses).
 */
function signedRingAreaSqM(ring: Array<[number, number]>): number {
  if (ring.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return (total * WGS84_SEMI_MAJOR_M * WGS84_SEMI_MAJOR_M) / 2;
}

/** Area of a polygon (outer ring minus holes) in m². */
function polygonAreaSqM(polygon: Array<Array<[number, number]>>): number {
  const [outer, ...holes] = polygon;
  if (!outer) return 0;
  const outerArea = Math.abs(signedRingAreaSqM(outer));
  const holesArea = holes.reduce(
    (sum, hole) => sum + Math.abs(signedRingAreaSqM(hole)),
    0,
  );
  return Math.max(0, outerArea - holesArea);
}

// --- Parsing -----------------------------------------------------------------

/** Validate a raw GeoJSON ring ([lng, lat] positions) and return it. */
function parseRing(
  raw: unknown,
  context: string,
  errors: string[],
): Array<[number, number]> | null {
  if (!Array.isArray(raw) || raw.length < 4) {
    errors.push(
      `${context}: a ring needs at least 4 positions (≥3 distinct vertices, closed).`,
    );
    return null;
  }
  const ring: Array<[number, number]> = [];
  for (const position of raw) {
    if (!Array.isArray(position) || position.length < 2) {
      errors.push(`${context}: each position must be [lng, lat].`);
      return null;
    }
    const [lng, lat] = position as [unknown, unknown];
    if (!isValidCoordinate(lng, lat)) {
      errors.push(
        `${context}: coordinate out of WGS84 range — got [${String(lng)}, ${String(lat)}] ` +
          '(expected lng ∈ [-180, 180], lat ∈ [-90, 90]).',
      );
      return null;
    }
    ring.push([lng as number, lat as number]);
  }
  // RFC 7946 requires linear rings to be closed: first position == last.
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    errors.push(
      `${context}: ring is not closed — the first and last positions must be identical (RFC 7946).`,
    );
    return null;
  }
  return ring;
}

/** Validate a Polygon's coordinates (array of rings) and return its rings. */
function parsePolygon(
  coordinates: unknown,
  context: string,
  errors: string[],
): Array<Array<[number, number]>> | null {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    errors.push(`${context}: polygon.coordinates must be a non-empty array of rings.`);
    return null;
  }
  const polygon: Array<Array<[number, number]>> = [];
  for (let i = 0; i < coordinates.length; i++) {
    const ring = parseRing(coordinates[i], `${context} ring ${i}`, errors);
    if (!ring) return null;
    polygon.push(ring);
  }
  return polygon;
}

/** Extract every polygon from a Polygon/MultiPolygon geometry. */
function collectGeometry(
  geometry: unknown,
  context: string,
  errors: string[],
  out: Array<Array<Array<[number, number]>>>,
): boolean {
  if (!isRecord(geometry)) {
    errors.push(`${context}: expected a geometry object.`);
    return false;
  }
  const gtype = geometry.type;
  if (gtype === 'Polygon') {
    const polygon = parsePolygon(geometry.coordinates, context, errors);
    if (!polygon) return false;
    out.push(polygon);
    return true;
  }
  if (gtype === 'MultiPolygon') {
    const coordinates = geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      errors.push(`${context}: MultiPolygon.coordinates must be a non-empty array of polygons.`);
      return false;
    }
    for (let i = 0; i < coordinates.length; i++) {
      const polygon = parsePolygon(coordinates[i], `${context} polygon ${i}`, errors);
      if (!polygon) return false;
      out.push(polygon);
    }
    return true;
  }
  errors.push(
    `${context}: unsupported geometry type "${String(gtype)}" — expected Polygon or MultiPolygon.`,
  );
  return false;
}

// --- Public API ---------------------------------------------------------------

/**
 * Validate any supported GeoJSON boundary (Polygon, MultiPolygon,
 * Feature, FeatureCollection) and normalise it for rendering.
 *
 * The result uses [lat, lng] (Leaflet order); the source must be WGS84
 * with [lng, lat] positions, per the GeoJSON spec.
 */
export function parseBoundary(input: unknown): ParseResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [
        'Boundary must be a GeoJSON object — Polygon, MultiPolygon, Feature, or FeatureCollection.',
      ],
    };
  }

  const polygons: Array<Array<Array<[number, number]>>> = [];
  const type = input.type;
  const collect = (geometry: unknown, context: string): boolean =>
    collectGeometry(geometry, context, errors, polygons);

  if (type === 'Polygon' || type === 'MultiPolygon') {
    if (!collect(input, type)) return { ok: false, errors };
  } else if (type === 'Feature') {
    if (input.geometry == null) {
      return { ok: false, errors: ['Feature has a null geometry — nothing to render.'] };
    }
    if (!collect(input.geometry, 'Feature geometry')) return { ok: false, errors };
  } else if (type === 'FeatureCollection') {
    const features = input.features;
    if (!Array.isArray(features) || features.length === 0) {
      return { ok: false, errors: ['FeatureCollection.features must be a non-empty array.'] };
    }
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!isRecord(feature) || feature.type !== 'Feature' || !isRecord(feature.geometry)) {
        return {
          ok: false,
          errors: [`FeatureCollection feature ${i} is not a Feature with a geometry.`],
        };
      }
      if (!collect(feature.geometry, `Feature ${i} geometry`)) return { ok: false, errors };
    }
  } else {
    return {
      ok: false,
      errors: [
        `Unsupported GeoJSON type "${String(type)}" — expected Polygon, MultiPolygon, Feature, or FeatureCollection.`,
      ],
    };
  }

  if (polygons.length === 0) {
    return { ok: false, errors: ['Boundary contains no polygons.'] };
  }

  // Bounding box over the raw [lng, lat] source coordinates.
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lat < south) south = lat;
        if (lat > north) north = lat;
        if (lng < west) west = lng;
        if (lng > east) east = lng;
      }
    }
  }

  // Convert [lng, lat] → [lat, lng] (Leaflet order), keeping polygon grouping.
  // Inferred type: Array<Array<Array<[number, number]>>> (polygon → rings → positions).
  const leafletPolygons = polygons.map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])),
  );

  const areaHectares =
    polygons.reduce((sum, polygon) => sum + polygonAreaSqM(polygon), 0) / 10000;

  return {
    ok: true,
    boundary: {
      geometryType: polygons.length > 1 || type === 'MultiPolygon' ? 'MultiPolygon' : 'Polygon',
      polygons: leafletPolygons,
      bounds: { south, west, north, east },
      areaHectares,
      polygonCount: polygons.length,
    },
  };
}
