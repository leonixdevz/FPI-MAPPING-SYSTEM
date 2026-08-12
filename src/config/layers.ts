/**
 * Map layer configuration — spec Section 13.
 *
 * The MVP conceptually supports five layers. This file is the single
 * declaration of what they are, in what order they appear, and which
 * are enabled by default. Adding/removing a layer is a config change,
 * not a code change, as long as the data source referenced exists.
 *
 * The `dataSource` string is a key the map components look up at render
 * time. Unknown sources render nothing (the layer toggle still appears,
 * so the user can see what *would* be there once the data exists).
 */

export type LayerId = 'base' | 'satellite' | 'schools' | 'studyArea' | 'siteFeatures';

export type LayerType = 'tile' | 'markers' | 'polygon' | 'imageOverlay';

export type DataSource =
  | 'openstreetmap'    // base tiles
  | 'esri-satellite'   // public Esri imagery (no API key)
  | 'schools-service'  // src/services/schools.ts
  | 'study-area-boundary' // src/services/studyAreaBoundary.ts (fetched GeoJSON file)
  | 'site-features-service' // src/services/siteFeatures.ts
  | 'media-service';   // src/services/media.ts (renders only items with valid coords)

export interface MapLayerConfig {
  id: LayerId;
  label: string;
  type: LayerType;
  enabled: boolean;
  /**
   * Where the layer's data comes from. If null, the layer is structural
   * (e.g. a future custom tile overlay that hasn't been added yet) and
   * renders nothing until a source is wired in.
   */
  dataSource: DataSource | null;
  /**
   * Sort order in the layer control. Lower numbers render first / appear
   * lower in the stack. Base maps go to the bottom, markers on top.
   */
  order: number;
  /**
   * If true, the layer is shown by default; the user can still toggle
   * it off in the layer control.
   */
  defaultVisible: boolean;
  /**
   * Short caption shown next to the toggle, e.g. "OSM", "Esri imagery".
   */
  badge?: string;
}

export const MAP_LAYERS: readonly MapLayerConfig[] = [
  {
    id: 'base',
    label: 'Base map (OpenStreetMap)',
    type: 'tile',
    enabled: true,
    dataSource: 'openstreetmap',
    order: 10,
    defaultVisible: true,
    badge: 'OSM',
  },
  {
    id: 'satellite',
    label: 'Satellite imagery',
    type: 'tile',
    enabled: true,
    dataSource: 'esri-satellite',
    order: 20,
    defaultVisible: false,
    badge: 'Esri',
  },
  {
    id: 'studyArea',
    label: 'Study area (898.116 ha)',
    type: 'polygon',
    enabled: true,
    dataSource: 'study-area-boundary',
    order: 30,
    defaultVisible: true,
  },
  {
    id: 'siteFeatures',
    label: 'Site features (buildings, roads, facilities)',
    type: 'markers',
    enabled: true,
    dataSource: 'site-features-service',
    order: 40,
    defaultVisible: true,
  },
  {
    id: 'schools',
    label: 'School locations',
    type: 'markers',
    enabled: true,
    dataSource: 'schools-service',
    order: 50,
    defaultVisible: true,
  },
] as const;

export const DEFAULT_VISIBLE_LAYER_IDS: readonly LayerId[] = MAP_LAYERS
  .filter((layer) => layer.defaultVisible)
  .map((layer) => layer.id);
