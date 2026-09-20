/**
 * Applies server/db/schema.sql to the target database.
 *
 * NOTE: schema.sql is intentionally destructive (DROP + CREATE) so demo
 * environments can be reset reliably — it wipes all feature tables.
 *
 *   pnpm db:migrate
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../db/schema.sql',
)

try {
  const sql = fs.readFileSync(schemaPath, 'utf8')
  console.log(`Applying ${schemaPath} …`)
  await pool.query(sql)
  console.log('✔ Schema applied.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
