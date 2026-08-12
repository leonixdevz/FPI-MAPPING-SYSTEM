import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { OSM_ATTRIBUTION, OSM_MAX_ZOOM, OSM_TILE_URL } from '../../config/map';
import { TEMPORARY_CENTRE } from '../../config/studyArea';

interface MapPickerProps {
  /** Current latitude as a string from the form (may be empty/invalid). */
  latitude: string;
  /** Current longitude as a string from the form (may be empty/invalid). */
  longitude: string;
  /** Called with fixed 6-decimal strings when the map is clicked. */
  onChange: (latitude: string, longitude: string) => void;
}

function parseCoord(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Small Leaflet map used by the admin site-feature form. Click anywhere on
 * the map to set the feature's location; the form's lat/lng fields stay in
 * sync. Imported lazily so Leaflet is shared with the map page chunk rather
 * than bloating the main bundle.
 */
export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  const center: [number, number] =
    lat !== null && lng !== null
      ? [lat, lng]
      : [TEMPORARY_CENTRE.lat, TEMPORARY_CENTRE.lng];

  const handlePick = (nextLat: number, nextLng: number) => {
    onChange(nextLat.toFixed(6), nextLng.toFixed(6));
  };

  return (
    <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
      <MapContainer
        center={center}
        zoom={15}
        className="h-60 w-full"
        scrollWheelZoom={false}
      >
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={OSM_MAX_ZOOM} />
        <ClickCapture onPick={handlePick} />
        {lat !== null && lng !== null ? <Marker position={[lat, lng]} /> : null}
      </MapContainer>
      <p className="border-t border-[var(--color-border)] bg-[var(--color-border)]/20 px-3 py-2 text-xs text-[var(--color-muted)]">
        Click the map to set the location — or type the coordinates below.
      </p>
    </div>
  );
}
