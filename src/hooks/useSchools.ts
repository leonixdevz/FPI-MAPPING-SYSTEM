import { useCallback, useEffect, useState } from 'react';
import { schoolsService } from '../services';
import type { School, SchoolInput } from '../types/school';

export interface UseSchoolsResult {
  schools: School[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: SchoolInput) => Promise<School>;
  update: (id: string, input: Partial<SchoolInput>) => Promise<School>;
  remove: (id: string) => Promise<void>;
}

/**
 * Thin React wrapper around the schools service. Components call this
 * instead of the service directly so loading/error/refresh state is
 * owned in one place.
 *
 * `publicOnly` controls whether to use listPublic() (the public map
 * and list pages) or list() (admin views).
 */
export function useSchools(opts: { publicOnly?: boolean } = {}): UseSchoolsResult {
  const { publicOnly = true } = opts;
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = publicOnly
        ? await schoolsService.listPublic()
        : await schoolsService.list();
      setSchools(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [publicOnly]);

  useEffect(() => {
    void refresh();

    // Subscribe to cross-tab updates via the storage event. Within a
    // single tab, the adapter emits an in-memory notification we listen
    // to by re-reading on focus as a simple reliable fallback.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sms.schools') void refresh();
    };
    window.addEventListener('storage', onStorage);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const create = useCallback(
    async (input: SchoolInput) => {
      const created = await schoolsService.create(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<SchoolInput>) => {
      const next = await schoolsService.update(id, input);
      await refresh();
      return next;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await schoolsService.remove(id);
      await refresh();
    },
    [refresh],
  );

  return { schools, loading, error, refresh, create, update, remove };
}
