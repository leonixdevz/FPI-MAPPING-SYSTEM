import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/map', label: 'Map' },
  { to: '/schools', label: 'Schools' },
  { to: '/admin', label: 'Admin' },
] as const;

function navLinkClasses(isActive: boolean): string {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
    isActive
      ? 'bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
      : 'text-[var(--color-fg)] hover:bg-[var(--color-border)]',
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--color-fg)]"
        >
          <span
            aria-hidden="true"
            className="inline-block h-7 w-7 rounded-md bg-[var(--color-brand)]"
            style={{
              WebkitMask: 'url(/favicon.svg) center/contain no-repeat',
              mask: 'url(/favicon.svg) center/contain no-repeat',
            }}
          />
          <span className="hidden sm:inline">Interactive School Mapping System</span>
          <span className="sm:hidden">SMS</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-fg)] transition hover:bg-[var(--color-border)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
            >
              Sign out
            </button>
          ) : null}
        </nav>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-fg)] md:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {open ? '×' : '☰'}
          </span>
        </button>
      </div>

      {open ? (
        <nav id="mobile-menu" aria-label="Primary mobile" className="border-t border-[var(--color-border)] md:hidden">
          <ul className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-2 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `block ${navLinkClasses(isActive)}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            {user ? (
              <li>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-left text-sm font-medium text-[var(--color-fg)] transition hover:bg-[var(--color-border)]/60"
                >
                  Sign out ({user.email})
                </button>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
