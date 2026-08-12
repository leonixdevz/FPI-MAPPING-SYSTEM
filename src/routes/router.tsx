import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ErrorPage } from '../pages/ErrorPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Home } from '../pages/Home';
import { SchoolsPage } from '../pages/SchoolsPage';
import { SchoolDetailsPage } from '../pages/SchoolDetailsPage';
import { LoginPage } from '../pages/LoginPage';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminSchools } from '../pages/admin/AdminSchools';
import { AdminSchoolNew } from '../pages/admin/AdminSchoolNew';
import { AdminSchoolEdit } from '../pages/admin/AdminSchoolEdit';
import { AdminMedia } from '../pages/admin/AdminMedia';
import { AdminSiteFeatures } from '../pages/admin/AdminSiteFeatures';

// The map page pulls in Leaflet (~150 kB gzip). Route-level lazy
// loading keeps it out of the main bundle so the rest of the app
// loads fast.
const MapPage = lazy(() =>
  import('../pages/MapPage').then((m) => ({ default: m.MapPage })),
);

function LazyMapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-56px)] items-center justify-center text-sm text-[var(--color-muted)]">
          Loading map…
        </div>
      }
    >
      <MapPage />
    </Suspense>
  );
}

/**
 * Route table.
 *
 * Public pages render inside the shared <Layout> (header + footer).
 * /admin/* renders inside <AdminLayout> which wraps everything in
 * <ProtectedRoute> (redirects to /login when not signed in).
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/map', element: <LazyMapPage /> },
      { path: '/schools', element: <SchoolsPage /> },
      { path: '/schools/:id', element: <SchoolDetailsPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'schools', element: <AdminSchools /> },
      { path: 'schools/new', element: <AdminSchoolNew /> },
      { path: 'schools/:id/edit', element: <AdminSchoolEdit /> },
      { path: 'media', element: <AdminMedia /> },
      { path: 'features', element: <AdminSiteFeatures /> },
    ],
  },
]);
