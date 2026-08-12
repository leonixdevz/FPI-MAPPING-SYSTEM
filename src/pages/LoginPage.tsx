import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Go straight to the destination.
  useEffect(() => {
    if (session) navigate(next, { replace: true });
  }, [session, navigate, next]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Session state update triggers the redirect effect above.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section className="flex flex-col items-center py-16">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-[var(--color-fg)]">Administrator sign in</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Sign in to manage schools and media. Public users do not need an account.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-5 rounded-md bg-[var(--color-border)]/40 px-3 py-2 text-xs text-[var(--color-muted)]">
          <strong className="font-semibold text-[var(--color-fg)]">Demo credentials</strong> — set
          via <code>VITE_DEMO_ADMIN_EMAIL</code> / <code>VITE_DEMO_ADMIN_PASSWORD</code> in your{' '}
          <code>.env</code>. Defaults: <code>admin@school.local</code> / <code>admin123</code>.
          <span className="mt-1 block">
            With the Supabase backend (<code>VITE_DATA_BACKEND=supabase</code>) authentication uses
            Supabase Auth — create the administrator user in the Supabase dashboard.
          </span>
        </div>
      </Card>

      <p className="mt-4 text-sm text-[var(--color-muted)]">
        Not an administrator?{' '}
        <Link to="/" className="font-medium text-[var(--color-brand)] hover:underline">
          Back to home
        </Link>
      </p>
    </Section>
  );
}
