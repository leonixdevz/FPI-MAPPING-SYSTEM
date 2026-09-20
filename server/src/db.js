import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
})

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message)
})

/** Run a parameterised query; throws if the database is unreachable. */
export function query(text, params) {
  return pool.query(text, params)
}

/** Lightweight connectivity probe used by GET /api/health. */
export async function ping() {
  await query('SELECT 1')
}
