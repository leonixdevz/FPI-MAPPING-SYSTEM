import { useCallback, useEffect, useState } from 'react';
import { siteFeaturesService } from '../services';
import type { SiteFeature, SiteFeatureInput } from '../types/siteFeature';

export interface UseSiteFeaturesResult {
  features: SiteFeature[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: SiteFeatureInput) => Promise<SiteFeature>;
  update: (id: string, input: Partial<SiteFeatureInput>) => Promise<SiteFeature>;
  remove: (id: string) => Promise<void>;
}

/** Thin React wrapper around the site-features service (Phase E / G usage). */
export function useSiteFeatures(): UseSiteFeaturesResult {
  const [features, setFeatures] = useState<SiteFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setFeatures(await siteFeaturesService.list());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sms.siteFeatures') void refresh();
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
    async (input: SiteFeatureInput) => {
      const created = await siteFeaturesService.create(input);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<SiteFeatureInput>) => {
      const next = await siteFeaturesService.update(id, input);
      await refresh();
      return next;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await siteFeaturesService.remove(id);
      await refresh();
    },
    [refresh],
  );

  return { features, loading, error, refresh, create, update, remove };
}
