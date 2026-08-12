import { parseBoundary, type ParsedBoundary } from '../lib/geoBoundary';

export type BoundaryLoadStatus = 'loading' | 'not-found' | 'invalid' | 'loaded';

export interface BoundaryState {
  status: BoundaryLoadStatus;
  boundary: ParsedBoundary | null;
  errors: string[];
}

export interface BoundaryLoadOptions {
  /** Bypass the module cache (used by refresh). */
  force?: boolean;
  /** Injectable fetch for tests. */
  fetcher?: typeof fetch;
}

/**
 * Where the survey boundary file is expected, relative to the app root.
 * Vite serves the contents of `public/` at this path, so the file lives
 * at public/data/study-area-boundary.geojson.
 */
export const STUDY_AREA_BOUNDARY_PATH = 'data/study-area-boundary.geojson';

export const STUDY_AREA_BOUNDARY_URL = `${import.meta.env.BASE_URL}${STUDY_AREA_BOUNDARY_PATH}`;

let cached: Promise<BoundaryState> | null = null;

async function fetchBoundary(fetcher: typeof fetch): Promise<BoundaryState> {
  try {
    const response = await fetcher(STUDY_AREA_BOUNDARY_URL, {
      headers: { Accept: 'application/geo+json, application/json' },
    });
    if (response.status === 404) {
      // No file yet — the app keeps running on the temporary centre.
      return { status: 'not-found', boundary: null, errors: [] };
    }
    // Vite dev/preview (and many static hosts) serve index.html with a
    // 200 for missing paths (SPA fallback). Treat HTML as "no file yet"
    // rather than a malformed boundary.
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      return { status: 'not-found', boundary: null, errors: [] };
    }
    if (!response.ok) {
      return {
        status: 'invalid',
        boundary: null,
        errors: [`HTTP ${response.status} while fetching the boundary file.`],
      };
    }
    const json: unknown = await response.json();
    const parsed = parseBoundary(json);
    if (!parsed.ok) {
      return { status: 'invalid', boundary: null, errors: parsed.errors };
    }
    return { status: 'loaded', boundary: parsed.boundary, errors: [] };
  } catch (err) {
    return {
      status: 'invalid',
      boundary: null,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

/**
 * Load and validate the study-area boundary. A missing file resolves to
 * `status: 'not-found'` rather than throwing, so the public map is
 * never blocked while the survey data is still pending.
 */
export function loadStudyAreaBoundary(
  options: BoundaryLoadOptions = {},
): Promise<BoundaryState> {
  const { force = false, fetcher = globalThis.fetch } = options;
  if (!cached || force) {
    cached = fetchBoundary(fetcher);
  }
  return cached;
}
