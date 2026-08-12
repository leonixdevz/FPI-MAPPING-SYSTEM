import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createSupabaseServices,
  mapMediaRow,
  mapSchoolRow,
  mapSiteFeatureRow,
  toMediaRow,
  toSchoolRow,
  toSiteFeatureRow,
} from './supabase';
import type { SchoolInput } from '../../types/school';
import type { MediaInput } from '../../types/media';

// ---------------------------------------------------------------------------
// Fluent mock of the PostgREST query builder. The builder is thenable, so
// `await client.from('t').select('*').order('x')` resolves to the result
// the test configured, and terminal methods (maybeSingle/single) resolve
// the same way.
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error: { message: string } | null };

function builder(result: () => QueryResult) {
  const b = {
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    order: vi.fn(() => b),
    insert: vi.fn(() => b),
    update: vi.fn(() => b),
    delete: vi.fn(() => b),
    maybeSingle: vi.fn(async () => result()),
    single: vi.fn(async () => result()),
    then: (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result()).then(resolve, reject),
  };
  return b;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SCHOOL_ROW = {
  id: 's1',
  name: 'Test School',
  school_type: 'public',
  education_level: 'senior_secondary',
  address: '1 Test Rd',
  latitude: 6.8,
  longitude: 3.09,
  capacity: 500,
  facilities: ['library', 'lab'],
  topography: 'flat',
  noise_information: 'low',
  description: 'd',
  is_public: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const MEDIA_ROW = {
  id: 'm1',
  title: 'Video',
  description: 'd',
  media_type: 'drone_video',
  file_url: 'https://cdn/x.mp4',
  thumbnail_url: null,
  latitude: null,
  longitude: null,
  feature_id: null,
  is_public: true,
  created_at: '2026-01-01T00:00:00Z',
};

const FEATURE_ROW = {
  id: 'f1',
  name: 'Building A',
  feature_type: 'building',
  description: 'd',
  latitude: 6.8,
  longitude: 3.09,
  geometry: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const SESSION = {
  access_token: 'token',
  refresh_token: 'r',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1750000000,
  user: { id: 'u1', email: 'admin@school.local' },
};

function schoolInput(overrides: Partial<SchoolInput> = {}): SchoolInput {
  return {
    name: 'Test School',
    schoolType: 'public',
    educationLevel: 'senior_secondary',
    address: '1 Test Rd',
    latitude: 6.8,
    longitude: 3.09,
    capacity: 500,
    facilities: ['library'],
    topography: 'flat',
    noiseInformation: 'low',
    description: 'd',
    isPublic: true,
    ...overrides,
  };
}

function mediaInput(overrides: Partial<MediaInput> = {}): MediaInput {
  return {
    title: 'Video',
    description: 'd',
    mediaType: 'drone_video',
    fileUrl: 'https://cdn/x.mp4',
    thumbnailUrl: null,
    latitude: null,
    longitude: null,
    featureId: null,
    isPublic: true,
    ...overrides,
  };
}

interface MockOptions {
  queryResult?: () => QueryResult;
  rpc?: (name: string) => Promise<QueryResult>;
  getSessionResult?: () => Promise<QueryResult>;
  /** Event the auth subscription fires on subscribe (default: INITIAL_SESSION with SESSION). */
  authEvent?: { event: string; session: unknown };
}

function mockClient(options: MockOptions = {}) {
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: { session: SESSION }, error: null })),
    getSession: vi.fn(
      options.getSessionResult ??
        (async () => ({ data: { session: SESSION }, error: null })),
    ),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      // Simulate Supabase firing the initial event on subscribe.
      const ev = options.authEvent ?? { event: 'INITIAL_SESSION', session: SESSION };
      void callback(ev.event, ev.session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
  const storageFrom = {
    upload: vi.fn(async () => ({ data: { path: 'uploads/abc.png' }, error: null })),
    getPublicUrl: vi.fn(() => ({
      data: { publicUrl: 'https://cdn.example/school-media/uploads/abc.png' },
    })),
  };
  const from = vi.fn(
    () => builder(options.queryResult ?? (() => ({ data: [], error: null }))),
  );
  const rpc = vi.fn(options.rpc ?? (async () => ({ data: true, error: null })));
  const client = {
    auth,
    storage: { from: vi.fn(() => storageFrom) },
    from,
    rpc,
  };
  return {
    client: client as unknown as SupabaseClient,
    auth,
    storageFrom,
    from,
    rpc,
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

describe('supabase mappers', () => {
  it('toSchoolRow maps camelCase to snake_case columns', () => {
    expect(toSchoolRow(schoolInput())).toEqual({
      name: 'Test School',
      school_type: 'public',
      education_level: 'senior_secondary',
      address: '1 Test Rd',
      latitude: 6.8,
      longitude: 3.09,
      capacity: 500,
      facilities: ['library'],
      topography: 'flat',
      noise_information: 'low',
      description: 'd',
      is_public: true,
    });
  });

  it('mapSchoolRow maps snake_case rows to camelCase', () => {
    const school = mapSchoolRow(SCHOOL_ROW);
    expect(school.name).toBe('Test School');
    expect(school.schoolType).toBe('public');
    expect(school.educationLevel).toBe('senior_secondary');
    expect(school.facilities).toEqual(['library', 'lab']);
    expect(school.isPublic).toBe(true);
    expect(school.noiseInformation).toBe('low');
    expect(school.createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('toMediaRow maps fields and never includes a raw file', () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const row = toMediaRow(mediaInput({ file }));
    expect(row).toEqual({
      title: 'Video',
      description: 'd',
      media_type: 'drone_video',
      file_url: 'https://cdn/x.mp4',
      thumbnail_url: null,
      latitude: null,
      longitude: null,
      feature_id: null,
      is_public: true,
    });
    expect(row).not.toHaveProperty('file');
  });

  it('mapMediaRow maps snake_case rows to camelCase', () => {
    const media = mapMediaRow(MEDIA_ROW);
    expect(media.mediaType).toBe('drone_video');
    expect(media.fileUrl).toBe('https://cdn/x.mp4');
    expect(media.isPublic).toBe(true);
  });

  it('site feature mappers round-trip', () => {
    const row = toSiteFeatureRow({ ...mapSiteFeatureRow(FEATURE_ROW) });
    expect(row).toEqual({
      name: 'Building A',
      feature_type: 'building',
      description: 'd',
      latitude: 6.8,
      longitude: 3.09,
      geometry: null,
    });
  });
});

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

describe('supabase schools service', () => {
  it('lists schools with mapped rows', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: [SCHOOL_ROW], error: null }) });
    const schools = await createSupabaseServices(client).schools.list();
    expect(schools).toHaveLength(1);
    expect(schools[0].name).toBe('Test School');
    expect(schools[0].schoolType).toBe('public');
  });

  it('listPublic filters by is_public', async () => {
    const { client, from } = mockClient();
    await createSupabaseServices(client).schools.listPublic();
    expect(from.mock.results[0].value.eq).toHaveBeenCalledWith('is_public', true);
  });

  it('get returns null when no row matches', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: null, error: null }) });
    const school = await createSupabaseServices(client).schools.get('missing');
    expect(school).toBeNull();
  });

  it('create validates input before hitting the database', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: SCHOOL_ROW, error: null }) });
    await expect(
      createSupabaseServices(client).schools.create(schoolInput({ latitude: 999 })),
    ).rejects.toThrow(/latitude/i);
    expect(from).not.toHaveBeenCalled();
  });

  it('create inserts a snake_case row', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: SCHOOL_ROW, error: null }) });
    const services = createSupabaseServices(client);
    const created = await services.schools.create(schoolInput());
    expect(created.id).toBe('s1');
    const inserted = from.mock.results[0].value.insert.mock.calls[0][0];
    expect(inserted).toEqual(expect.objectContaining({ school_type: 'public', is_public: true }));
  });

  it('update fetches the current record and validates the merged result', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: SCHOOL_ROW, error: null }) });
    const services = createSupabaseServices(client);
    await expect(
      services.schools.update('s1', schoolInput({ latitude: 999 })),
    ).rejects.toThrow(/latitude/i);
    // One query for the fetch; the update never ran because validation failed.
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('update applies a snake_case patch and returns the mapped school', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: SCHOOL_ROW, error: null }) });
    const services = createSupabaseServices(client);
    const updated = await services.schools.update('s1', schoolInput({ name: 'Renamed' }));
    expect(updated.name).toBe('Test School'); // mapped from the mock row
    expect(from).toHaveBeenCalledTimes(2); // fetch + update
    const patch = from.mock.results[1].value.update.mock.calls[0][0];
    expect(patch).toEqual(expect.objectContaining({ name: 'Renamed', school_type: 'public' }));
  });

  it('update throws when the school does not exist', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: null, error: null }) });
    await expect(
      createSupabaseServices(client).schools.update('nope', schoolInput()),
    ).rejects.toThrow(/not found/i);
  });

  it('remove throws when no row was deleted', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: [], error: null }) });
    await expect(createSupabaseServices(client).schools.remove('nope')).rejects.toThrow(
      /not found/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Media + storage
// ---------------------------------------------------------------------------

describe('supabase media service', () => {
  it('create uploads a file to storage and stores the public URL', async () => {
    const { client, storageFrom, from } = mockClient({
      queryResult: () => ({ data: MEDIA_ROW, error: null }),
    });
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    const services = createSupabaseServices(client);
    await services.media.create(mediaInput({ file }));

    expect(storageFrom.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/.+\.png$/),
      file,
      expect.objectContaining({ upsert: false, contentType: 'image/png' }),
    );
    const inserted = from.mock.results[0].value.insert.mock.calls[0][0];
    expect(inserted.file_url).toBe('https://cdn.example/school-media/uploads/abc.png');
    expect(inserted).not.toHaveProperty('file');
  });

  it('create without a file keeps the supplied fileUrl', async () => {
    const { client, storageFrom, from } = mockClient({
      queryResult: () => ({ data: MEDIA_ROW, error: null }),
    });
    await createSupabaseServices(client).media.create(mediaInput());
    expect(storageFrom.upload).not.toHaveBeenCalled();
    const inserted = from.mock.results[0].value.insert.mock.calls[0][0];
    expect(inserted.file_url).toBe('https://cdn/x.mp4');
  });

  it('listPublic filters by is_public', async () => {
    const { client, from } = mockClient();
    await createSupabaseServices(client).media.listPublic();
    expect(from.mock.results[0].value.eq).toHaveBeenCalledWith('is_public', true);
  });

  it('get returns null when no row matches', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: null, error: null }) });
    const media = await createSupabaseServices(client).media.get('missing');
    expect(media).toBeNull();
  });

  it('update merges the patch and updates the row', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: MEDIA_ROW, error: null }) });
    const services = createSupabaseServices(client);
    const updated = await services.media.update('m1', { title: 'Renamed video' });
    expect(updated.title).toBe('Video'); // mapped from the mock row
    expect(from).toHaveBeenCalledTimes(2); // fetch + update
    const patch = from.mock.results[1].value.update.mock.calls[0][0];
    expect(patch.title).toBe('Renamed video');
  });

  it('remove throws when no row was deleted', async () => {
    const { client } = mockClient({ queryResult: () => ({ data: [], error: null }) });
    await expect(createSupabaseServices(client).media.remove('nope')).rejects.toThrow(
      /not found/i,
    );
  });
});

