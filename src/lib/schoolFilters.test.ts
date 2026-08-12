import { describe, expect, it } from 'vitest';
import type { School } from '../types/school';
import {
  allFacilities,
  DEFAULT_SCHOOL_FILTERS,
  filterSchools,
  filtersAreActive,
  matchesFilters,
} from './schoolFilters';

function makeSchool(overrides: Partial<School> = {}): School {
  return {
    id: '1',
    name: 'Test School',
    schoolType: 'public',
    educationLevel: 'senior_secondary',
    address: 'Ilaro/Oja-Odan Road',
    latitude: 6.828,
    longitude: 3.09,
    capacity: 500,
    facilities: ['library', 'laboratory'],
    topography: '',
    noiseInformation: '',
    description: '',
    isPublic: true,
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  };
}

const schools = [
  makeSchool({
    id: 'a',
    name: 'Unity Secondary School',
    schoolType: 'public',
    educationLevel: 'senior_secondary',
    facilities: ['library', 'sports_field'],
  }),
  makeSchool({
    id: 'b',
    name: 'Gateway Academy',
    schoolType: 'private',
    educationLevel: 'primary',
    facilities: ['laboratory'],
  }),
  makeSchool({
    id: 'c',
    name: 'Ilaro Technical College',
    schoolType: 'public',
    educationLevel: 'vocational',
    facilities: ['library', 'laboratory', 'hostel'],
  }),
];

describe('filterSchools', () => {
  it('returns everything with default filters', () => {
    expect(filterSchools(schools, DEFAULT_SCHOOL_FILTERS)).toHaveLength(3);
  });

  it('matches the query against name (case-insensitive, trimmed)', () => {
    const result = filterSchools(schools, { ...DEFAULT_SCHOOL_FILTERS, query: '  unity ' });
    expect(result.map((s) => s.id)).toEqual(['a']);
  });

  it('filters by school type', () => {
    const result = filterSchools(schools, { ...DEFAULT_SCHOOL_FILTERS, schoolType: 'private' });
    expect(result.map((s) => s.id)).toEqual(['b']);
  });

  it('filters by education level', () => {
    const result = filterSchools(schools, { ...DEFAULT_SCHOOL_FILTERS, educationLevel: 'vocational' });
    expect(result.map((s) => s.id)).toEqual(['c']);
  });

  it('combines filters with AND semantics', () => {
    const result = filterSchools(schools, {
      ...DEFAULT_SCHOOL_FILTERS,
      schoolType: 'public',
      facilities: ['sports_field'],
    });
    expect(result.map((s) => s.id)).toEqual(['a']);
  });

  it('matches if the school has any of the selected facilities (OR)', () => {
    const result = filterSchools(schools, {
      ...DEFAULT_SCHOOL_FILTERS,
      facilities: ['hostel', 'sports_field'],
    });
    expect(result.map((s) => s.id).sort()).toEqual(['a', 'c']);
  });

  it('returns an empty array when nothing matches', () => {
    const result = filterSchools(schools, {
      ...DEFAULT_SCHOOL_FILTERS,
      educationLevel: 'tertiary',
    });
    expect(result).toHaveLength(0);
  });
});

describe('matchesFilters', () => {
  it('is true for a matching school and false otherwise', () => {
    expect(matchesFilters(schools[0], { ...DEFAULT_SCHOOL_FILTERS, schoolType: 'public' })).toBe(true);
    expect(matchesFilters(schools[1], { ...DEFAULT_SCHOOL_FILTERS, schoolType: 'public' })).toBe(false);
  });
});

describe('allFacilities', () => {
  it('deduplicates and sorts facility names', () => {
    expect(allFacilities(schools)).toEqual(['hostel', 'laboratory', 'library', 'sports_field']);
  });

  it('returns an empty array for no schools', () => {
    expect(allFacilities([])).toEqual([]);
  });
});

describe('filtersAreActive', () => {
  it('is false by default and true when any filter is set', () => {
    expect(filtersAreActive(DEFAULT_SCHOOL_FILTERS)).toBe(false);
    expect(filtersAreActive({ ...DEFAULT_SCHOOL_FILTERS, query: ' ' })).toBe(false);
    expect(filtersAreActive({ ...DEFAULT_SCHOOL_FILTERS, query: 'x' })).toBe(true);
    expect(filtersAreActive({ ...DEFAULT_SCHOOL_FILTERS, facilities: ['library'] })).toBe(true);
  });
});
