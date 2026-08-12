import { describe, expect, it } from 'vitest';
import type { SiteFeatureInput } from './siteFeature';
import { validateSiteFeatureInput } from './siteFeature';

function validInput(overrides: Partial<SiteFeatureInput> = {}): SiteFeatureInput {
  return {
    name: 'Admin block',
    featureType: 'building',
    description: 'Two-storey block',
    latitude: 6.828,
    longitude: 3.09,
    geometry: null,
    ...overrides,
  };
}

describe('validateSiteFeatureInput', () => {
  it('accepts a complete valid input', () => {
    expect(validateSiteFeatureInput(validInput())).toEqual([]);
  });

  it('requires a name', () => {
    const issues = validateSiteFeatureInput(validInput({ name: '  ' }));
    expect(issues.map((i) => i.field)).toContain('name');
  });

  it('requires a feature type', () => {
    const issues = validateSiteFeatureInput(validInput({ featureType: undefined }));
    expect(issues.map((i) => i.field)).toContain('featureType');
  });

  it('rejects an unknown feature type', () => {
    const issues = validateSiteFeatureInput(
      validInput({ featureType: 'tower' as SiteFeatureInput['featureType'] }),
    );
    expect(issues.map((i) => i.field)).toContain('featureType');
  });

  it('accepts every declared feature type', () => {
    for (const type of ['building', 'road', 'facility', 'open_space', 'other'] as const) {
      expect(validateSiteFeatureInput(validInput({ featureType: type }))).toEqual([]);
    }
  });

  it('rejects latitude outside the valid range', () => {
    const issues = validateSiteFeatureInput(validInput({ latitude: 91 }));
    expect(issues.map((i) => i.field)).toContain('latitude');
  });

  it('rejects a non-numeric longitude', () => {
    const issues = validateSiteFeatureInput(validInput({ longitude: Number.NaN }));
    expect(issues.map((i) => i.field)).toContain('longitude');
  });

  it('accepts boundary latitude/longitude values', () => {
    expect(validateSiteFeatureInput(validInput({ latitude: -90, longitude: 180 }))).toEqual([]);
  });
});
