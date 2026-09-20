import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { fetchBoundary, fetchFeatures } from '../../api'
import type { FeatureLayer } from '../../api'

/**
 * Geometry editor for the admin dashboard.
 *
 * Shows the campus boundary and all existing features as non-interactive
 * context, then lets the admin draw a new footprint / line / point with the
 * leaflet-draw toolbar. Every completed drawing is emitted to the parent
 * through `onGeometryChange`.
 *
 * The component is fully remounted (via React `key`) whenever the layer or
 * the feature being edited changes, which keeps the drawing state simple.
 */

interface AdminMapEditorProps {
  layer: FeatureLayer
  initialGeometry?: GeoJSON.Geometry | null
  onGeometryChange: (geometry: GeoJSON.Geometry | null) => void
}

/* Style for the feature currently being authored/edited */
const ACTIVE_PATH_STYLE: L.PathOptions = {
  color: '#1d6fb8',
  weight: 2.5,
  fillColor: '#a8c4e0',
  fillOpacity: 0.45,
}

const ACTIVE_POINT_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#1d6fb8;border:3px solid #fff;box-shadow:0 0 0 2px rgba(45,90,128,.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

/* Which drawing tools each layer allows */
function drawOptionsFor(layer: FeatureLayer): L.Control.DrawOptions {
  const polyline: L.Control.DrawOptions['polyline'] = {
    shapeOptions: { color: '#1d6fb8', weight: 2.5 },
  }
  const polygon: L.Control.DrawOptions['polygon'] = {
    allowIntersection: false,
    shapeOptions: { color: '#1d6fb8', weight: 2.5, fillColor: '#a8c4e0', fillOpacity: 0.35 },
  }
  const rectangle: L.Control.DrawOptions['rectangle'] = {
    shapeOptions: { color: '#1d6fb8', weight: 2.5, fillColor: '#a8c4e0', fillOpacity: 0.35 },
  }
  const marker: L.Control.DrawOptions['marker'] = { icon: ACTIVE_POINT_ICON }

  const disabled: L.Control.DrawOptions = {
    polygon: false, rectangle: false, polyline: false,
    marker: false, circle: false, circlemarker: false,
  }

  if (layer === 'building') return { ...disabled, polygon, rectangle }
  if (layer === 'road' || layer === 'walkway') return { ...disabled, polyline }
  return { ...disabled, marker } // entrance
}

export default function AdminMapEditor({
  layer,
  initialGeometry = null,
  onGeometryChange,
}: AdminMapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [6.894, 2.985],
      zoom: 16,
      zoomControl: true,
      preferCanvas: true,
      attributionControl: false,
    })
    map.getContainer().style.background = '#eef0f2'
    mapRef.current = map

    const previewGroup = L.featureGroup().addTo(map)
    let activeLayer: L.Layer | null = null

    /* ── Draw the initial (existing) geometry into the preview ── */
    if (initialGeometry) {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: initialGeometry,
      }
      L.geoJSON(geojson, {
        style: ACTIVE_PATH_STYLE,
        pointToLayer: (_f, latlng) => L.marker(latlng, { icon: ACTIVE_POINT_ICON }),
      }).eachLayer((l) => previewGroup.addLayer(l))
    }

    /* ── Context layers: boundary + every existing feature (read-only) ── */
    /* `cancelled` guards against React StrictMode double-mounting in dev: the
       first map instance is removed by cleanup before its fetch resolves, and
       adding layers to that removed map throws
       `Cannot read properties of undefined (reading 'appendChild')`. */
    let cancelled = false
    Promise.all([fetchBoundary(), fetchFeatures()])
      .then(([boundaryData, features]) => {
        if (cancelled || mapRef.current !== map) return
        const boundaryFeatures = (boundaryData.features ?? []) as GeoJSON.Feature[]

        // Campus boundary
        const boundaryFc: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: boundaryFeatures,
        }
        const boundaryLayer = L.geoJSON(boundaryFc, {
          interactive: false,
          style: { color: '#8fa0ad', weight: 1.5, opacity: 0.9, dashArray: '5 4', fill: false },
        }).addTo(map)

        const bounds = boundaryLayer.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] })
          map.setMinZoom(15)
        }

        // Existing features — light, non-interactive context
        for (const f of features) {
          const kind = f.properties.layer
          const featureGeojson: GeoJSON.Feature = {
            type: 'Feature',
            properties: {},
            geometry: f.geometry,
          }
          if (kind === 'road' || kind === 'walkway') {
            L.geoJSON(featureGeojson, {
              interactive: false,
              style: { color: '#c9b9a2', weight: 2.2, opacity: 0.75 },
            }).addTo(map)
          } else if (kind === 'entrance') {
            L.geoJSON(featureGeojson, {
              interactive: false,
              pointToLayer: (_f, latlng) =>
                L.circleMarker(latlng, {
                  radius: 5,
                  color: '#9db8cf',
                  weight: 1,
                  fillColor: '#cfe0ef',
                  fillOpacity: 0.9,
                }),
            }).addTo(map)
          } else {
            L.geoJSON(featureGeojson, {
              interactive: false,
              style: {
                color: '#aab6c2',
                weight: 0.8,
                fillColor: '#d7dde4',
                fillOpacity: 0.5,
              },
            }).addTo(map)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load editor context:', err)
      })

    /* ── Draw toolbar ── */
    const drawControl = new L.Control.Draw({
      position: 'bottomright',
      draw: drawOptionsFor(layer),
    })
    map.addControl(drawControl)

    const handleCreated = (e: { layer: L.Layer }) => {
      const drawn = e.layer
      if (activeLayer) {
        previewGroup.removeLayer(activeLayer)
        activeLayer = null
      }
      const styled = drawn as unknown as { setStyle?: (o: L.PathOptions) => void }
      styled.setStyle?.(ACTIVE_PATH_STYLE)
      previewGroup.addLayer(drawn)
      activeLayer = drawn

      const toGeo = drawn as unknown as { toGeoJSON: () => GeoJSON.Feature }
      onGeometryChange(toGeo.toGeoJSON().geometry ?? null)
    }

    map.on('draw:created', handleCreated as never)

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="admin-editor-map" />
}
