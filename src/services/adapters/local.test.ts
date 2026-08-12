import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  localAuthService,
  localMediaService,
  localSchoolsService,
  localSiteFeaturesService,
  resetLocalData,
} from './local';
import type { SchoolInput } from '../../types/school';
import type { MediaInput } from '../../types/media';
import type { SiteFeatureInput } from '../../types/siteFeature';

const validSchool: SchoolInput = {
  name: 'Unity Secondary School',
  schoolType: 'public',
  educationLevel: 'senior_secondary',
  address: 'Ilaro/Oja-Odan Road',
  latitude: 6.828,
  longitude: 3.09,
  capacity: 500,
  facilities: ['library'],
  topography: 'Flat',
  noiseInformation: 'Low',
  description: 'A test school.',
  isPublic: true,
};

const validMedia: MediaInput = {
  title: 'Drone site tour',
  description: 'Screen capture.',
  mediaType: 'drone_video',
  fileUrl: '/media/site-tour-2026-08-11.mp4',
  thumbnailUrl: null,
  latitude: null,
  longitude: null,
  featureId: null,
  isPublic: true,
};

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_DEMO_ADMIN_EMAIL', 'admin@school.local');
  vi.stubEnv('VITE_DEMO_ADMIN_PASSWORD', 'admin123');
});

describe('local schools service', () => {
  it('creates, lists, updates and removes a school', async () => {
    const created = await localSchoolsService.create(validSchool);
    expect(created.id).toBeTruthy();
    expect(created.capacity).toBe(500);

    const listed = await localSchoolsService.list();
    expect(listed).toHaveLength(2); // seeded demo school + the new one
    expect(listed.some((s) => s.id === created.id)).toBe(true);

    const updated = await localSchoolsService.update(created.id, { capacity: 600 });
    expect(updated.capacity).toBe(600);

    await localSchoolsService.remove(created.id);
    expect((await localSchoolsService.list()).some((s) => s.id === created.id)).toBe(false);
  });

  it('rejects invalid input with a validation error', async () => {
    await expect(
      localSchoolsService.create({ ...validSchool, latitude: 999 }),
    ).rejects.toThrow(/latitude/i);
  });

  it('listPublic only returns public schools', async () => {
    await localSchoolsService.create({ ...validSchool, name: 'Hidden', isPublic: false });
    const publicList = await localSchoolsService.listPublic();
    expect(publicList.every((s) => s.isPublic)).toBe(true);
  });
});

describe('local media service', () => {
  it('creates, lists and removes media', async () => {
    const created = await localMediaService.create(validMedia);
    const listed = await localMediaService.list();
    // Seeded curated media (6 records) + the new one.
    expect(listed.some((m) => m.id === created.id)).toBe(true);

    await localMediaService.remove(created.id);
    expect((await localMediaService.list()).some((m) => m.id === created.id)).toBe(false);
  });

  it('rejects media with an invalid URL', async () => {
    await expect(
      localMediaService.create({ ...validMedia, fileUrl: 'http://' }),
    ).rejects.toThrow(/url/i);
  });
});

describe('local site features service', () => {
  it('round-trips a site feature', async () => {
    const input: SiteFeatureInput = {
      name: 'Block A',
      featureType: 'building',
      description: 'Classroom block',
      latitude: 6.828,
      longitude: 3.09,
      geometry: null,
    };
    const created = await localSiteFeaturesService.create(input);
    expect(created.id).toBeTruthy();
    const found = await localSiteFeaturesService.get(created.id);
    expect(found?.name).toBe('Block A');
  });
});

describe('local auth service', () => {
  it('signs in with the demo credentials and signs out', async () => {
    const session = await localAuthService.signIn('admin@school.local', 'admin123');
    expect(session.user.role).toBe('admin');

    expect((await localAuthService.getSession())?.user.email).toBe('admin@school.local');

    await localAuthService.signOut();
    expect(await localAuthService.getSession()).toBeNull();
  });

  it('rejects wrong credentials', async () => {
    await expect(localAuthService.signIn('admin@school.local', 'wrong')).rejects.toThrow(
      /invalid email or password/i,
    );
  });
});

describe('resetLocalData', () => {
  it('wipes and re-seeds the demo data', async () => {
    await localSchoolsService.create(validSchool);
    expect((await localSchoolsService.list()).length).toBeGreaterThan(1);

    resetLocalData();
    const after = await localSchoolsService.list();
    expect(after).toHaveLength(1); // just the seeded demo school again
  });
});
