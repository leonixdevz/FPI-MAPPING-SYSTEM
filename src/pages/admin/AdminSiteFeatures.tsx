import { useState } from 'react';
import type { SiteFeature, SiteFeatureInput } from '../../types/siteFeature';
import { useSiteFeatures } from '../../hooks/useSiteFeatures';
import { featureTypeLabel, formatLatLng } from '../../lib/utils';
import { SiteFeatureForm } from '../../components/features/SiteFeatureForm';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

/**
 * Site-feature administration (buildings, roads, facilities).
 *
 * Features are public map content: the MapView "Site features" overlay
 * renders one marker per feature, coloured by type. Coordinates come
 * from the survey/site knowledge of the administrator — the form never
 * fabricates a location (click-to-place sets exactly the point chosen).
 */
export function AdminSiteFeatures() {
  const { features, loading, create, update, remove } = useSiteFeatures();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<SiteFeature | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SiteFeature | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (input: SiteFeatureInput) => {
    if (editing) {
      const updated = await update(editing.id, input);
      showToast(`Updated "${updated.name}".`, 'success');
      setEditing(null);
    } else {
      const created = await create(input);
      showToast(`Added "${created.name}" — it is now on the public map.`, 'success');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await remove(pendingDelete.id);
      showToast(`Deleted "${pendingDelete.name}".`, 'success');
      setPendingDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Form */}
      <div className="lg:col-span-2">
        <Card>
          <h2 className="font-semibold text-[var(--color-fg)]">
            {editing ? `Edit — ${editing.name}` : 'Add a site feature'}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Buildings, roads, facilities and open spaces. Saved features appear on the{' '}
            <strong className="font-medium text-[var(--color-fg)]">Site features</strong> layer of
            the public map, coloured by type.
          </p>
          <div className="mt-4">
            <SiteFeatureForm
              key={editing?.id ?? 'new'}
              initial={editing ?? undefined}
              submitLabel={editing ? 'Save changes' : 'Add feature'}
              onSubmit={handleSubmit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </Card>
      </div>

      {/* List */}
      <div className="lg:col-span-3">
        <p className="mb-3 text-sm text-[var(--color-muted)]">{features.length} feature(s)</p>
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--color-muted)]">
            <Spinner /> Loading site features…
          </div>
        ) : features.length === 0 ? (
          <EmptyState
            title="No site features yet"
            description="Add the first building, road or facility — it will appear on the public map's Site features layer."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-border)]/30 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {features.map((feature) => (
                  <tr key={feature.id} className="transition hover:bg-[var(--color-border)]/30">
                    <td className="px-4 py-3 font-medium text-[var(--color-fg)]">{feature.name}</td>
                    <td className="px-4 py-3">
                      <Badge>{featureTypeLabel(feature.featureType)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">
                      {formatLatLng(feature.latitude, feature.longitude)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditing(feature)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setPendingDelete(feature)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete site feature?"
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
          This will permanently delete <strong>{pendingDelete?.name ?? ''}</strong> and remove it
          from the public map. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
