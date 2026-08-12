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

  return <>{children}</>;
}
