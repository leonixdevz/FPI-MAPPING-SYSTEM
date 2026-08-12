import {
  STUDY_AREA_HECTARES,
  STUDY_AREA_LOCATION,
  STUDY_AREA_NAME,
  studyArea,
  TEMPORARY_CENTRE_BANNER,
} from '../../config/studyArea';
import { formatHectares } from '../../lib/utils';

/**
 * Overlays drawn on top of the Leaflet map (inside the map's relative
 * wrapper, so they don't pan with the map).
 *
 * - A notice while the map centre is still the TEMPORARY_CENTRE
 * - A study-area stats chip showing the documented 898.116 ha value
 */
export function MapBanner() {
  const centreIsTemporary = studyArea.boundary === null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex flex-col items-center gap-2 px-3">
      {centreIsTemporary ? (
        <p className="max-w-md rounded-full bg-amber-100/95 px-4 py-1.5 text-center text-xs text-amber-900 shadow-sm ring-1 ring-amber-300">
          {TEMPORARY_CENTRE_BANNER}
        </p>
      ) : null}
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
