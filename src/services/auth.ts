import type { Session, User } from '../types/user';

/**
 * Auth service contract — mirrors the Supabase Auth surface so the
 * Supabase adapter (Phase K) can be a near drop-in.
 *
 * `onAuthStateChange` returns an unsubscribe function, matching
 * Supabase's `data.subscription.unsubscribe()` shape.
 */
export interface AuthChangeEvent {
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
  session: Session | null;
}

export type AuthChangeHandler = (event: AuthChangeEvent) => void;
export type Unsubscribe = () => void;

export interface AuthService {
  /** Returns the current session, or null if not signed in. */
  getSession(): Promise<Session | null>;

  /**
   * Sign in with email + password. Returns the new session on success.
   * Throws on invalid credentials. The local adapter checks the
   * VITE_DEMO_ADMIN_EMAIL / VITE_DEMO_ADMIN_PASSWORD pair from .env.
   */
  signIn(email: string, password: string): Promise<Session>;

  signOut(): Promise<void>;

  /**
   * Subscribe to auth changes. Returns an unsubscribe function. The
   * handler is invoked on every state change, including the initial
   * subscription (with the current session).
   */
  onAuthStateChange(handler: AuthChangeHandler): Unsubscribe;

  /** Convenience: returns the current user, or null. */
  getUser(): Promise<User | null>;
}
