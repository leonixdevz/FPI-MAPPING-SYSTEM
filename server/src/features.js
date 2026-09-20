import { query } from './db.js'

/**
 * Feature-layer registry.
 *
 * Each editable/public feature layer maps to a PostGIS table and an
 * allowed set of GeoJSON geometry types. Adding a new layer type only
 * requires an entry here (plus a table + seed logic).
 */
export const LAYERS = {
  building: {
    table: 'buildings',
    label: 'Building',
    geometryTypes: ['Polygon', 'MultiPolygon'],
  },
  road: {
    table: 'roads',
    label: 'Road',
    geometryTypes: ['LineString', 'MultiLineString'],
  },
  walkway: {
    table: 'walkways',
    label: 'Walkway',
    geometryTypes: ['LineString', 'MultiLineString'],
  },
  entrance: {
    table: 'entrances',
    label: 'Entrance',
    geometryTypes: ['Point'],
  },
}

export const LAYER_KEYS = Object.keys(LAYERS)

export function isLayer(value) {
  return Object.prototype.hasOwnProperty.call(LAYERS, value)
}

/** Reserved attribute keys exposed as first-class feature properties. */
const RESERVED = new Set(['id', 'layer', 'name', 'type', 'description', 'highway', 'tags'])

/**
 * Map a database row to a GeoJSON feature.
 * `tags` (jsonb) holds loose attributes; reserved keys win over tags.
 */
export function rowToFeature(row, layer) {
  const tags = row.tags && typeof row.tags === 'object' ? row.tags : {}

  const props = { ...tags }
  props.id = String(row.id)
  props.layer = layer
  props.name = row.name ?? null
  props.type = row.type ?? null
  props.description = row.description ?? null
  if (row.highway) props.highway = row.highway

  return {
    type: 'Feature',
    geometry: row.geometry_geojson ? JSON.parse(row.geometry_geojson) : null,
    properties: props,
  }
}

/** Build the per-layer SELECT list (highway exists on line layers only). */
function selectFor(layer) {
  const cols = [
    'id', 'name', 'type', 'description', 'tags',
    'ST_AsGeoJSON(geometry) AS geometry_geojson',
  ]
  if (layer === 'road' || layer === 'walkway') cols.push('highway')
  return cols.join(', ')
}

/** Build a FeatureCollection for one (or every) layer. */
export async function buildFeatureCollection(layers, db = query) {
  const features = []
  for (const layer of layers) {
    const { table } = LAYERS[layer]
    const { rows } = await db(
      `SELECT ${selectFor(layer)} FROM ${table} ORDER BY id`,
    )
    for (const row of rows) features.push(rowToFeature(row, layer))
  }
  return {
    type: 'FeatureCollection',
    features,
  }
}

/**
 * Validate + normalise a geometry object coming from the admin API.
 * Returns a GeoJSON geometry, or throws with a 400-class message.
 */
export function validateGeometry(layer, geometry) {
  const allowed = LAYERS[layer].geometryTypes
  if (!geometry || typeof geometry !== 'object' || !geometry.type) {
    throw new Error('A valid GeoJSON geometry is required.')
  }
  if (!allowed.includes(geometry.type)) {
    throw new Error(
      `Layer "${layer}" requires geometry of type ${allowed.join(' or ')}, got ${geometry.type}.`,
    )
  }
  return JSON.stringify(geometry)
}

/**
 * Serialise a feature update/insert payload into SQL columns/values.
 * Expects { name, type, description, tags, geometry } plus `highway`
 * for line layers. `tags` may be an object whose keys are stored in the
 * tags jsonb column; name/type/description/highway found inside a loose
 * tags payload are promoted to their dedicated columns.
 */
export function attributeColumns(layer, body) {
  const columns = ['name', 'type', 'description']
  if (layer === 'road' || layer === 'walkway') columns.push('highway')
  columns.push('tags') // jsonb column, bound as a JS object below

  const tags = body.tags && typeof body.tags === 'object'
    ? { ...body.tags }
    : {}

  const values = {}
  for (const col of columns) {
    if (col === 'tags') continue
    let raw = body[col]
    if (raw === undefined && tags[col] !== undefined) {
      raw = tags[col]
      delete tags[col]
    }
    values[col] = raw ?? null
  }
  values.tags = tags

  return { columns, values }
}

/** Build `column = $n` / `column = expr` fragments for a column list. */
export function sqlFragments(columns) {
  return columns.map((col, i) => {
    const n = i + 1
    if (col === 'geometry') return `ST_SetSRID(ST_GeomFromGeoJSON($${n}), 4326)`
    return `$${n}`
  })
}
