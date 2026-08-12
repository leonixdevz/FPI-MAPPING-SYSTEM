import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ProtectedRoute } from '../../components/admin/ProtectedRoute';
import { Button } from '../../components/ui/Button';
import { Section } from '../../components/ui/Section';
import { cn } from '../../lib/utils';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/schools', label: 'Schools', end: false },
  { to: '/admin/media', label: 'Media', end: false },
] as const;

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <ProtectedRoute>
      <Section className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-fg)]">Admin dashboard</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Signed in as <span className="font-medium text-[var(--color-fg)]">{user?.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/map')}>
              View public map
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>

        <nav aria-label="Admin" className="mt-4 flex gap-1 border-b border-[var(--color-border)] pb-px">
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                  isActive
                    ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="py-6">
          <Outlet />
        </div>
      </Section>
    </ProtectedRoute>
  );
}
