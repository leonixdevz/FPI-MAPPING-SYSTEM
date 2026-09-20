import crypto from 'node:crypto'
import { config } from './config.js'

/**
 * Demo-grade authentication for the admin dashboard.
 *
 * Successful login issues a cryptographically random bearer token held in
 * an in-memory store with a TTL (default 12h). Tokens are lost when the
 * server restarts — acceptable for a campus project demonstration; swap in
 * a persistent session store if this ever goes to production.
 */
const sessions = new Map() // token -> { username, expiresAt }

function pruneExpired() {
  const now = Date.now()
  for (const [token, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(token)
  }
}

export function login(username, password) {
  if (username !== config.admin.username || password !== config.admin.password) {
    return null
  }
  pruneExpired()
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, {
    username,
    expiresAt: Date.now() + config.admin.sessionTtlMs,
  })
  return { token, expiresAt: sessions.get(token).expiresAt }
}

export function logout(token) {
  sessions.delete(token)
}

/** Express middleware guarding admin routes: `Authorization: Bearer <token>`. */
export function requireAuth(req, res, next) {
  pruneExpired()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const session = token ? sessions.get(token) : undefined
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized — please log in again.' })
  }
  req.admin = { username: session.username }
  next()
}
