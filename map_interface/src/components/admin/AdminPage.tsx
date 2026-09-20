import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  FEATURE_LAYERS,
  LAYER_LABELS,
  clearAdminToken,
  createFeature,
  deleteFeature,
  fetchFeatures,
  fetchStats,
  getAdminToken,
  loginAdmin,
  logoutAdmin,
  saveAdminToken,
  updateFeature,
} from '../../api'
import type { CampusFeature, FeatureLayer } from '../../api'
import AdminMapEditor from './AdminMapEditor'
import './Admin.css'

/* ── Suggestion lists for the type/highway fields ── */
const BUILDING_TYPES = [
  'Academic Building', 'Lecture Hall', 'Hostel', 'Library', 'Laboratory',
  'Workshop', 'Health Centre', 'Administration Block', 'ICT Centre',
  'Hall/Conference', 'Sports Facility', 'Commercial/Enterprise', 'Other',
]
const ENTRANCE_TYPES = ['Main Gate', 'Building Entrance', 'Pedestrian Gate', 'Vehicle Gate', 'Other']
const HIGHWAY_TYPES = ['primary', 'primary_link', 'secondary', 'residential', 'service', 'unclassified', 'footway']

/* Top-level property keys that must never be stored in the tags jsonb bag. */
const TAG_RESERVED = new Set(['id', 'layer', 'name', 'type', 'description', 'highway', 'tags'])

interface FormState {
  layer: FeatureLayer
  featureId: string | null // null while creating
  name: string
  type: string
  description: string
  highway: string
  geometry: GeoJSON.Geometry | null
}

function emptyForm(layer: FeatureLayer): FormState {
  return {
    layer,
    featureId: null,
    name: '',
    type: '',
    description: '',
    highway: 'residential',
    geometry: null,
  }
}

function formFromFeature(f: CampusFeature): FormState {
  return {
    layer: f.properties.layer,
    featureId: f.properties.id,
    name: f.properties.name ?? '',
    type: f.properties.type ?? '',
    description: f.properties.description ?? '',
    highway: (f.properties.highway as string) ?? '',
    geometry: f.geometry,
  }
}

/* ── Login screen ── */
function LoginView({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await loginAdmin(username.trim(), password)
      saveAdminToken(res.token)
      onLogin(res.token)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <h1>Admin Dashboard</h1>
        <p className="admin-login-sub">
          Campus Feature Administration — Federal Polytechnic Ilaro
        </p>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="admin-login-back" href="#">
          ← Back to map
        </a>
      </form>
    </div>
  )
}

