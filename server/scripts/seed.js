/**
 * Imports the QGIS/GeoJSON exports into the PostGIS feature tables.
 *
 * This is the hand-off point between QGIS (data preparation) and the live
 * spatial database: `map_interface/public/data/*.geojson` is the canonical
 * prepared dataset and this script (re)loads it into PostgreSQL.
 *
 *   pnpm db:seed
 *
 * Mappings:
 *   buildings.geojson        -> buildings (Polygon)
 *   path.geojson             -> roads (LineString)   [highway not a footway/path]
 *                              -> walkways (LineString) [footway, path, steps, …]
 *   overall_boundary.geojson -> campus_boundary (single Polygon)
 */
import fs from 'node:fs'
import path from 'node:path'
import { pool } from '../src/db.js'
import { config } from '../src/config.js'

const WALKWAY_HIGHWAYS = new Set([
  'footway', 'path', 'steps', 'pedestrian', 'cycleway', 'bridleway', 'track',
])

function readGeojson(fileName) {
  const file = path.join(config.geojsonDir, fileName)
  if (!fs.existsSync(file)) {
    throw new Error(`Missing GeoJSON export: ${file}`)
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  return raw.type === 'FeatureCollection' ? raw.features : []
}

/** Strip nulls/empties and OSM bookkeeping from a properties object. */
function cleanTags(props) {
  const tags = {}
  for (const [k, v] of Object.entries(props ?? {})) {
    if (k === '@id') continue
    if (v === null || v === undefined || v === '') continue
    tags[k] = v
  }
  return tags
}

async function insertLayer(client, layer, rows) {
  const { table, highway } = layer
  for (const feature of rows) {
    const p = feature.properties ?? {}
    const tags = cleanTags(p)
    if (p.id) tags.osm_id = String(p.id)

    const geometry = JSON.stringify(feature.geometry)
    const params = [p.name ?? null, p.type ?? null, p.description ?? null, tags]
    let sql = `INSERT INTO ${table} (name, type, description, tags, geometry) VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))`
    if (highway) {
      sql = `INSERT INTO ${table} (name, type, description, highway, tags, geometry) VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))`
      params.splice(4, 0, p.highway ?? highway)
    }
    params.push(geometry)
    await client.query(sql, params)
  }
}

const client = await pool.connect()
try {
  await client.query('BEGIN')

  console.log('Clearing feature tables …')
  for (const table of ['buildings', 'roads', 'walkways', 'entrances', 'campus_boundary']) {
    await client.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`)
  }

  /* 1 ── Buildings ─────────────────────────────────────────────── */
  const buildingFeatures = readGeojson('buildings.geojson').filter(
    (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'),
  )
  console.log(`Seeding ${buildingFeatures.length} buildings …`)
  await insertLayer(client, { table: 'buildings' }, buildingFeatures)

  /* 2 ── Roads + walkways (split by highway tag) ───────────────── */
  const paths = readGeojson('path.geojson').filter(
    (f) => f.geometry && f.geometry.type === 'LineString',
  )
  const roads = []
  const walkways = []
  for (const f of paths) {
    const highway = f.properties?.highway ?? ''
    ;(WALKWAY_HIGHWAYS.has(highway) ? walkways : roads).push(f)
  }
  console.log(`Seeding ${roads.length} roads and ${walkways.length} walkways …`)
  await insertLayer(client, { table: 'roads', highway: null }, roads)
  await insertLayer(client, { table: 'walkways', highway: null }, walkways)

  /* 3 ── Campus boundary ───────────────────────────────────────── */
  const boundaryFeatures = readGeojson('overall_boundary.geojson')
  const boundary = boundaryFeatures.find(
    (f) => f.geometry && f.geometry.type === 'Polygon',
  )
  if (boundary) {
    await client.query(
      `INSERT INTO campus_boundary (id, name, geometry)
       VALUES (1, $1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326))
       ON CONFLICT (id) DO NOTHING`,
      ['Federal Polytechnic Ilaro — Main Campus', JSON.stringify(boundary.geometry)],
    )
    console.log('✔ Boundary seeded.')
  } else {
    console.warn('⚠ No polygon found in overall_boundary.geojson — boundary not seeded.')
  }

  await client.query('COMMIT')

  const { rows } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM buildings)  AS buildings,
      (SELECT COUNT(*) FROM roads)      AS roads,
      (SELECT COUNT(*) FROM walkways)   AS walkways,
      (SELECT COUNT(*) FROM entrances)  AS entrances,
      (SELECT COUNT(*) FROM campus_boundary) AS boundary
  `)
  console.log('Seeding complete:', rows[0])
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Seeding failed:', err.message)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
