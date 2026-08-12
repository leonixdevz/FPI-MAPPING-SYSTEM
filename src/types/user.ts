/**
 * Authenticated user — covers the public/admin split in spec Section 4.
 *
 * `role` is a coarse split for the MVP. The real Supabase adapter will
 * derive `role` from a server-side claim (or an `admins` table join);
 * the local adapter derives it from whether the signed-in email matches
 * the demo admin credential in `.env`.
 */

export type UserRole = 'public' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Session {
  user: User;
  /** ISO timestamp. */
  issuedAt: string;
  /** ISO timestamp. Supabase returns an `expires_in` (seconds); the local
   *  adapter mirrors the same idea with an absolute expiry. */
  expiresAt: string;
}
