import { useMemo, useState } from 'react';
import type { Media, MediaType } from '../../types/media';
import { cn } from '../../lib/utils';
import { EmptyState } from '../ui/EmptyState';
import { MediaCard } from './MediaCard';

interface MediaGalleryProps {
  media: Media[];
  loading?: boolean;
  onDelete?: (media: Media) => void;
}

type Tab = 'all' | MediaType;

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'drone_image', label: 'Drone Images' },
  { id: 'drone_video', label: 'Drone Videos' },
  { id: 'site_photo', label: 'Site Photos' },
];

export function MediaGallery({ media, loading = false, onDelete }: MediaGalleryProps) {
  const [tab, setTab] = useState<Tab>('all');

  const visible = useMemo(
    () => (tab === 'all' ? media : media.filter((m) => m.mediaType === tab)),
    [media, tab],
  );

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Media type" className="flex flex-wrap gap-1.5">
        {TABS.map(({ id, label }) => {
          const count = id === 'all' ? media.length : media.filter((m) => m.mediaType === id).length;
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                active
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-fg)] hover:bg-[var(--color-border)]/50',
              )}
            >
              {label}
              <span className={cn('ml-1 text-xs', active ? 'opacity-80' : 'text-[var(--color-muted)]')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">Loading media…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab === 'all' ? 'No media yet' : `No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} media`}
          description="Media added by the administrator will appear here."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <li key={m.id}>
              <MediaCard media={m} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
