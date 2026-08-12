import { useEffect, useState, type FormEvent } from 'react';
import type { MediaInput, MediaType } from '../../types/media';
import { MEDIA_TYPES } from '../../types/media';
import { validateMediaInput, type ValidationIssue_Media } from '../../types/media';
import { MEDIA_TYPE_LABELS } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface MediaUploaderProps {
  onCreated: (input: MediaInput) => Promise<void>;
}

type SourceMode = 'url' | 'file';

/**
 * Admin media form.
 *
 * Local-backend note: without a storage server, files picked from disk
 * become object URLs that only last for the current browser session.
 * For records that must persist across reloads (e.g. the curated site
 * captures), use a URL under /media/... or another hosted location.
 */
export function MediaUploader({ onCreated }: MediaUploaderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('site_photo');
  const [mode, setMode] = useState<SourceMode>('url');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [issues, setIssues] = useState<ValidationIssue_Media[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Revoke the session-only object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const issueFor = (field: keyof MediaInput) =>
    issues.find((issue) => issue.field === field)?.message;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setFileName(file.name);
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fileUrl = mode === 'url' ? url.trim() : objectUrl;
    const input: MediaInput = {
      title: title.trim(),
      description: description.trim(),
      mediaType,
      fileUrl,
      thumbnailUrl: null,
      latitude: latitude === '' ? null : Number(latitude),
      longitude: longitude === '' ? null : Number(longitude),
      featureId: null,
      isPublic,
      // The Supabase adapter uploads this file to Storage and replaces
      // fileUrl with the public URL; the local adapter ignores it.
      file: selectedFile ?? undefined,
    };

    const validation = validateMediaInput(input);
    if (validation.length > 0) {
      setIssues(validation);
      return;
    }

    setSubmitting(true);
    try {
      await onCreated(input);
      // Reset form, keeping the type toggle.
      setTitle('');
      setDescription('');
      setUrl('');
      setLatitude('');
      setLongitude('');
      setMode('url');
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl('');
      }
      setFileName('');
      setSelectedFile(null);
      setIssues([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={issueFor('title')}
          />
        </div>

        <Select
          label="Media type"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as MediaType)}
          options={MEDIA_TYPES.map((type) => ({ value: type, label: MEDIA_TYPE_LABELS[type] }))}
          error={issueFor('mediaType')}
        />

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--color-fg)]">Source</span>
          <div className="flex gap-1.5">
            {(['url', 'file'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]',
                  mode === m
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-fg)] hover:bg-[var(--color-border)]/50',
                )}
              >
                {m === 'url' ? 'URL' : 'File'}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          {mode === 'url' ? (
            <Input
              label="File URL"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/media/site-tour-2026-08-11.mp4 or https://…"
              error={issueFor('fileUrl')}
              hint="Files in /media are served from public/media/."
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label htmlFor="media-file" className="text-sm font-medium text-[var(--color-fg)]">
                Choose file
              </label>
              <input
                id="media-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="block w-full text-sm text-[var(--color-fg)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-brand)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--color-brand-fg)]"
              />
              {fileName ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Selected: {fileName} — uploaded to Supabase Storage with the Supabase backend,
                  or kept as an in-session URL with the local backend.
                </p>
              ) : null}
              {issueFor('fileUrl') ? (
                <p className="text-xs text-red-600">{issueFor('fileUrl')}</p>
              ) : null}
            </div>
          )}
        </div>

        <Input
          label="Latitude (optional)"
          type="number"
          step="any"
          min={-90}
          max={90}
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          error={issueFor('latitude')}
          hint="Leave blank if the asset has no reliable coordinates"
        />
        <Input
          label="Longitude (optional)"
          type="number"
          step="any"
          min={-180}
          max={180}
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          error={issueFor('longitude')}
        />

        <div className="sm:col-span-2">
          <label htmlFor="media-description" className="text-sm font-medium text-[var(--color-fg)]">
            Description
          </label>
          <textarea
            id="media-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-fg)] sm:col-span-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand)]"
          />
          Visible to public visitors
        </label>
      </div>

      <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
        <Button type="submit" loading={submitting}>
          Add media
        </Button>
      </div>
    </form>
  );
}
