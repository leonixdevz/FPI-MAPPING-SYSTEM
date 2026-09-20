import { useState, useEffect, useRef, useCallback } from 'react'
import Map from './components/Map'
import MapControls from './components/MapControls'
import SearchBar from './components/SearchBar'
import BuildingInfo from './components/BuildingInfo'
import AdminPage from './components/admin/AdminPage'
import { checkHealth } from './api'
import type { CampusFeature } from './api'
import './App.css'

/** Minimal hash router: `#/admin` shows the admin dashboard. */
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash
}

function App() {
  const hash = useHashRoute()
  const isAdminRoute = hash.startsWith('#/admin')

  const [selectedFeature, setSelectedFeature] = useState<CampusFeature | null>(null)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  /* ── Probe the API once on mount (public map is DB/API driven now) ── */
  useEffect(() => {
    let cancelled = false
    checkHealth().then((h) => {
      if (!cancelled) setBackendOnline(h.db)
    })
    return () => { cancelled = true }
  }, [])

  const handleFeatureSelect = useCallback((feature: CampusFeature | null) => {
    setSelectedFeature(feature)
  }, [])

  const handleCloseInfo = useCallback(() => {
    setSelectedFeature(null)
  }, [])

  if (isAdminRoute) {
    return <AdminPage />
  }

  return (
    <div className="campus-map-app">
      {/* ── Header ── */}
      <header className="campus-map-header">
        <div className="campus-map-header-left">
          <div className="campus-map-logo">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="4" y="8" width="5" height="9" rx="0.8" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="0.8"/>
              <rect x="13" y="5" width="5" height="12" rx="0.8" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="0.8"/>
              <path d="M9 11H13" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 1"/>
            </svg>
          </div>
          <div className="campus-map-title-group">
            <h1 className="campus-map-title">Campus Map</h1>
            <span className="campus-map-subtitle">Interactive Building Directory</span>
          </div>
        </div>
        <a className="campus-map-header-admin" href="#/admin">
          Admin
        </a>
      </header>

      {/* ── Map area ── */}
      <main className="campus-map-main">
        <div className="campus-map-container">
          <Map
            ref={mapContainerRef}
            onFeatureSelect={handleFeatureSelect}
            selectedFeatureId={selectedFeature?.properties?.id ?? null}
          />
        </div>

        {/* ── Search bar ── */}
        <SearchBar mapContainerRef={mapContainerRef} onBuildingSelect={handleFeatureSelect} />

        {/* ── Floating controls ── */}
        <MapControls mapContainerRef={mapContainerRef} />

        {/* ── Feature info panel ── */}
        {selectedFeature && (
          <BuildingInfo
            name={selectedFeature.properties.name}
            properties={selectedFeature.properties as unknown as Record<string, unknown>}
            onClose={handleCloseInfo}
          />
        )}
      </main>

      {/* ── Backend offline notice ── */}
      {backendOnline === false && (
        <div className="campus-api-warning" role="status">
          <strong>Backend / database offline.</strong>
          <span>
            Campus data is served from the PostGIS API — start the database and API
            server (see <code>server/README.md</code>), then reload.
          </span>
        </div>
      )}
    </div>
  )
}

export default App
