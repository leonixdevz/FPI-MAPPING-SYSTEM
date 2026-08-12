import { describe, expect, it } from 'vitest';
import { validateSchoolInput, type SchoolInput } from './school';

const validInput: SchoolInput = {
  name: 'Unity Secondary School',
  schoolType: 'public',
  educationLevel: 'senior_secondary',
  address: 'Ilaro/Oja-Odan Road',
  latitude: 6.828,
  longitude: 3.09,
  capacity: 500,
  facilities: ['library'],
  topography: 'Flat',
  noiseInformation: 'Low',
  description: '',
  isPublic: true,
};

describe('validateSchoolInput', () => {
  it('accepts a fully valid input', () => {
    expect(validateSchoolInput(validInput)).toEqual([]);
  });

  it('rejects a missing name', () => {
    const issues = validateSchoolInput({ ...validInput, name: '   ' });
    expect(issues.some((i) => i.field === 'name')).toBe(true);
  });

  it('rejects out-of-range latitude', () => {
    expect(validateSchoolInput({ ...validInput, latitude: 91 })).toEqual([
      expect.objectContaining({ field: 'latitude' }),
    ]);
    expect(validateSchoolInput({ ...validInput, latitude: -91 })).toEqual([
      expect.objectContaining({ field: 'latitude' }),
    ]);
  });

  it('rejects non-numeric latitude', () => {
    expect(validateSchoolInput({ ...validInput, latitude: Number.NaN })).toEqual([
      expect.objectContaining({ field: 'latitude' }),
    ]);
  });

  it('rejects out-of-range longitude', () => {
    expect(validateSchoolInput({ ...validInput, longitude: 181 })).toEqual([
      expect.objectContaining({ field: 'longitude' }),
    ]);
  });

  it('rejects negative capacity', () => {
    expect(validateSchoolInput({ ...validInput, capacity: -1 })).toEqual([
      expect.objectContaining({ field: 'capacity' }),
    ]);
  });

  it('rejects fractional capacity', () => {
    expect(validateSchoolInput({ ...validInput, capacity: 2.5 })).toEqual([
      expect.objectContaining({ field: 'capacity' }),
    ]);
  });

  it('rejects a missing school type', () => {
    const issues = validateSchoolInput({ ...validInput, schoolType: undefined });
    expect(issues.some((i) => i.field === 'schoolType')).toBe(true);
  });
});
