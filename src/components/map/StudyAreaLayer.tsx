import { Polygon } from 'react-leaflet';
import { studyArea } from '../../config/studyArea';

/**
 * Study-area boundary layer.
 *
 * TODO: REQUIRED PROJECT GIS DATA
 * ---------------------------------
 * `studyArea.boundary` is null until the real property boundary is
 * supplied (KML/KMZ/GeoJSON/shapefile or a verified survey). Per the
 * project spec (Sections 20, 35) we must NOT draw an arbitrary polygon
 * and label it "898.116 hectares" — that value is a documented constant
 * (src/config/studyArea.ts), not something derived from a polygon.
 *
 * When the boundary arrives:
 *   1. Set `studyArea.boundary` to a GeoJSON Polygon in [lng, lat]
 *      order in src/config/studyArea.ts.
 *   2. This component picks it up automatically — no code changes.
 *
 * Until then the layer renders nothing, but the toggle in the layer
 * control stays visible so reviewers can see what *would* render.
 */
export function StudyAreaLayer() {
  const { boundary } = studyArea;
  if (!boundary) return null;

  // GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng].
  const positions = boundary.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#0f766e',
        weight: 2,
        fillColor: '#0f766e',
        fillOpacity: 0.12,
        dashArray: '6 4',
      }}
    />
  );
}
