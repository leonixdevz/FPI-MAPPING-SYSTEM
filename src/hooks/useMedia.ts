import { useCallback, useEffect, useState } from 'react';
import { mediaService } from '../services';
import type { Media, MediaInput } from '../types/media';

export interface UseMediaResult {
  media: Media[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  create: (input: MediaInput) => Promise<Media>;
  update: (id: string, input: Partial<MediaInput>) => Promise<Media>;
  remove: (id: string) => Promise<void>;
}

export function useMedia(opts: { publicOnly?: boolean } = {}): UseMediaResult {
  const { publicOnly = true } = opts;
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = publicOnly ? await mediaService.listPublic() : await mediaService.list();
      setMedia(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [publicOnly]);

  useEffect(() => {
    void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sms.media') void refresh();
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
    async (input: MediaInput) => {
      const created = await mediaService.create(input);
      await refresh();
      return created;
    },
    [refresh],
  );
  const update = useCallback(
    async (id: string, input: Partial<MediaInput>) => {
      const next = await mediaService.update(id, input);
      await refresh();
      return next;
    },
    [refresh],
  );
  const remove = useCallback(
    async (id: string) => {
      await mediaService.remove(id);
      await refresh();
    },
    [refresh],
  );

  return { media, loading, error, refresh, create, update, remove };
}
