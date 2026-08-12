import type { ReactNode } from 'react';
import type { BoundaryState } from '../../services/studyAreaBoundary';
import {
  STUDY_AREA_HECTARES,
  STUDY_AREA_LOCATION,
  STUDY_AREA_NAME,
  TEMPORARY_CENTRE_BANNER,
} from '../../config/studyArea';
import { formatHectares } from '../../lib/utils';

interface MapBannerProps {
  boundaryState: BoundaryState;
}

/**
 * Overlays drawn on top of the Leaflet map (inside the map's relative
 * wrapper, so they don't pan with the map).
 *
 * - A notice reflecting the study-area boundary state: loaded (teal,
 *   with the area computed from the polygon), invalid file (red), or
 *   still temporary/missing (amber)
 * - A study-area stats chip showing the documented 898.116 ha value
 *   (kept separate from any polygon-computed area)
 */
export function MapBanner({ boundaryState }: MapBannerProps) {
  const { status, boundary, errors } = boundaryState;

  let notice: ReactNode = null;
  if (status === 'loaded' && boundary) {
    notice = (
      <p
        role="status"
        className="max-w-md rounded-full bg-teal-100/95 px-4 py-1.5 text-center text-xs font-medium text-teal-900 shadow-sm ring-1 ring-teal-300"
      >
        Survey boundary loaded — {boundary.polygonCount} polygon
        {boundary.polygonCount === 1 ? '' : 's'}, computed area{' '}
        {formatHectares(boundary.areaHectares)} ha from the supplied GeoJSON.
      </p>
    );
  } else if (status === 'invalid') {
    notice = (
      <p
        role="status"
        className="max-w-md rounded-full bg-red-100/95 px-4 py-1.5 text-center text-xs text-red-900 shadow-sm ring-1 ring-red-300"
      >
        Boundary file invalid — {errors[0] ?? 'check data/study-area-boundary.geojson'}
      </p>
    );
  } else if (status === 'not-found') {
    notice = (
      <p
        role="status"
        className="max-w-md rounded-full bg-amber-100/95 px-4 py-1.5 text-center text-xs text-amber-900 shadow-sm ring-1 ring-amber-300"
      >
        {TEMPORARY_CENTRE_BANNER}
      </p>
    );
  }
  // While 'loading' we render nothing — the stats chip stays, and the
  // amber banner only appears once the fetch has confirmed there is no
  // boundary file yet (avoids a misleading flash before resolution).

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex flex-col items-center gap-2 px-3">
      {notice}
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 text-xs shadow-sm ring-1 ring-[var(--color-border)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" aria-hidden="true" />
        <span className="font-semibold text-[var(--color-fg)]">{STUDY_AREA_NAME}</span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className="font-medium text-[var(--color-fg)]">
          {formatHectares(STUDY_AREA_HECTARES)} ha
        </span>
        <span className="hidden text-[var(--color-muted)] sm:inline">·</span>
        <span className="hidden text-[var(--color-muted)] sm:inline">{STUDY_AREA_LOCATION}</span>
      </div>
    </div>
  );
}
