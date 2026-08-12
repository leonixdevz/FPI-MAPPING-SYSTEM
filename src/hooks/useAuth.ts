import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services';
import type { Session, User } from '../types/user';

export interface UseAuthResult {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
}

/**
 * Tracks the current auth state. Mirrors Supabase's onAuthStateChange
 * surface so the Supabase adapter swap is invisible to consumers.
 *
 * The hook subscribes once on mount, stores the latest session, and
 * exposes a stable signIn/signOut pair.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void authService.getSession().then((initial) => {
      if (cancelled) return;
      setSession(initial);
      setLoading(false);
    });

    unsubscribe = authService.onAuthStateChange((event) => {
      if (cancelled) return;
      setSession(event.session);
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await authService.signIn(email, password);
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signOut,
  };
}
