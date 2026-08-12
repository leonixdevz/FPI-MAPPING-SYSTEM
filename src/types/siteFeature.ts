/**
 * Site features — spec Section 14.
 *
 *   id            -> id
 *   name          -> name
 *   featureType   -> feature_type  (building | road | facility | open_space | other)
 *   description   -> description
 *   latitude      -> latitude
 *   longitude     -> longitude
 *   geometry      -> geometry      (GeoJSON, nullable; only if needed)
 *   createdAt     -> created_at
 *   updatedAt     -> updated_at
 *
 * Per spec: "geometry should only be introduced if the implementation
 * genuinely requires GeoJSON/spatial geometry." We include the field
 * as optional/nullable so the schema supports it, but the MVP does not
 * write to it.
 */

export type FeatureType = 'building' | 'road' | 'facility' | 'open_space' | 'other';

export const FEATURE_TYPES: readonly FeatureType[] = [
  'building',
  'road',
  'facility',
  'open_space',
  'other',
] as const;

export interface SiteFeature {
  id: string;
  name: string;
  featureType: FeatureType;
  description: string;
  latitude: number;
  longitude: number;
  /**
   * Optional GeoJSON geometry (Polygon, LineString, Point).
   * Unused by the MVP; left in the type so future work can adopt it
   * without a schema migration.
   */
  geometry: GeoJSON.Geometry | null;
  createdAt: string;
  updatedAt: string;
}

export type SiteFeatureInput = Omit<SiteFeature, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Spec Section 14 / 19 — validation for site features. Pure function,
 * reused by the admin form (inline feedback) and both service adapters
 * (same rules a server would enforce). Geometry is optional and is not
 * validated here.
 */
export interface ValidationIssue_Feature {
  field: keyof SiteFeatureInput;
  message: string;
}

export function validateSiteFeatureInput(
  input: Partial<SiteFeatureInput>,
): ValidationIssue_Feature[] {
  const issues: ValidationIssue_Feature[] = [];

  if (!input.name || input.name.trim().length === 0) {
    issues.push({ field: 'name', message: 'Feature name is required.' });
  }

  if (input.featureType === undefined || input.featureType === null) {
    issues.push({ field: 'featureType', message: 'Feature type is required.' });
  } else if (!FEATURE_TYPES.includes(input.featureType)) {
    issues.push({ field: 'featureType', message: 'Invalid feature type.' });
  }

  if (typeof input.latitude !== 'number' || Number.isNaN(input.latitude)) {
    issues.push({ field: 'latitude', message: 'Latitude is required and must be a number.' });
  } else if (input.latitude < -90 || input.latitude > 90) {
    issues.push({ field: 'latitude', message: 'Latitude must be between -90 and 90.' });
  }

  if (typeof input.longitude !== 'number' || Number.isNaN(input.longitude)) {
    issues.push({ field: 'longitude', message: 'Longitude is required and must be a number.' });
  } else if (input.longitude < -180 || input.longitude > 180) {
    issues.push({ field: 'longitude', message: 'Longitude must be between -180 and 180.' });
  }

  return issues;
}
