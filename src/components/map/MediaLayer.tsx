import { CircleMarker, LayerGroup, Popup } from 'react-leaflet';
import type { Media } from '../../types/media';
import { mediaTypeLabel } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface MediaLayerProps {
  media: Media[];
}

/**
 * Renders media items that have reliable coordinates as small markers.
 * Per spec Section 12, media without coordinates is *not* forced onto
 * the map — it lives in the media gallery instead. The curated site
 * captures have no GPS data, so this layer is empty until the admin
 * adds coordinates to a record.
 */
export function MediaLayer({ media }: MediaLayerProps) {
  const georeferenced = media.filter((m) => m.latitude !== null && m.longitude !== null);

  return (
    <LayerGroup>
      {georeferenced.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.latitude as number, m.longitude as number]}
          radius={8}
          pathOptions={{ color: '#d97706', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.7 }}
        >
          <Popup>
            <div className="min-w-[160px]">
              {m.thumbnailUrl || (m.mediaType !== 'drone_video' ? m.fileUrl : null) ? (
                <img
                  src={m.thumbnailUrl ?? (m.mediaType !== 'drone_video' ? m.fileUrl : undefined)}
                  alt={m.title}
                  className="mb-2 h-24 w-full rounded object-cover"
                  loading="lazy"
                />
              ) : null}
              <h4 className="text-sm font-semibold text-[var(--color-fg)]">{m.title}</h4>
              <div className="mt-1">
                <Badge tone="accent">{mediaTypeLabel(m.mediaType)}</Badge>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </LayerGroup>
  );
}
