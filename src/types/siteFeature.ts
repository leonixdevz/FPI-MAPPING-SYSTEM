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
