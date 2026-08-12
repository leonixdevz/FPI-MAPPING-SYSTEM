/**
 * Media record — spec Section 12.
 *
 *   id             -> id
 *   title          -> title
 *   description    -> description
 *   mediaType      -> media_type  (satellite | drone_image | drone_video | site_photo)
 *   fileUrl        -> file_url
 *   thumbnailUrl   -> thumbnail_url
 *   latitude       -> latitude    (nullable)
 *   longitude      -> longitude   (nullable)
 *   featureId      -> feature_id  (nullable; references site_features.id)
 *   isPublic       -> is_public
 *   createdAt      -> created_at
 *
 * Per spec Section 12: "Do not force every media item to have coordinates
 * if the source does not provide reliable coordinates." Hence nullable
 * lat/lng. EXIF / IPTC metadata is preserved on the source file but is
 * not represented in this row yet — that comes when real assets are
 * imported and a metadata-extraction step is added.
 */

export type MediaType = 'satellite' | 'drone_image' | 'drone_video' | 'site_photo';

export const MEDIA_TYPES: readonly MediaType[] = [
  'satellite',
  'drone_image',
  'drone_video',
  'site_photo',
] as const;

export interface Media {
  id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  /**
   * URL where the actual file lives.
   * For Supabase: signed Storage URL.
   * For local adapter: object URL or external URL the admin supplied.
   */
  fileUrl: string;
  /** Optional poster image for videos or a smaller variant of images. */
  thumbnailUrl: string | null;
  /** WGS84 decimal degrees, or null if the source has no reliable coords. */
  latitude: number | null;
  longitude: number | null;
  /** Optional link to a site_features row this media belongs to. */
  featureId: string | null;
  isPublic: boolean;
  createdAt: string;
}

export type MediaInput = Omit<Media, 'id' | 'createdAt'> & {
  /**
   * Optional raw file picked from disk. The Supabase adapter uploads it
   * to Storage and stores the resulting public URL in fileUrl; the local
   * adapter ignores it (file picks become session-only object URLs).
   */
  file?: File;
};

export interface ValidationIssue_Media {
  field: keyof MediaInput;
  message: string;
}

export function validateMediaInput(input: Partial<MediaInput>): ValidationIssue_Media[] {
  const issues: ValidationIssue_Media[] = [];

  if (!input.title || input.title.trim().length === 0) {
    issues.push({ field: 'title', message: 'Title is required.' });
  }

  if (!input.fileUrl || input.fileUrl.trim().length === 0) {
    issues.push({ field: 'fileUrl', message: 'File URL is required.' });
  } else {
    try {
      // Allow relative URLs (object URLs, /path/foo.png) and absolute ones.
      // The URL constructor throws on malformed input; we accept any string
      // that parses, including blob: and data: URLs.
      // eslint-disable-next-line no-new
      new URL(input.fileUrl, 'http://placeholder.local');
    } catch {
      issues.push({ field: 'fileUrl', message: 'File URL is not a valid URL.' });
    }
  }

  if (input.mediaType && !MEDIA_TYPES.includes(input.mediaType)) {
    issues.push({ field: 'mediaType', message: 'Invalid media type.' });
  } else if (!input.mediaType) {
    issues.push({ field: 'mediaType', message: 'Media type is required.' });
  }

  if (input.latitude !== null && input.latitude !== undefined) {
    if (typeof input.latitude !== 'number' || Number.isNaN(input.latitude) || input.latitude < -90 || input.latitude > 90) {
      issues.push({ field: 'latitude', message: 'Latitude must be a number between -90 and 90.' });
    }
  }
  if (input.longitude !== null && input.longitude !== undefined) {
    if (typeof input.longitude !== 'number' || Number.isNaN(input.longitude) || input.longitude < -180 || input.longitude > 180) {
      issues.push({ field: 'longitude', message: 'Longitude must be a number between -180 and 180.' });
    }
  }

  return issues;
}
