import type { EducationLevel, School, SchoolType } from '../types/school';

/**
 * Client-side school filtering (spec Section 6, 7). Pure functions with
 * no DOM so they are trivially unit-testable and shared by the public
 * schools page and the map sidebar.
 */

export interface SchoolFilters {
  /** Free-text query against name and address. */
  query: string;
  schoolType: SchoolType | '';
  educationLevel: EducationLevel | '';
  /** Any of these facilities must be present (OR semantics). */
  facilities: string[];
}

export const DEFAULT_SCHOOL_FILTERS: SchoolFilters = {
  query: '',
  schoolType: '',
  educationLevel: '',
  facilities: [],
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function filterSchools(schools: readonly School[], filters: SchoolFilters): School[] {
  const query = normalize(filters.query);
  const type = filters.schoolType;
  const level = filters.educationLevel;
  const facilities = filters.facilities;

  return schools.filter((school) => {
    if (query) {
      const haystack = normalize(`${school.name} ${school.address}`);
      if (!haystack.includes(query)) return false;
    }
    if (type && school.schoolType !== type) return false;
    if (level && school.educationLevel !== level) return false;
    if (facilities.length > 0) {
      const hasAny = school.facilities.some((f) => facilities.includes(f));
      if (!hasAny) return false;
    }
    return true;
  });
}

/** Does a school match the current filters? Used by the map to dim markers. */
export function matchesFilters(school: School, filters: SchoolFilters): boolean {
  return filterSchools([school], filters).length > 0;
}

/** The distinct set of facilities present across schools, for the checkbox group. */
export function allFacilities(schools: readonly School[]): string[] {
  const set = new Set<string>();
  for (const school of schools) {
    for (const facility of school.facilities) {
      set.add(facility);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filtersAreActive(filters: SchoolFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.schoolType !== '' ||
    filters.educationLevel !== '' ||
    filters.facilities.length > 0
  );
}
