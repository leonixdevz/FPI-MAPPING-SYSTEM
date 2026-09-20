/**
 * Typed client for the FPI Campus backend API (`server/`).
 *
 * During development the Vite dev server proxies `/api` to Express
 * (see vite.config.ts); in production Express serves the built app and
 * the API from the same origin.
 */

export type FeatureLayer = 'building' | 'road' | 'walkway' | 'entrance'

export const FEATURE_LAYERS: FeatureLayer[] = ['building', 'road', 'walkway', 'entrance']

export const LAYER_LABELS: Record<FeatureLayer, string> = {
  building: 'Building',
  road: 'Road',
  walkway: 'Walkway',
  entrance: 'Entrance',
}

export interface CampusProperties {
  id: string
  layer: FeatureLayer
  name: string | null
  type: string | null
  description: string | null
  [key: string]: unknown
}

export interface CampusFeature extends GeoJSON.Feature {
  geometry: GeoJSON.Geometry
  properties: CampusProperties
}

export interface FeatureCounts {
  building: number
  road: number
  walkway: number
  entrance: number
}

export interface StatsResponse {
  counts: FeatureCounts
  total: number
}

export interface AuthResponse {
  token: string
  expiresAt: number
}

/**
 * Contract exposed on the Leaflet map's DOM node by Map.tsx so sibling
 * components (search bar, controls) can drive the map without prop drilling.
 */
export interface CampusMapApi {
  __campusResetView?: () => void
  __campusGetZoom?: () => number
  __campusZoomIn?: () => void
  __campusZoomOut?: () => void
  __campusFlyToFeature?: (id: string) => void
  __campusShowLocation?: (lat: number, lng: number, accuracy: number) => void
}

export type NewFeaturePayload = {
  layer: FeatureLayer
  name?: string | null
  type?: string | null
  description?: string | null
  highway?: string | null
  tags?: Record<string, unknown>
  geometry: GeoJSON.Geometry
}

/* ── Auth token helpers ── */

const TOKEN_KEY = 'fpi_admin_token'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/* ── Low-level fetch helpers ── */

async function handle<T>(request: Promise<Response>): Promise<T> {
  const res = await request
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* keep default message */
    }
    throw new ApiError(message, res.status)
  }
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function headers(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/* ── Public API ── */

export async function checkHealth(): Promise<{ status: string; db: boolean }> {
  try {
    return await handle<{ status: string; db: boolean }>(fetch('/api/health'))
  } catch {
    return { status: 'degraded', db: false }
  }
}

export async function fetchFeatures(): Promise<CampusFeature[]> {
  const fc = await handle<GeoJSON.FeatureCollection>(fetch('/api/features'))
  return (fc.features ?? []) as CampusFeature[]
}

export async function fetchBoundary(): Promise<GeoJSON.FeatureCollection> {
  return handle<GeoJSON.FeatureCollection>(fetch('/api/boundary'))
}

/* ── Auth ── */

export async function loginAdmin(username: string, password: string): Promise<AuthResponse> {
  return handle<AuthResponse>(
    fetch('/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, password }),
    }),
  )
}

export async function logoutAdmin(token: string): Promise<void> {
  await handle<{ ok: boolean }>(
    fetch('/api/auth/logout', { method: 'POST', headers: headers(token) }),
  ).catch(() => undefined)
}

/* ── Admin CRUD ── */

export async function fetchStats(token: string): Promise<StatsResponse> {
  return handle<StatsResponse>(fetch('/api/admin/stats', { headers: headers(token) }))
}

export async function createFeature(token: string, payload: NewFeaturePayload): Promise<void> {
  await handle<{ id: number }>(
    fetch('/api/admin/features', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    }),
  )
}

export async function updateFeature(
  token: string,
  id: string,
  payload: NewFeaturePayload,
): Promise<void> {
  await handle<{ id: number }>(
    fetch(`/api/admin/features/${id}`, {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify(payload),
    }),
  )
}

export async function deleteFeature(token: string, id: string, layer: FeatureLayer): Promise<void> {
  await handle<{ ok: boolean }>(
    fetch(`/api/admin/features/${id}?layer=${layer}`, {
      method: 'DELETE',
      headers: headers(token),
    }),
  )
}
