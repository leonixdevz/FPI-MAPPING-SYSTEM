import { describe, expect, it } from 'vitest';
import { validateMediaInput, type MediaInput } from './media';

const validInput: MediaInput = {
  title: 'Drone site tour',
  description: 'A screen capture of the site.',
  mediaType: 'drone_video',
  fileUrl: '/media/site-tour-2026-08-11.mp4',
  thumbnailUrl: null,
  latitude: null,
  longitude: null,
  featureId: null,
  isPublic: true,
};

describe('validateMediaInput', () => {
  it('accepts a fully valid input with a relative URL', () => {
    expect(validateMediaInput(validInput)).toEqual([]);
  });

  it('accepts an absolute URL', () => {
    expect(
      validateMediaInput({ ...validInput, fileUrl: 'https://example.com/media/photo.png' }),
    ).toEqual([]);
  });

  it('rejects a missing title', () => {
    expect(validateMediaInput({ ...validInput, title: '' })).toEqual([
      expect.objectContaining({ field: 'title' }),
    ]);
  });

  it('rejects a malformed URL', () => {
    // No host: the URL constructor throws even with a base URL.
    expect(validateMediaInput({ ...validInput, fileUrl: 'http://' })).toEqual([
      expect.objectContaining({ field: 'fileUrl' }),
    ]);
  });

  it('rejects an unknown media type', () => {
    expect(
      validateMediaInput({ ...validInput, mediaType: 'aerial' as MediaInput['mediaType'] }),
    ).toEqual([expect.objectContaining({ field: 'mediaType' })]);
  });

  it('rejects a missing media type', () => {
    expect(validateMediaInput({ ...validInput, mediaType: undefined })).toEqual([
      expect.objectContaining({ field: 'mediaType' }),
    ]);
  });

  it('rejects out-of-range optional coordinates', () => {
    expect(validateMediaInput({ ...validInput, latitude: 95 })).toEqual([
      expect.objectContaining({ field: 'latitude' }),
    ]);
    expect(validateMediaInput({ ...validInput, longitude: 200 })).toEqual([
      expect.objectContaining({ field: 'longitude' }),
    ]);
  });

  it('accepts null coordinates (no reliable GPS)', () => {
    expect(validateMediaInput(validInput)).toEqual([]);
  });
});
