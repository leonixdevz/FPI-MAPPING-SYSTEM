import { describe, expect, it } from 'vitest';
import { parseBoundary } from './geoBoundary';

type Position = [number, number];
type Ring = Position[];
type PolygonCoordinates = Ring[];

/** A closed square ring, [lng, lat] per the GeoJSON spec. */
function squarePolygon(swLng: number, swLat: number, sizeDeg: number): PolygonCoordinates {
  return [
    [
      [swLng, swLat],
      [swLng + sizeDeg, swLat],
      [swLng + sizeDeg, swLat + sizeDeg],
      [swLng, swLat + sizeDeg],
      [swLng, swLat],
    ],
  ];
}

describe('parseBoundary — accepted inputs', () => {
  it('accepts a bare Polygon', () => {
    const result = parseBoundary({ type: 'Polygon', coordinates: squarePolygon(3, 6, 0.1) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boundary.geometryType).toBe('Polygon');
    expect(result.boundary.polygonCount).toBe(1);
  });

  it('accepts a Feature wrapping a Polygon', () => {
    const result = parseBoundary({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: squarePolygon(3, 6, 0.1) },
    });
    expect(result.ok).toBe(true);
  });

  it('accepts a FeatureCollection with several polygons', () => {
    const result = parseBoundary({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: squarePolygon(3, 6, 0.05) },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: squarePolygon(3.2, 6.2, 0.05) },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boundary.polygonCount).toBe(2);
    expect(result.boundary.geometryType).toBe('MultiPolygon');
  });

  it('accepts a MultiPolygon', () => {
    const result = parseBoundary({
      type: 'MultiPolygon',
      coordinates: [squarePolygon(3, 6, 0.05), squarePolygon(3.2, 6.2, 0.05)],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boundary.polygonCount).toBe(2);
  });
});

describe('parseBoundary — rejected inputs', () => {
  it('rejects unsupported geometry types', () => {
    const result = parseBoundary({ type: 'Point', coordinates: [3, 6] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(' ')).toMatch(/unsupported geojson type/i);
  });

  it('rejects non-GeoJSON input', () => {
    for (const bad of [null, 42, 'geojson', [], {}]) {
      expect(parseBoundary(bad).ok).toBe(false);
    }
  });

  it('rejects coordinates outside the WGS84 range', () => {
    const result = parseBoundary({ type: 'Polygon', coordinates: squarePolygon(200, 6, 0.1) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(' ')).toMatch(/out of WGS84 range/i);
  });

  it('rejects rings with fewer than 4 positions', () => {
    const result = parseBoundary({
      type: 'Polygon',
      coordinates: [
        [
          [3, 6],
          [3.1, 6],
          [3.1, 6.1],
        ],
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects rings that are not closed (RFC 7946)', () => {
    const result = parseBoundary({
      type: 'Polygon',
      coordinates: [
        [
          [3, 6],
          [3.1, 6],
          [3.1, 6.1],
          [3, 6.1],
          [3.02, 6.02], // not identical to the first position
        ],
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(' ')).toMatch(/not closed/i);
  });

  it('rejects a Feature with null geometry', () => {
    const result = parseBoundary({ type: 'Feature', properties: {}, geometry: null });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty FeatureCollection', () => {
    const result = parseBoundary({ type: 'FeatureCollection', features: [] });
    expect(result.ok).toBe(false);
  });
});

describe('parseBoundary — area & bounds', () => {
  it('computes a credible area for a 0.1° square at the equator (~12,392 ha)', () => {
    const result = parseBoundary({ type: 'Polygon', coordinates: squarePolygon(0, 0, 0.1) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boundary.areaHectares).toBeGreaterThan(12000);
    expect(result.boundary.areaHectares).toBeLessThan(12700);
  });

  it('computes a credible area at the Ilaro latitude (6.828°N, ~12,304 ha)', () => {
    const result = parseBoundary({
      type: 'Polygon',
      coordinates: squarePolygon(3.09, 6.828, 0.1),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boundary.areaHectares).toBeGreaterThan(12000);
    expect(result.boundary.areaHectares).toBeLessThan(12600);
  });

  it('subtracts holes from the outer ring', () => {
    const outer = squarePolygon(0, 0, 1);
    const hole: PolygonCoordinates = [
      [
        [0.4, 0.4],
        [0.6, 0.4],
        [0.6, 0.6],
        [0.4, 0.6],
        [0.4, 0.4],
      ],
    ];
    const solid = parseBoundary({ type: 'Polygon', coordinates: outer });
    const withHole = parseBoundary({ type: 'Polygon', coordinates: [...outer, ...hole] });
    if (!solid.ok || !withHole.ok) {
      throw new Error('both polygons should parse');
    }
    expect(withHole.boundary.areaHectares).toBeLessThan(solid.boundary.areaHectares);
    // 0.2° × 0.2° hole near the equator ≈ 49,500 ha
    const diff = solid.boundary.areaHectares - withHole.boundary.areaHectares;
    expect(diff).toBeGreaterThan(40000);
    expect(diff).toBeLessThan(60000);
  });

  it('returns the bounding box of the boundary', () => {
    const result = parseBoundary({ type: 'Polygon', coordinates: squarePolygon(3, 6, 0.1) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { bounds } = result.boundary;
    expect(bounds.south).toBeCloseTo(6, 10);
    expect(bounds.west).toBeCloseTo(3, 10);
    expect(bounds.north).toBeCloseTo(6.1, 10);
    expect(bounds.east).toBeCloseTo(3.1, 10);
  });

  it('outputs Leaflet-ready [lat, lng] rings', () => {
    const result = parseBoundary({ type: 'Polygon', coordinates: squarePolygon(3, 6, 0.1) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const firstRing = result.boundary.polygons[0][0];
    expect(firstRing[0][0]).toBeCloseTo(6, 10);
    expect(firstRing[0][1]).toBeCloseTo(3, 10);
    expect(firstRing[1][0]).toBeCloseTo(6, 10);
    expect(firstRing[1][1]).toBeCloseTo(3.1, 10);
  });
});