// ---------------------------------------------------------------------------
// Site features
// ---------------------------------------------------------------------------

describe('supabase site features service', () => {
  it('create validates input before hitting the database', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: FEATURE_ROW, error: null }) });
    await expect(
      createSupabaseServices(client).siteFeatures.create({
        name: '',
        featureType: 'building',
        description: '',
        latitude: 6.8,
        longitude: 3.09,
        geometry: null,
      }),
    ).rejects.toThrow(/name/i);
    expect(from).not.toHaveBeenCalled();
  });

  it('create inserts a snake_case row and maps the result', async () => {
    const { client, from } = mockClient({ queryResult: () => ({ data: FEATURE_ROW, error: null }) });
    const services = createSupabaseServices(client);
    const created = await services.siteFeatures.create({
      name: 'Building A',
      featureType: 'building',
      description: 'd',
      latitude: 6.8,
      longitude: 3.09,
      geometry: null,
    });
    expect(created.id).toBe('f1');
    const inserted = from.mock.results[0].value.insert.mock.calls[0][0];
    expect(inserted).toEqual(
      expect.objectContaining({ name: 'Building A', feature_type: 'building' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('supabase auth service', () => {
  it('signIn returns an admin session when is_admin() is true', async () => {
    const { client, rpc } = mockClient();
    const session = await createSupabaseServices(client).auth.signIn(
      'admin@school.local',
      'secret',
    );
    expect(session.user.role).toBe('admin');
    expect(session.user.email).toBe('admin@school.local');
    expect(session.expiresAt).toBe(new Date(1750000000 * 1000).toISOString());
    expect(rpc).toHaveBeenCalledWith('is_admin');
  });

  it('getSession returns null when signed out', async () => {
    const { client } = mockClient({
      getSessionResult: async () => ({ data: { session: null }, error: null }),
    });
    const session = await createSupabaseServices(client).auth.getSession();
    expect(session).toBeNull();
  });

  it('onAuthStateChange emits mapped events and returns an unsubscribe', async () => {
    const { client, auth } = mockClient();
    const services = createSupabaseServices(client);
    const handler = vi.fn();
    const unsubscribe = services.auth.onAuthStateChange(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(handler.mock.calls[0][0].event).toBe('SIGNED_IN');
    expect(handler.mock.calls[0][0].session.user.role).toBe('admin');
    unsubscribe();
    expect(auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('signOut calls Supabase signOut', async () => {
    const { client, auth } = mockClient();
    await createSupabaseServices(client).auth.signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('maps SIGNED_OUT to a null-session event', async () => {
    const { client } = mockClient({ authEvent: { event: 'SIGNED_OUT', session: null } });
    const services = createSupabaseServices(client);
    const handler = vi.fn();
    services.auth.onAuthStateChange(handler);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(handler.mock.calls[0][0].event).toBe('SIGNED_OUT');
    expect(handler.mock.calls[0][0].session).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('supabase reset', () => {
  it('calls the reset_demo_data RPC', async () => {
    const { client, rpc } = mockClient();
    await createSupabaseServices(client).resetData();
    expect(rpc).toHaveBeenCalledWith('reset_demo_data');
  });
});