/* ── Dashboard ── */
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => getAdminToken())
  const [stats, setStats] = useState<{ counts: Record<FeatureLayer, number>; total: number } | null>(null)
  const [features, setFeatures] = useState<CampusFeature[] | null>(null)
  const [filter, setFilter] = useState<'all' | FeatureLayer>('all')
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const invalidate = useCallback(() => {
    clearAdminToken()
    setToken(null)
    setFeatures(null)
    setStats(null)
    setForm(null)
  }, [])

  const loadAll = useCallback(async () => {
    if (!token) return
    try {
      const [statRes, featRes] = await Promise.all([fetchStats(token), fetchFeatures()])
      setStats(statRes)
      setFeatures(featRes)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) invalidate()
      else setNotice(err instanceof Error ? err.message : 'Failed to load features.')
    }
  }, [token, invalidate])

  // Bootstrap data load for a restored session; runs once per token change.
  // loadAll() only sets state after its awaited fetches resolve, but the
  // linter can't see through the async boundary — disable just this effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (token) loadAll()
  }, [token, loadAll])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = async () => {
    if (token) await logoutAdmin(token).catch(() => undefined)
    invalidate()
  }

  const filtered = useMemo(() => {
    if (!features) return []
    if (filter === 'all') return features
    return features.filter((f) => f.properties.layer === filter)
  }, [features, filter])

  const updateForm = (patch: Partial<FormState>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))

  const handleSave = async () => {
    if (!form || !token) return
    if (!form.geometry) {
      setNotice('Draw the feature on the map first.')
      return
    }
    // When editing, keep the feature's existing loose attributes (OSM tags,
    // osm_id provenance, …) — the form only edits the dedicated columns.
    let tags: Record<string, unknown> = {}
    if (form.featureId) {
      const existing = features?.find((f) => f.properties.id === form.featureId)
      if (existing) {
        tags = Object.fromEntries(
          Object.entries(existing.properties)
            .filter(([k, v]) => !TAG_RESERVED.has(k) && v !== null && v !== undefined),
        )
      }
    }

    const payload = {
      layer: form.layer,
      name: form.name.trim() || null,
      type: form.type.trim() || null,
      description: form.description.trim() || null,
      highway: (form.layer === 'road' || form.layer === 'walkway')
        ? (form.highway.trim() || null)
        : undefined,
      tags,
      geometry: form.geometry,
    }
    setSaving(true)
    try {
      if (form.featureId) await updateFeature(token, form.featureId, payload)
      else await createFeature(token, payload)
      setNotice(form.featureId ? 'Feature updated.' : 'Feature created.')
      setForm(null)
      await loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) invalidate()
      else setNotice(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (f: CampusFeature) => {
    if (!token) return
    const label = f.properties.name || `${LAYER_LABELS[f.properties.layer]} #${f.properties.id}`
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await deleteFeature(token, f.properties.id, f.properties.layer)
      setNotice('Feature deleted.')
      if (form?.featureId === f.properties.id) setForm(null)
      await loadAll()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) invalidate()
      else setNotice(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!token) return <LoginView onLogin={setToken} />

  return (
    <div className="admin-app">
      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-title">
          <span className="admin-header-logo">FPI</span>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Campus Feature Administration</p>
          </div>
        </div>
        <nav className="admin-header-actions">
          <a className="admin-btn" href="#">
            View public map
          </a>
          <button className="admin-btn" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="admin-body">
        {/* ── Left: stats, filters, list, form ── */}
        <aside className="admin-side">
          {notice && (
            <div className="admin-notice" role="status">
              <span>{notice}</span>
              <button aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
            </div>
          )}

          {/* Summary cards */}
          <div className="admin-stats">
            {FEATURE_LAYERS.map((layer) => (
              <button
                key={layer}
                className="admin-stat"
                onClick={() => setFilter(layer === filter ? 'all' : layer)}
                title={`Show ${LAYER_LABELS[layer]}s`}
              >
                <span className="admin-stat-value">{stats?.counts[layer] ?? '—'}</span>
                <span className="admin-stat-label">{LAYER_LABELS[layer]}s</span>
              </button>
            ))}
          </div>

          {/* Add / filters */}
          <div className="admin-toolbar">
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setForm(emptyForm('building'))}
            >
              + Add location
            </button>
            <select
              aria-label="Filter by type"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | FeatureLayer)}
            >
              <option value="all">All types</option>
              {FEATURE_LAYERS.map((layer) => (
                <option key={layer} value={layer}>{LAYER_LABELS[layer]}s</option>
              ))}
            </select>
          </div>

          {/* Feature list */}
          <div className="admin-list">
            {!features ? (
              <div className="admin-empty">
                {notice ? 'Could not load features.' : 'Loading features…'}
              </div>
            ) : filtered.length === 0 ? (
              <div className="admin-empty">
                No {filter === 'all' ? '' : `${LAYER_LABELS[filter as FeatureLayer].toLowerCase()} `}
                features yet — use “+ Add location”.
              </div>
            ) : (
              filtered.map((f) => {
                const isEditing = form?.featureId === f.properties.id
                return (
                  <div
                    key={`${f.properties.layer}-${f.properties.id}`}
                    className={`admin-row ${isEditing ? 'admin-row--active' : ''}`}
                    onClick={() => {
                      if (form?.featureId === f.properties.id) return
                      setForm(formFromFeature(f))
                    }}
                  >
                    <div className={`admin-row-badge admin-row-badge--${f.properties.layer}`}>
                      {f.properties.layer === 'building' || f.properties.layer === 'entrance' ? '▣' : '▬'}
                    </div>
                    <div className="admin-row-main">
                      <div className="admin-row-name">
                        {f.properties.name || <em>Unnamed {LAYER_LABELS[f.properties.layer].toLowerCase()}</em>}
                      </div>
                      <div className="admin-row-meta">
                        {[f.properties.type, f.properties.description]
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(' · ') || LAYER_LABELS[f.properties.layer]}
                      </div>
                    </div>
                    <div
                      className="admin-row-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="admin-btn admin-btn-small"
                        onClick={() => setForm(formFromFeature(f))}
                        title={`Edit ${f.properties.id}`}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-small admin-btn-danger"
                        onClick={() => handleDelete(f)}
                        title="Delete feature"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Editor form */}
          {form && (
            <div className="admin-form-card">
              <div className="admin-form-head">
                <h2>{form.featureId ? `Edit ${LAYER_LABELS[form.layer]}` : 'Add location'}</h2>
                <button className="admin-btn admin-btn-small" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>

              {!form.featureId && (
                <label>
                  Type
                  <select
                    value={form.layer}
                    onChange={(e) => updateForm({ layer: e.target.value as FeatureLayer, geometry: null })}
                  >
                    {FEATURE_LAYERS.map((layer) => (
                      <option key={layer} value={layer}>
                        {LAYER_LABELS[layer]} — new
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder={form.layer === 'building' ? 'e.g. Computer Science Building' : 'e.g. Main Gate'}
                />
              </label>

              {form.layer === 'road' || form.layer === 'walkway' ? (
                <label>
                  Classification
                  <select value={form.highway} onChange={(e) => updateForm({ highway: e.target.value })}>
                    {HIGHWAY_TYPES.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Type
                  <input
                    list={form.layer === 'building' ? 'fpi-building-types' : 'fpi-entrance-types'}
                    value={form.type}
                    onChange={(e) => updateForm({ type: e.target.value })}
                    placeholder={form.layer === 'building' ? 'e.g. Academic Building' : 'e.g. Main Gate'}
                  />
                  <datalist id="fpi-building-types">
                    {BUILDING_TYPES.map((t) => <option key={t} value={t} />)}
                  </datalist>
                  <datalist id="fpi-entrance-types">
                    {ENTRANCE_TYPES.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </label>
              )}

              <label>
                Description
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  placeholder="Optional notes shown to map users"
                />
              </label>

              <div className="admin-geometry-hint">
                {form.geometry
                  ? <span className="admin-geometry-ok">✓ Geometry captured — draw again to replace it.</span>
                  : <span className="admin-geometry-missing">Draw the {form.layer} on the map with the toolbar (top-right of map).</span>}
              </div>

              <div className="admin-form-actions">
                <button
                  className="admin-btn admin-btn-primary"
                  disabled={saving || !form.geometry}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : form.featureId ? 'Update feature' : 'Save feature'}
                </button>
                {form.featureId && (
                  <button
                    className="admin-btn admin-btn-danger"
                    disabled={saving}
                    onClick={() => {
                      const f = features?.find((x) => x.properties.id === form.featureId)
                      if (f) handleDelete(f)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Right: geometry editor map ── */}
        <section className="admin-mapwrap">
          {form ? (
            <AdminMapEditor
              key={`${form.layer}-${form.featureId ?? 'new'}`}
              layer={form.layer}
              initialGeometry={form.geometry}
              onGeometryChange={(geometry) => updateForm({ geometry })}
            />
          ) : (
            <div className="admin-map-empty">
              <div>
                <strong>Select a feature to edit</strong>
                <p>…or click “+ Add location” to draw a new building, road, walkway or entrance on the map.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
