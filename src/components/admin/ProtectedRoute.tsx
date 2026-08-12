import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard for /admin/*. While auth state is loading we render a
 * spinner; unauthenticated users are redirected to /login with a `next`
 * param so they return where they were headed after signing in.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="h-6 w-6" label="Checking session" />
      </div>
    );
  }

  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Signed in but not on the administrator list (Supabase backend): the
  // RLS policies would reject their writes anyway, so block the UI too.
  if (session.user.role !== 'admin') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-900">Not an administrator</h1>
          <p className="mt-2 text-sm text-red-800">
            Your account is signed in, but it is not on the administrator list. Only
            administrators can manage schools and media.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
