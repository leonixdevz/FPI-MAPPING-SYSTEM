import type { EducationLevel, SchoolType } from '../types/school';
import type { MediaType } from '../types/media';
import type { FeatureType } from '../types/siteFeature';

/** Join a list of class names, dropping falsy entries. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Format a hectare value with thousands separators, e.g. 898.116 → "898.116". */
export function formatHectares(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

/** Format a date for display, e.g. "12 Aug 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  public: 'Public',
  private: 'Private',
  mission: 'Mission',
  community: 'Community',
  other: 'Other',
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  primary: 'Primary',
  junior_secondary: 'Junior Secondary',
  senior_secondary: 'Senior Secondary',
  vocational: 'Vocational',
  tertiary: 'Tertiary',
  other: 'Other',
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  satellite: 'Satellite',
  drone_image: 'Drone Image',
  drone_video: 'Drone Video',
  site_photo: 'Site Photo',
};

export const FEATURE_TYPE_LABELS: Record<FeatureType, string> = {
  building: 'Building',
  road: 'Road',
  facility: 'Facility',
  open_space: 'Open Space',
  other: 'Other',
};

export function schoolTypeLabel(value: SchoolType): string {
  return SCHOOL_TYPE_LABELS[value] ?? value;
}

export function educationLevelLabel(value: EducationLevel): string {
  return EDUCATION_LEVEL_LABELS[value] ?? value;
}

export function mediaTypeLabel(value: MediaType): string {
  return MEDIA_TYPE_LABELS[value] ?? value;
}

export function featureTypeLabel(value: FeatureType): string {
  return FEATURE_TYPE_LABELS[value] ?? value;
}

/** Format coordinates for display: "6.8280° N, 3.0900° E" (5 decimals). */
export function formatLatLng(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`;
}
