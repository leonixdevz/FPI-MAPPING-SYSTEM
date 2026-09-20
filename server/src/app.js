import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query, ping } from './db.js'
import { login, logout, requireAuth } from './auth.js'
import {
  LAYERS,
  LAYER_KEYS,
  isLayer,
  validateGeometry,
  attributeColumns,
  sqlFragments,
  buildFeatureCollection,
} from './features.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json({ limit: '4mb' }))

/* ─────────────────────────── Public API ─────────────────────────── */

// Health probe — the web app shows a banner when this is unreachable.
app.get('/api/health', async (_req, res) => {
  try {
    await ping()
    res.json({ status: 'ok', db: true })
  } catch {
    res.json({ status: 'degraded', db: false })
  }
})

// All public map layers as one GeoJSON FeatureCollection.
app.get('/api/features', async (_req, res, next) => {
  try {
    const fc = await buildFeatureCollection(LAYER_KEYS, query)
    res.json(fc)
  } catch (err) {
    next(err)
  }
})

// Campus boundary polygon (view framing, panning constraints, mask).
app.get('/api/boundary', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT name, ST_AsGeoJSON(geometry) AS geometry_geojson
         FROM campus_boundary WHERE id = 1`,
    )
    const row = rows[0]
    res.json({
      type: 'FeatureCollection',
      features: row
        ? [{
            type: 'Feature',
            properties: { id: '1', name: row.name ?? 'Campus boundary' },
            geometry: JSON.parse(row.geometry_geojson),
          }]
        : [],
    })
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────── Auth ─────────────────────────── */

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {}
  const session = login(String(username ?? ''), String(password ?? ''))
  if (!session) {
    return res.status(401).json({ error: 'Invalid username or password.' })
  }
  res.json({ token: session.token, expiresAt: session.expiresAt })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || ''
  logout(header.slice(7))
  res.json({ ok: true })
})

/* ─────────────────────────── Admin CRUD ─────────────────────────── */

const ADMIN_PREFIX = '/api/admin'

// Feature counts per layer — powers the dashboard summary cards.
app.get(`${ADMIN_PREFIX}/stats`, requireAuth, async (_req, res, next) => {
  try {
    const counts = {}
    for (const layer of LAYER_KEYS) {
      const { rows } = await query(`SELECT COUNT(*)::int AS n FROM ${LAYERS[layer].table}`)
      counts[layer] = rows[0].n
    }
    res.json({ counts, total: LAYER_KEYS.reduce((s, k) => s + counts[k], 0) })
  } catch (err) {
    next(err)
  }
})

// Full feature list with geometry (the editor needs it to draw context).
app.get(`${ADMIN_PREFIX}/features`, requireAuth, async (_req, res, next) => {
  try {
    const fc = await buildFeatureCollection(LAYER_KEYS, query)
    res.json(fc)
  } catch (err) {
    next(err)
  }
})

// Create — adds a feature to the layer's PostGIS table.
app.post(`${ADMIN_PREFIX}/features`, requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const layer = body.layer
    if (!isLayer(layer)) {
      return res.status(400).json({ error: `Unknown layer "${layer}".` })
    }
    const { columns, values } = attributeColumns(layer, body)
    const cols = [...columns, 'geometry']
    const fragments = sqlFragments(cols)
    const params = cols.map((c) => (c === 'geometry' ? validateGeometry(layer, body.geometry) : values[c]))

    const sql = `
      INSERT INTO ${LAYERS[layer].table} (${cols.join(', ')})
      VALUES (${fragments.join(', ')})
      RETURNING id, ST_AsGeoJSON(geometry) AS geometry_geojson`

    const { rows } = await query(sql, params)
    res.status(201).json({
      id: rows[0].id,
      layer,
      ...values,
      geometry: JSON.parse(rows[0].geometry_geojson),
    })
  } catch (err) {
    next(err)
  }
})

// Update — overwrites attributes and, when supplied, the geometry.
app.put(`${ADMIN_PREFIX}/features/:id`, requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const layer = body.layer
    if (!isLayer(layer)) {
      return res.status(400).json({ error: `Unknown layer "${layer}".` })
    }
    const featureId = Number(req.params.id)
    if (!Number.isInteger(featureId) || featureId < 1) {
      return res.status(400).json({ error: 'Invalid feature id.' })
    }

    const { columns, values } = attributeColumns(layer, body)

    const sets = []
    const params = []
    for (const col of columns) {
      params.push(values[col])
      sets.push(`${col} = $${params.length}`)
    }
    // Replace geometry only when the client supplied a new one.
    if (body.geometry) {
      const frag = sqlFragments(['geometry'])[0]
      params.push(validateGeometry(layer, body.geometry))
      sets.push(`geometry = ${frag.replace('$1', `$${params.length}`)}`)
    }
    params.push(featureId)
    sets.push('updated_at = now()')

    const sql = `
      UPDATE ${LAYERS[layer].table}
      SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING id, ST_AsGeoJSON(geometry) AS geometry_geojson`

    const { rows } = await query(sql, params)
    if (!rows[0]) {
      return res.status(404).json({ error: `No ${layer} with id ${featureId}.` })
    }
    res.json({
      id: rows[0].id,
      layer,
      ...values,
      geometry: JSON.parse(rows[0].geometry_geojson),
    })
  } catch (err) {
    next(err)
  }
})

// Delete — removes the feature from its PostGIS table.
app.delete(`${ADMIN_PREFIX}/features/:id`, requireAuth, async (req, res, next) => {
  try {
    const layer = req.query.layer
    if (!isLayer(layer)) {
      return res.status(400).json({ error: 'A valid ?layer= query is required.' })
    }
    const featureId = Number(req.params.id)
    if (!Number.isInteger(featureId) || featureId < 1) {
      return res.status(400).json({ error: 'Invalid feature id.' })
    }

    const { rowCount } = await query(
      `DELETE FROM ${LAYERS[layer].table} WHERE id = $1`,
      [featureId],
    )
    if (rowCount === 0) {
      return res.status(404).json({ error: `No ${layer} with id ${featureId}.` })
    }
    res.json({ ok: true, deleted: rowCount })
  } catch (err) {
    next(err)
  }
})

/* ─────────── Production: serve the built web app ─────────── */

const distDir = path.resolve(__dirname, '../../map_interface/dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA fallback — anything non-API resolves to the app shell.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

/* ─────────── Errors ─────────── */

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : 'Unexpected server error.'
  // Validation/geometry mistakes -> 400; body-parser sets err.status = 400 too.
  const isValidation = /geometry|layer|requires|Invalid|Unknown/.test(message)
  const status = isValidation || (err.status && err.status < 500) ? 400 : 500
  console.error('[api]', err)
  res.status(status).json({ error: message })
})

export default app
