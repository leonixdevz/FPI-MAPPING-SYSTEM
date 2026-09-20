/**
 * Runtime configuration. Every value can be overridden with environment
 * variables (see .env.example). Defaults match the docker-compose service
 * so `docker compose up` + `pnpm dev` works without extra configuration.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.env

// server/src/config.js -> repo root/map_interface/public/data
const defaultGeojsonDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../map_interface/public/data',
)

export const config = {
  port: Number(env.PORT || 4000),

  databaseUrl:
    env.DATABASE_URL ||
    'postgres://fpi:fpi_secret@localhost:5432/fpi_campus',

  admin: {
    username: env.ADMIN_USERNAME || 'admin',
    password: env.ADMIN_PASSWORD || 'admin123',
    sessionTtlMs: Number(env.ADMIN_SESSION_TTL_MS || 12 * 60 * 60 * 1000), // 12h
  },

  // Directory that contains the GeoJSON exports used by the seed script.
  geojsonDir: env.GEOJSON_DIR || defaultGeojsonDir,
}
