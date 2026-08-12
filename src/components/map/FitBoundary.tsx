import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { ParsedBoundary } from '../../lib/geoBoundary';

interface FitBoundaryProps {
  boundary: ParsedBoundary | null;
}

/**
 * Frames the map to the loaded survey boundary. Renders nothing while
 * no boundary is available, and re-frames whenever a (new) boundary is
 * supplied — e.g. after the GeoJSON file is refreshed.
 */
export function FitBoundary({ boundary }: FitBoundaryProps) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) return;
    const { south, west, north, east } = boundary.bounds;
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [56, 56], maxZoom: 16 },
    );
  }, [map, boundary]);

  return null;
}
