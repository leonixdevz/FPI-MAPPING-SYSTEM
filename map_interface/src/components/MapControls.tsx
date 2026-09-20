import { useState, useCallback } from 'react'
import type { CampusMapApi } from '../api'

interface MapControlsProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
}

export default function MapControls({ mapContainerRef }: MapControlsProps) {
  const [legendOpen, setLegendOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const getMapApi = useCallback(() => {
    const el = mapContainerRef.current
    if (!el) return null
    const api = el as unknown as CampusMapApi
    return {
      zoomIn: api.__campusZoomIn,
      zoomOut: api.__campusZoomOut,
      resetView: api.__campusResetView,
      showLocation: api.__campusShowLocation,
    }
  }, [mapContainerRef])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      setTimeout(() => setLocationError(null), 3000)
      return
    }

    setLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        getMapApi()?.showLocation?.(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
      },
      (err) => {
        setLocating(false)
        const msg = err.code === 1
          ? 'Location access denied'
          : err.code === 2
            ? 'Location unavailable'
            : 'Location timed out'
        setLocationError(msg)
        setTimeout(() => setLocationError(null), 3000)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [getMapApi])

  return (
    <>
      {/* ── Zoom controls ── */}
      <div className="map-controls-zoom">
        <button
          onClick={() => getMapApi()?.zoomIn?.()}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3.5V14.5M3.5 9H14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="map-controls-divider" />
        <button
          onClick={() => getMapApi()?.zoomOut?.()}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 9H14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Reset view ── */}
      <button
        className="map-controls-reset"
        onClick={() => getMapApi()?.resetView?.()}
        title="Reset view"
        aria-label="Reset view"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9a6 6 0 1 1 1.05 3.36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 12.36V9H6.36" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Legend toggle ── */}
      <button
        className="map-controls-legend-toggle"
        onClick={() => setLegendOpen(!legendOpen)}
        title="Toggle legend"
        aria-label="Toggle legend"
        aria-expanded={legendOpen}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="3" y="3" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
          <rect x="3" y="11" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.6"/>
          <path d="M9 5H15M9 13H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      {/* ── Locate Me ── */}
      <button
        className={`map-controls-locate ${locating ? 'map-controls-locate--active' : ''}`}
        onClick={handleLocateMe}
        title="Locate me"
        aria-label="Locate me"
        disabled={locating}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 2V5M9 13V16M2 9H5M13 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {locationError && (
        <div className="map-controls-toast">{locationError}</div>
      )}

      {/* ── Legend panel ── */}
      {legendOpen && (
        <div className="map-legend">
          <div className="map-legend-title">Legend</div>

          <div className="map-legend-section">
            <div className="map-legend-section-title">Buildings</div>
            <div className="map-legend-row">
              <span className="map-legend-swatch map-legend-swatch-building" />
              <span>Building footprint</span>
            </div>
          </div>

          <div className="map-legend-section">
            <div className="map-legend-section-title">Roads &amp; Paths</div>
            <div className="map-legend-row">
              <span className="map-legend-swatch map-legend-swatch-primary" />
              <span>Primary road</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-swatch map-legend-swatch-secondary" />
              <span>Secondary road</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-swatch map-legend-swatch-residential" />
              <span>Residential road</span>
            </div>
            <div className="map-legend-row">
              <span className="map-legend-swatch map-legend-swatch-footway" />
              <span>Footway</span>
            </div>
          </div>

          <div className="map-legend-footer">
            <span>Interactive — hover &amp; click buildings</span>
          </div>
        </div>
      )}
    </>
  )
}
