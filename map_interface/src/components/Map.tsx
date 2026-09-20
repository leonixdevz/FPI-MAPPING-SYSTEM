import { useEffect, useRef, useState, useCallback, forwardRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchFeatures, fetchBoundary } from '../api'
import type { CampusFeature, CampusMapApi, CampusProperties, FeatureLayer } from '../api'

/** Typed FeatureCollection helper (Leaflet's GeoJSON types are fussy). */
function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features }
}

/* ── Path visual hierarchy by highway type ── */
const PATH_STYLES: Record<string, { color: string; weight: number; opacity: number }> = {
  primary:       { color: '#7a6b52', weight: 4, opacity: 0.9 },
  primary_link:  { color: '#7a6b52', weight: 3, opacity: 0.8 },
  secondary:     { color: '#8b7a62', weight: 3.5, opacity: 0.85 },
  residential:   { color: '#9c8b74', weight: 2.5, opacity: 0.8 },
  service:       { color: '#9c8b74', weight: 2.2, opacity: 0.75 },
  unclassified:  { color: '#a09582', weight: 2, opacity: 0.75 },
  footway:       { color: '#b5a890', weight: 1.5, opacity: 0.7 },
}

const DEFAULT_PATH_STYLE = { color: '#a09582', weight: 2, opacity: 0.75 }

function getPathStyle(props: Record<string, unknown>) {
  const highway = (props.highway as string) || ''
  return PATH_STYLES[highway] || DEFAULT_PATH_STYLE
}

/* ── Base styling per feature kind (polygon footprint vs entrance point) ── */
const STYLE_BY_LAYER: Record<FeatureLayer, L.PathOptions> = {
  building: { fillColor: '#c5d1de', fillOpacity: 0.7, color: '#7a92a8', weight: 1 },
  entrance: { fillColor: '#3b82c4', fillOpacity: 0.9, color: '#1d4e79', weight: 1.5 },
  road: { fillColor: '#c5d1de', fillOpacity: 0, color: 'transparent', weight: 0 },
  walkway: { fillColor: '#c5d1de', fillOpacity: 0, color: 'transparent', weight: 0 },
}

const SELECTED_STYLE: L.PathOptions = { fillColor: '#a8c4e0', fillOpacity: 0.85, color: '#2d5a80', weight: 2.5 }
const HOVER_STYLE: L.PathOptions = { fillColor: '#b8d4e8', fillOpacity: 0.85, color: '#3a7aa0', weight: 3 }

function baseStyleFor(feature: CampusFeature, isSelected: boolean): L.PathOptions {
  if (isSelected && feature.properties.layer !== 'road' && feature.properties.layer !== 'walkway') {
    return SELECTED_STYLE
  }
  const base = STYLE_BY_LAYER[feature.properties.layer]
  if (base) return { ...base }
  return { fillColor: '#c5d1de', fillOpacity: 0.7, color: '#7a92a8', weight: 1 }
}

/** Zoom to a polygon/line by bounds, or a point by its latlng. */
function zoomToLayer(map: L.Map, layer: L.Layer) {
  const path = layer as L.Path
  if (typeof (path as unknown as L.CircleMarker).getLatLng === 'function') {
    const ll = (path as unknown as L.CircleMarker).getLatLng()
    map.setView(ll, Math.max(map.getZoom(), 17), { animate: true })
    return
  }
  if (typeof (path as unknown as L.Polygon).getBounds === 'function') {
    const bounds = (path as unknown as L.Polygon).getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true, duration: 0.5 })
    }
  }
}

/* ── Component ── */
interface MapProps {
  onFeatureSelect?: (feature: CampusFeature | null) => void
  selectedFeatureId?: string | null
}

