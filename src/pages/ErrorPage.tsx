import { Link, useRouteError } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button';

export function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="text-6xl font-bold text-red-500">Oops</p>
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-fg)]">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
        Back to home
      </Link>
    </div>
  );
}
