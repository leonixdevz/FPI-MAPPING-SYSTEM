import { useState } from 'react';
import type { Media, MediaInput } from '../../types/media';
import { useMedia } from '../../hooks/useMedia';
import { MediaUploader } from '../../components/media/MediaUploader';
import { MediaGallery } from '../../components/media/MediaGallery';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';

export function AdminMedia() {
  const { media, create, remove } = useMedia({ publicOnly: false });
  const { showToast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreated = async (input: MediaInput) => {
    const created = await create(input);
    showToast(`Added "${created.title}".`, 'success');
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await remove(pendingDelete.id);
      showToast(`Deleted "${pendingDelete.title}".`, 'success');
      setPendingDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-semibold text-[var(--color-fg)]">Add media</h2>
        <div className="mt-3">
          <MediaUploader onCreated={handleCreated} />
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-[var(--color-fg)]">
          All media <span className="text-sm font-normal text-[var(--color-muted)]">({media.length})</span>
        </h2>
        <MediaGallery media={media} loading={false} onDelete={setPendingDelete} />
      </div>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete media?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-fg)]">
          This will permanently delete <strong>{pendingDelete?.title ?? ''}</strong>. This cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}