const Map = forwardRef<HTMLDivElement, MapProps>(function Map({ onFeatureSelect, selectedFeatureId }, ref) {
  const mapRef = useRef<HTMLDivElement>(null)

  const setRef = useCallback((node: HTMLDivElement | null) => {
    mapRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
  }, [ref])
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layersRef = useRef<{
    footprints: L.GeoJSON | null
    points: L.GeoJSON | null
    paths: L.GeoJSON | null
    boundaryBounds: L.LatLngBounds | null
  }>({ footprints: null, points: null, paths: null, boundaryBounds: null })
  const [isLoaded, setIsLoaded] = useState(false)

  /* ── Initialize map + load API data ── */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [6.894, 2.985],
      zoom: 16,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      minZoom: 1,
      maxZoom: 25,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    })
    map.getContainer().style.background = '#f0ede8'
    mapInstanceRef.current = map

    /* ── Load features + boundary from the spatial database API ── */
    /* `cancelled` guards against React StrictMode double-mounting in dev: the
       first map instance is removed by cleanup before its fetch resolves, and
       adding layers to that removed map throws
       `Cannot read properties of undefined (reading 'appendChild')`. */
    let cancelled = false
    Promise.all([fetchFeatures(), fetchBoundary()])
      .then(([features, boundaryData]) => {
        if (cancelled || mapInstanceRef.current !== map) return
        const combinedBounds = L.latLngBounds([])

        /* Paths (roads + walkways) — rendered first, non-interactive */
        const pathFeatures = features.filter(
          (f) => f.properties.layer === 'road' || f.properties.layer === 'walkway',
        )
        const pathsLayer = L.geoJSON(
          fc(pathFeatures as GeoJSON.Feature[]),
          {
            style: (feature) => {
              if (!feature?.properties) return DEFAULT_PATH_STYLE
              return getPathStyle(feature.properties as Record<string, unknown>)
            },
            interactive: false,
          },
        ).addTo(map)

        const pb = pathsLayer.getBounds()
        if (pb.isValid()) combinedBounds.extend(pb)
        layersRef.current.paths = pathsLayer

        /* Building footprints (polygons) + entrances (points) — interactive */
        let hoveredLayer: L.Path | null = null

        const attachInteraction = (feature: CampusFeature, layer: L.Layer) => {
          const pathLayer = layer as L.Path
          const props = feature.properties

          // Hover tooltip for named features
          if (props.name || props.type) {
            pathLayer.bindTooltip(props.name || props.type || '', {
              direction: 'top',
              offset: [0, -6],
              opacity: 1,
              className: 'building-hover-tooltip',
            })
          }

          pathLayer.on({
            mouseover: (e) => {
              const l = e.target as L.Path
              l.setStyle(HOVER_STYLE)
              l.bringToFront()
              hoveredLayer = l
              map.getContainer().style.cursor = 'pointer'
              if (props.name || props.type) l.openTooltip()
            },
            mouseout: (e) => {
              const l = e.target as L.Path
              if (hoveredLayer === l) {
                hoveredLayer.setStyle(baseStyleFor(feature, selectedFeatureId === props.id))
                hoveredLayer.closeTooltip()
                hoveredLayer = null
              }
              map.getContainer().style.cursor = ''
            },
            click: () => {
              onFeatureSelect?.(feature)
              zoomToLayer(map, pathLayer)
            },
          })
        }

        const footprintFeatures = features.filter((f) => f.properties.layer === 'building')
        const footprintsLayer = L.geoJSON(
          fc(footprintFeatures as GeoJSON.Feature[]),
          {
            style: (feature) =>
              baseStyleFor(
                feature as unknown as CampusFeature,
                selectedFeatureId === (feature?.properties as CampusProperties | undefined)?.id,
              ),
            onEachFeature: (feature, layer) =>
              attachInteraction(feature as unknown as CampusFeature, layer),
          },
        ).addTo(map)

        const fb = footprintsLayer.getBounds()
        if (fb.isValid()) combinedBounds.extend(fb)
        layersRef.current.footprints = footprintsLayer

        /* Entrance / point features */
        const pointFeatures = features.filter((f) => f.properties.layer === 'entrance')
        const pointsLayer = L.geoJSON(
          fc(pointFeatures as GeoJSON.Feature[]),
          {
            pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 7 }),
            style: (feature) =>
              baseStyleFor(
                feature as unknown as CampusFeature,
                selectedFeatureId === (feature?.properties as CampusProperties | undefined)?.id,
              ),
            onEachFeature: (feature, layer) =>
              attachInteraction(feature as unknown as CampusFeature, layer),
          },
        ).addTo(map)
        layersRef.current.points = pointsLayer

        /* ── Boundary: mask + outline (zoom-dependent) ── */
        const boundaryFeatures = (boundaryData.features ?? []) as GeoJSON.Feature[]
        const boundaryCoords = boundaryFeatures[0]?.geometry?.type === 'Polygon'
          ? (boundaryFeatures[0].geometry as GeoJSON.Polygon).coordinates[0]
          : null

        if (boundaryCoords) {
          const outerRing: L.LatLngExpression[] = [
            [-180, -90], [-180, 90], [180, 90], [180, -90],
          ]
          const innerRing: L.LatLngExpression[] = boundaryCoords
            .map((c) => [c[1], c[0]] as L.LatLngExpression)
            .reverse()

          const boundaryMask = L.polygon([outerRing, innerRing], {
            stroke: false,
            fillColor: '#e8e4dd',
            fillOpacity: 0.55,
            interactive: false,
          }).addTo(map)

          const boundaryOutline = L.geoJSON(
            fc(boundaryFeatures),
            {
              interactive: false,
              style: {
                color: '#a09582',
                weight: 1.5,
                opacity: 0.6,
                dashArray: '6 4',
                fill: false,
              },
            },
          ).addTo(map)

          const updateBoundaryZoom = () => {
            const z = map.getZoom()
            const maskOpacity = Math.max(0.15, 0.55 - (z - 16) * 0.2)
            boundaryMask.setStyle({ fillOpacity: maskOpacity })
            const outlineWeight = Math.max(0.8, 1.5 - (z - 16) * 0.35)
            const outlineOpacity = Math.max(0.2, 0.6 - (z - 16) * 0.2)
            boundaryOutline.setStyle({ weight: outlineWeight, opacity: outlineOpacity })
          }

          updateBoundaryZoom()
          map.on('zoomend', updateBoundaryZoom)
        }

        const boundaryLayer = L.geoJSON(fc(boundaryFeatures), { interactive: false })
        const boundaryBounds = boundaryLayer.getBounds()

        if (boundaryBounds.isValid()) {
          layersRef.current.boundaryBounds = boundaryBounds
          map.setMaxBounds(boundaryBounds)
          map.setMinZoom(16)
          map.setMaxZoom(18)
          map.invalidateSize()
          map.fitBounds(boundaryBounds, { padding: [40, 40] })
        }

        setIsLoaded(true)
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load campus data from API:', err)
      })

    return () => {
      cancelled = true
      map.remove()
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Update styles when the selection changes ── */
  useEffect(() => {
    const { footprints, points } = layersRef.current
    if (!footprints || !points) return
    const restyle = (layer: L.GeoJSON) =>
      layer.setStyle((feature) => {
        if (!feature?.properties) return {}
        const props = feature.properties as CampusProperties
        return baseStyleFor(
          feature as unknown as CampusFeature,
          selectedFeatureId === props.id,
        )
      })
    restyle(footprints)
    restyle(points)
  }, [selectedFeatureId])

  /* ── Expose map API to sibling components (search, controls) ── */
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const container = map.getContainer()
    const resetBounds = layersRef.current.boundaryBounds || layersRef.current.footprints?.getBounds()

    const findLayerById = (featureId: string): L.Layer | null => {
      const { footprints, points } = layersRef.current
      let found: L.Layer | null = null
      const scan = (group: L.GeoJSON | null) => {
        if (!group || found) return
        group.eachLayer((layer) => {
          const l = layer as L.Layer & { feature?: CampusFeature }
          if (l.feature?.properties?.id === featureId) found = layer
        })
      }
      scan(footprints)
      scan(points)
      return found
    }

    if (resetBounds && resetBounds.isValid()) {
      const mapApi = container as unknown as CampusMapApi
      mapApi.__campusResetView = () => {
        map.fitBounds(resetBounds, { padding: [40, 40], animate: true, duration: 0.5 })
      }
      mapApi.__campusGetZoom = () => map.getZoom()
      mapApi.__campusZoomIn = () => map.zoomIn(0.5)
      mapApi.__campusZoomOut = () => map.zoomOut(0.5)
      mapApi.__campusFlyToFeature = (featureId: string) => {
        const target = findLayerById(featureId)
        if (target) zoomToLayer(map, target)
      }

      /* Locate Me — pulsing blue dot marker */
      let locationMarker: L.Marker | null = null
      let accuracyCircle: L.Circle | null = null

      mapApi.__campusShowLocation = (lat: number, lng: number, accuracy: number) => {
        if (locationMarker) { map.removeLayer(locationMarker); locationMarker = null }
        if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null }

        const accRadius = Math.max(accuracy || 50, 20)
        accuracyCircle = L.circle([lat, lng], {
          radius: accRadius,
          color: '#3b82c4',
          fillColor: '#3b82c4',
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.4,
          interactive: false,
        }).addTo(map)

        const dotIcon = L.divIcon({
          className: 'user-location-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: '<div class="user-location-dot"><div class="user-location-pulse"></div></div>',
        })

        locationMarker = L.marker([lat, lng], { icon: dotIcon, zIndexOffset: 2000 }).addTo(map)

        const circleBounds = accuracyCircle.getBounds()
        map.fitBounds(circleBounds, { padding: [40, 40], maxZoom: 18, animate: true, duration: 0.6 })
      }
    }
  }, [isLoaded])

  return (
    <div
      ref={setRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#f0ede8',
        borderRadius: 'inherit',
      }}
    />
  )
})

export default Map
