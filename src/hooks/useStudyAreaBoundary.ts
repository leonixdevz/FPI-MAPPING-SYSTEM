import { useCallback, useEffect, useState } from 'react';
import { loadStudyAreaBoundary, type BoundaryState } from '../services/studyAreaBoundary';

/**
 * React wrapper around the boundary loader. Components receive the
 * BoundaryState ({ status, boundary, errors }) plus a refresh() that
 * re-reads the file — useful once a new GeoJSON has been dropped in.
 */
export function useStudyAreaBoundary() {
  const [state, setState] = useState<BoundaryState>({
    status: 'loading',
    boundary: null,
    errors: [],
  });

  const refresh = useCallback(async () => {
    const next = await loadStudyAreaBoundary({ force: true });
    setState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadStudyAreaBoundary().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror useSchools/useMedia: re-read the boundary file when the tab
  // regains focus, so dropping a new GeoJSON into public/data/ and
  // switching back picks it up automatically — no reload needed.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return { ...state, refresh };
}
