import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface FlyToProps {
  target: { lat: number; lng: number } | null;
}

/**
 * React-leaflet child that flies the map to `target` whenever it
 * changes. Used by the map sidebar: clicking a school in the list
 * flies to its marker.
 */
export function FlyTo({ target }: FlyToProps) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [map, target]);

  return null;
}
