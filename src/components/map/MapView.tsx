import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Popup,
  ScaleControl,
  TileLayer,
  ZoomControl,
} from 'react-leaflet';
import { studyArea } from '../../config/studyArea';
import {
  DEFAULT_ZOOM,
  ESRI_SATELLITE_ATTRIBUTION,
  ESRI_SATELLITE_MAX_ZOOM,
  ESRI_SATELLITE_TILE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  OSM_ATTRIBUTION,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from '../../config/map';
import type { School } from '../../types/school';
import type { Media } from '../../types/media';
import type { SiteFeature } from '../../types/siteFeature';
import type { SchoolFilters } from '../../lib/schoolFilters';
import { matchesFilters } from '../../lib/schoolFilters';
import { featureTypeLabel } from '../../lib/utils';
import { SchoolMarker } from './SchoolMarker';
import { StudyAreaLayer } from './StudyAreaLayer';
import { MediaLayer } from './MediaLayer';
import { FlyTo } from './FlyTo';
import { FitBoundary } from './FitBoundary';
import { MapBanner } from './MapBanner';
import { Badge } from '../ui/Badge';
import type { BoundaryState } from '../../services/studyAreaBoundary';

interface MapViewProps {
  schools: School[];
  features: SiteFeature[];
  media: Media[];
  filters: SchoolFilters;
  selectedSchoolId: string | null;
  /** Coordinate to fly to when a sidebar item is clicked. */
  flyTarget: { lat: number; lng: number } | null;
  /** Study-area boundary load state (from useStudyAreaBoundary). */
  boundaryState: BoundaryState;
  onSelectSchool: (id: string | null) => void;
}

/**
 * The layer control below mirrors the five layers declared in
 * src/config/layers.ts (base, satellite, studyArea, siteFeatures,
 * schools). If a layer is added/removed in config, update this control
 * to match — the config stays the single source of truth for order,
 * labels and defaults.
 */
export function MapView({
  schools,
  features,
  media,
  filters,
  selectedSchoolId,
  flyTarget,
  boundaryState,
  onSelectSchool,
}: MapViewProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[studyArea.centre.lat, studyArea.centre.lng]}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        zoomControl={false}
        className="absolute inset-0 z-0 h-full w-full"
      >
        <ZoomControl position="topleft" />
        <ScaleControl position="bottomleft" />

        <LayersControl position="topright">
          <LayersControl.BaseLayer name="OpenStreetMap" checked>
            <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={OSM_MAX_ZOOM} />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite imagery (Esri)">
            <TileLayer
              url={ESRI_SATELLITE_TILE_URL}
              attribution={ESRI_SATELLITE_ATTRIBUTION}
              maxZoom={ESRI_SATELLITE_MAX_ZOOM}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="Study area (898.116 ha)" checked>
            <StudyAreaLayer boundary={boundaryState.boundary} />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Site features" checked>
            <LayerGroup>
              {features.map((feature) => (
                <CircleMarker
                  key={feature.id}
                  center={[feature.latitude, feature.longitude]}
                  radius={7}
                  pathOptions={{ color: '#64748b', weight: 2, fillColor: '#94a3b8', fillOpacity: 0.8 }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <h4 className="text-sm font-semibold text-[var(--color-fg)]">{feature.name}</h4>
                      <div className="mt-1">
                        <Badge>{featureTypeLabel(feature.featureType)}</Badge>
                      </div>
                      {feature.description ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{feature.description}</p>
                      ) : null}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="School locations" checked>
            <LayerGroup>
              {schools.map((school) => (
                <SchoolMarker
                  key={school.id}
                  school={school}
                  dimmed={!matchesFilters(school, filters)}
                  selected={selectedSchoolId === school.id}
                  onSelect={(id) => onSelectSchool(id)}
                />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        <MediaLayer media={media} />
        <FlyTo target={flyTarget} />
        <FitBoundary boundary={boundaryState.boundary} />
      </MapContainer>

      <MapBanner boundaryState={boundaryState} />
    </div>
  );
}
