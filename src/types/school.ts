/**
 * School record — the central entity of the system.
 *
 * Field names match the canonical spec (Section 6) and the planned
 * Postgres columns (Section 14) one-to-one, except that we use
 * camelCase in TypeScript and snake_case in SQL. The mapping is:
 *
 *   id                -> id            (uuid, primary key)
 *   name              -> name          (text, required)
 *   schoolType        -> school_type   (text, required where applicable)
 *   educationLevel    -> education_level (text)
 *   address           -> address       (text)
 *   latitude          -> latitude      (numeric, valid range)
 *   longitude         -> longitude     (numeric, valid range)
 *   capacity          -> capacity      (integer, >= 0)
 *   facilities        -> facilities    (text[])  -- array of facility names
 *   topography        -> topography    (text)
 *   noiseInformation  -> noise_information (text)
 *   description       -> description   (text)
 *   createdAt         -> created_at    (timestamptz)
 *   updatedAt         -> updated_at    (timestamptz)
 *
 * The optional `isPublic` flag controls whether the row is visible to
 * unauthenticated visitors (per spec Section 28: public users get
 * read-only access to *intended* public information). Defaults to true.
 */

export type EducationLevel =
  | 'primary'
  | 'junior_secondary'
  | 'senior_secondary'
  | 'vocational'
  | 'tertiary'
  | 'other';

export type SchoolType =
  | 'public'
  | 'private'
  | 'mission'
  | 'community'
  | 'other';

export interface School {
  id: string;
  name: string;
  schoolType: SchoolType;
  educationLevel: EducationLevel;
  address: string;
  /** WGS84 latitude in decimal degrees. Valid range: -90 to 90. */
  latitude: number;
  /** WGS84 longitude in decimal degrees. Valid range: -180 to 180. */
  longitude: number;
  /** Maximum student capacity. Must be >= 0. */
  capacity: number;
  /** Free-form list of facilities offered (e.g. ["library", "laboratory"]). */
  facilities: string[];
  /** Description of the school's terrain / topography. */
  topography: string;
  /** Notes on noise levels or environmental noise context. */
  noiseInformation: string;
  description: string;
  /** Default true. Admin can flip to false to hide from public list/map. */
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload accepted by the create/update service methods.
 * Omits server-managed fields (id, timestamps) so the service layer
 * is the only thing that produces them.
 */
export type SchoolInput = Omit<School, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Spec Section 19 — validation. Pure function, no DOM, easy to unit-test
 * and to reuse on both client (form feedback) and server (RLS check).
 */
export interface ValidationIssue {
  field: keyof SchoolInput;
  message: string;
}

const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

export function validateSchoolInput(input: Partial<SchoolInput>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.name || input.name.trim().length === 0) {
    issues.push({ field: 'name', message: 'School name is required.' });
  }

  if (typeof input.latitude !== 'number' || Number.isNaN(input.latitude)) {
    issues.push({ field: 'latitude', message: 'Latitude is required and must be a number.' });
  } else if (input.latitude < LAT_MIN || input.latitude > LAT_MAX) {
    issues.push({ field: 'latitude', message: `Latitude must be between ${LAT_MIN} and ${LAT_MAX}.` });
  }

  if (typeof input.longitude !== 'number' || Number.isNaN(input.longitude)) {
    issues.push({ field: 'longitude', message: 'Longitude is required and must be a number.' });
  } else if (input.longitude < LNG_MIN || input.longitude > LNG_MAX) {
    issues.push({ field: 'longitude', message: `Longitude must be between ${LNG_MIN} and ${LNG_MAX}.` });
  }

  if (typeof input.capacity !== 'number' || Number.isNaN(input.capacity)) {
    issues.push({ field: 'capacity', message: 'Capacity is required and must be a number.' });
  } else if (input.capacity < 0) {
    issues.push({ field: 'capacity', message: 'Capacity cannot be negative.' });
  } else if (!Number.isInteger(input.capacity)) {
    issues.push({ field: 'capacity', message: 'Capacity must be a whole number.' });
  }

  if (input.schoolType === undefined || input.schoolType === null) {
    issues.push({ field: 'schoolType', message: 'School type is required.' });
  }

  return issues;
}
