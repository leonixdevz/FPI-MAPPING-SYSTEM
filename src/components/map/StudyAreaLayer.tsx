import { Polygon } from 'react-leaflet';
import type { ParsedBoundary } from '../../lib/geoBoundary';

interface StudyAreaLayerProps {
  /** Loaded, validated survey boundary — null until the file exists. */
  boundary: ParsedBoundary | null;
}

/**
 * Study-area boundary layer.
 *
 * Renders the real survey boundary once it is supplied. The boundary
 * comes from public/data/study-area-boundary.geojson, fetched and
 * validated by src/services/studyAreaBoundary.ts. Until the file exists
 * the layer renders nothing, but the toggle in the layer control stays
 * visible so reviewers can see what *would* render.
 *
 * Per spec Sections 20 and 35 we never draw an arbitrary polygon and
 * label it "898.116 hectares" — that value is a documented constant
 * (src/config/studyArea.ts), shown separately from the polygon's own
 * computed area.
 */
export function StudyAreaLayer({ boundary }: StudyAreaLayerProps) {
  if (!boundary) return null;

  return (
    <>
      {boundary.polygons.map((polygon, index) => (
        <Polygon
          key={index}
          positions={polygon}
          pathOptions={{
            color: '#0f766e',
            weight: 2,
            fillColor: '#0f766e',
            fillOpacity: 0.12,
            dashArray: '6 4',
          }}
        />
      ))}
    </>
  );
}
