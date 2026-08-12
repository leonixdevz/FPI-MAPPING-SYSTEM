import { describe, expect, it, vi } from 'vitest';
import { loadStudyAreaBoundary } from './studyAreaBoundary';

const validGeoJSON = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [3, 6],
        [3.1, 6],
        [3.1, 6.1],
        [3, 6.1],
        [3, 6],
      ],
    ],
  },
};

function stubFetcher(status: number, body?: unknown, contentType = 'application/json') {
  return vi.fn(async (): Promise<Response> => {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
      headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
    } as Response;
  });
}

describe('loadStudyAreaBoundary', () => {
  it('resolves not-found when the file is missing (404)', async () => {
    const result = await loadStudyAreaBoundary({ force: true, fetcher: stubFetcher(404) });
    expect(result.status).toBe('not-found');
    expect(result.boundary).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('loads and parses a valid GeoJSON boundary', async () => {
    const result = await loadStudyAreaBoundary({
      force: true,
      fetcher: stubFetcher(200, validGeoJSON),
    });
    expect(result.status).toBe('loaded');
    expect(result.boundary).not.toBeNull();
    expect(result.boundary?.polygonCount).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('treats SPA-fallback HTML as not-found (200 text/html)', async () => {
    const result = await loadStudyAreaBoundary({
      force: true,
      fetcher: stubFetcher(200, '<!doctype html><html></html>', 'text/html'),
    });
    expect(result.status).toBe('not-found');
    expect(result.boundary).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('reports validation errors for malformed GeoJSON', async () => {
    const result = await loadStudyAreaBoundary({
      force: true,
      fetcher: stubFetcher(200, { type: 'Point', coordinates: [3, 6] }),
    });
    expect(result.status).toBe('invalid');
    expect(result.boundary).toBeNull();
    expect(result.errors.join(' ')).toMatch(/unsupported geojson type/i);
  });

  it('reports HTTP errors as invalid', async () => {
    const result = await loadStudyAreaBoundary({ force: true, fetcher: stubFetcher(500) });
    expect(result.status).toBe('invalid');
    expect(result.boundary).toBeNull();
    expect(result.errors.join(' ')).toMatch(/HTTP 500/i);
  });

  it('surfaces network failures without throwing', async () => {
    const failing = vi.fn(async (): Promise<Response> => {
      throw new Error('network down');
    });
    const result = await loadStudyAreaBoundary({ force: true, fetcher: failing });
    expect(result.status).toBe('invalid');
    expect(result.errors.join(' ')).toMatch(/network down/);
  });
});
