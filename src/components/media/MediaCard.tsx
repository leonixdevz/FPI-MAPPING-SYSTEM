import type { Media } from '../../types/media';
import { formatDate, mediaTypeLabel } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MediaCardProps {
  media: Media;
  /** Admin mode: show delete button. */
  onDelete?: (media: Media) => void;
}

export function MediaCard({ media, onDelete }: MediaCardProps) {
  const isVideo = media.mediaType === 'drone_video';

  return (
    <Card bare className="flex flex-col overflow-hidden">
      <div className="aspect-video w-full bg-[var(--color-border)]/50">
        {isVideo ? (
          <video
            controls
            preload="metadata"
            poster={media.thumbnailUrl ?? undefined}
            className="h-full w-full object-contain bg-black"
          >
            <source src={media.fileUrl} />
            Your browser does not support embedded video.
          </video>
        ) : (
          <img
            src={media.fileUrl}
            alt={media.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-[var(--color-fg)]">{media.title}</h3>
          <Badge tone="accent" className="shrink-0">
            {mediaTypeLabel(media.mediaType)}
          </Badge>
        </div>

        {media.description ? (
          <p className="text-sm text-[var(--color-muted)]">{media.description}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-[var(--color-muted)]">
          <span>{formatDate(media.createdAt)}</span>
          {media.latitude === null || media.longitude === null ? (
            <span className="italic" title="This asset carries no geospatial metadata">
              no coordinates
            </span>
          ) : null}
        </div>

        {onDelete ? (
          <div className="pt-2">
            <Button variant="danger" size="sm" onClick={() => onDelete(media)}>
              Delete
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
