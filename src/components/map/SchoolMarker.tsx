import { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { School } from '../../types/school';
import { educationLevelLabel, formatLatLng, schoolTypeLabel } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface SchoolMarkerProps {
  school: School;
  /** Dimmed when the school is filtered out by the sidebar filters. */
  dimmed?: boolean;
  /** Open the popup when the school is selected from the sidebar. */
  selected?: boolean;
  onSelect: (id: string) => void;
}

export function SchoolMarker({ school, dimmed = false, selected = false, onSelect }: SchoolMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);

  // Open the popup when the sidebar selects this school.
  useEffect(() => {
    if (selected) markerRef.current?.openPopup();
  }, [selected]);

  const icon = useMemo(() => {
    const size = selected ? 36 : 30;
    return L.divIcon({
      className: '', // react-leaflet/L.DivIcon default class overrides our styling
      html: `
        <div class="sms-pin ${selected ? 'sms-pin--selected' : ''} ${dimmed ? 'sms-pin--dimmed' : ''}">
          <span>${school.name.charAt(0).toUpperCase() || '?'}</span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size - 2],
      popupAnchor: [0, -(size - 2)],
    });
  }, [school.name, selected, dimmed]);

  return (
    <Marker
      ref={markerRef}
      position={[school.latitude, school.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(school.id) }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Popup>
        <div className="min-w-[180px]">
          <h4 className="font-semibold text-[var(--color-fg)]">{school.name}</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone="brand">{schoolTypeLabel(school.schoolType)}</Badge>
            <Badge>{educationLevelLabel(school.educationLevel)}</Badge>
          </div>
          <dl className="mt-2 space-y-0.5 text-xs text-[var(--color-muted)]">
            <div>
              <dt className="sr-only">Coordinates</dt>
              <dd>{formatLatLng(school.latitude, school.longitude)}</dd>
            </div>
            {school.capacity > 0 ? (
              <div>
                <dt className="sr-only">Capacity</dt>
                <dd>{school.capacity.toLocaleString()} capacity</dd>
              </div>
            ) : null}
          </dl>
          <Link
            to={`/schools/${school.id}`}
            className={cn(
              'mt-2 inline-block text-xs font-medium text-[var(--color-brand)] hover:underline',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
            )}
          >
            View details →
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}
