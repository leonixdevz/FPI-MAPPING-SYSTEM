/**
 * Study area configuration — the documented site location and land area
 * from spec Sections 1 and 21. This is the single source of truth for:
 *
 *   - The 898.116-hectare value (one place; not duplicated across components)
 *   - The descriptive name and location of the study area
 *   - The temporary map centre
 *
 * Per spec Section 20 and 35, we do NOT fabricate coordinates, boundaries,
 * school positions, or land measurements. The `TEMPORARY_CENTRE` constant
 * is the only coordinate used by the MVP until the real project GIS data
 * is supplied. It is exported under a clearly-flagged name so a code
 * reviewer or defence panel can find it instantly.
 *
 * When the actual boundary becomes available:
 *   1. Export/convert the survey boundary to WGS84 GeoJSON and save it
 *      at public/data/study-area-boundary.geojson.
 *   2. Refresh the app. The loader (src/services/studyAreaBoundary.ts)
 *      fetches, validates and renders the polygon, and the map re-frames
 *      to it automatically — no component changes required.
 *   3. Until the file exists the map opens at TEMPORARY_CENTRE and the
 *      amber banner below stays visible.
 */

/** Display name for the project. */
export const STUDY_AREA_NAME = 'School Study Area';

/**
 * Documented total land area in hectares.
 * Source: spec Section 1 and Section 21.
 * This value is NOT derived from any polygon; it is the stated area.
 */
export const STUDY_AREA_HECTARES = 898.116;

/** Square kilometres, for unit flexibility in the UI. */
export const STUDY_AREA_SQUARE_KM = 8.98116;

/** Human-readable location string. */
export const STUDY_AREA_LOCATION = 'Ilaro/Oja-Odan Road, Ogun State, Nigeria';

/**
 * TODO: REQUIRED PROJECT GIS DATA
 *
 * The map centre below is TEMPORARY. It is a rough reference point for
 * the Ilaro / Oja-Odan Road area, NOT a verified survey coordinate and
 * NOT the centroid of the real 898.116-hectare property.
 *
 * Replace this object with the real centroid of the supplied boundary
 * once the project GIS data is available. The shape expected is:
 *
 *   {
 *     lat: <verified latitude in WGS84 decimal degrees>,
 *     lng: <verified longitude in WGS84 decimal degrees>,
 *     label: '<short human label, e.g. "School property centroid">'
 *   }
 *
 * Spec references: Section 5.1 ("Do NOT invent coordinates"), Section 20,
 * Section 35 step 6-8.
 */
export const TEMPORARY_CENTRE = {
  lat: 6.828,
  lng: 3.09,
  label: 'Ilaro (approximate, replace with real survey coordinates)',
} as const;

export interface StudyArea {
  name: string;
  areaHectares: number;
  areaSquareKm: number;
  location: string;
  /**
   * The centre point the map opens on. Until a real boundary file is
   * loaded (public/data/study-area-boundary.geojson) this points at
   * TEMPORARY_CENTRE. Once the boundary is loaded, the map re-frames to
   * the polygon automatically.
   */
  centre: {
    lat: number;
    lng: number;
    label: string;
  };
}

export const studyArea: StudyArea = {
  name: STUDY_AREA_NAME,
  areaHectares: STUDY_AREA_HECTARES,
  areaSquareKm: STUDY_AREA_SQUARE_KM,
  location: STUDY_AREA_LOCATION,
  centre: TEMPORARY_CENTRE,
};

/**
 * The text shown as an overlay banner on the map while the centre
 * is still temporary. Keep this visible until the centre is replaced.
 */
export const TEMPORARY_CENTRE_BANNER =
  'Temporary map centre — add the survey boundary at data/study-area-boundary.geojson to load the real boundary';
