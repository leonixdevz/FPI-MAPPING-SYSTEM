/**
 * Local adapter — implements all service interfaces against an
 * in-memory store backed by `window.localStorage`. Selected by default
 * via VITE_DATA_BACKEND=local (or simply left unset).
 *
 * Properties:
 *  - Deterministic across reloads (state is serialized to localStorage)
 *  - No external services required
 *  - No secrets to leak (the demo admin password lives in .env, not here)
 *  - One demo school is seeded on first load so the public map has
 *    something to render before the admin creates real records
 *  - A curated set of site media (drone screencast + five screenshots
 *    from the project data/ folder) is seeded so the public gallery
 *    has content for the defence demo
 *  - Concurrent tabs share state via the 'storage' event
 *
 * The seeded demo school sits at the temporary centre and is marked
 * `isPublic: true`. Its `description` includes an obvious "TODO" hint
 * so a reviewer can tell at a glance that this is placeholder data,
 * not a fabricated real school record. None of the seeded media carry
 * GPS metadata — per spec Section 12 they keep null coordinates.
 */

import type { School, SchoolInput, ValidationIssue } from '../../types/school';
import { validateSchoolInput } from '../../types/school';
import type { Media, MediaInput } from '../../types/media';
import { validateMediaInput } from '../../types/media';
import type { SiteFeature } from '../../types/siteFeature';
import type { Session } from '../../types/user';
import type { SchoolsService } from '../schools';
import type { MediaService } from '../media';
import type { SiteFeaturesService } from '../siteFeatures';
import type { AuthService, AuthChangeHandler, AuthChangeEvent, Unsubscribe } from '../auth';
import { TEMPORARY_CENTRE } from '../../config/studyArea';

// ---------------------------------------------------------------------------
// Local storage helpers — narrow the localStorage surface to a single
// prefix so other apps on the same origin can't collide with us, and
// so the reset utility can wipe everything we own in one pass.
// ---------------------------------------------------------------------------

const NS = 'sms';
const KEYS = {
  schools: `${NS}.schools`,
  media: `${NS}.media`,
  siteFeatures: `${NS}.siteFeatures`,
  session: `${NS}.session`,
  seeded: `${NS}.seeded.v1`,
} as const;

function readCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // Corrupt JSON — surface as empty rather than crashing the app.
    return [];
  }
}

function writeCollection<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded, private mode, etc. Surface to the console; the
    // app continues to work in-memory for the rest of the session.
    console.error(`[sms] localStorage write failed for ${key}:`, err);
  }
}

function readScalar<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeScalar<T>(key: string, value: T | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error(`[sms] localStorage write failed for ${key}:`, err);
  }
}

// ---------------------------------------------------------------------------
// ID + timestamp generation — no crypto.randomUUID() dependency so the
// adapter works in any browser. crypto.randomUUID exists in modern
// browsers but the manual fallback keeps us safe on older runtimes.
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Cross-tab sync — listen for storage events and notify subscribers
// so two open tabs stay in step. Each service maintains its own
// subscriber list, mirroring the Supabase realtime model.
// ---------------------------------------------------------------------------

type CollectionListener = () => void;
const collectionListeners: Record<string, Set<CollectionListener>> = {
  [KEYS.schools]: new Set(),
  [KEYS.media]: new Set(),
  [KEYS.siteFeatures]: new Set(),
  [KEYS.session]: new Set(),
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    const set = collectionListeners[e.key];
    if (!set) return;
    for (const listener of set) listener();
  });
}

function emit(key: string): void {
  for (const listener of collectionListeners[key] ?? []) listener();
}

// ---------------------------------------------------------------------------
// First-run seeding
// ---------------------------------------------------------------------------

function seedIfEmpty(): void {
  if (localStorage.getItem(KEYS.seeded) === '1') return;

  const now = nowIso();
  const demoSchool: School = {
    id: generateId(),
    name: 'Sample School (placeholder — replace with real records)',
    schoolType: 'public',
    educationLevel: 'senior_secondary',
    address: 'TODO: REQUIRED PROJECT GIS DATA — enter the real school address',
    latitude: TEMPORARY_CENTRE.lat,
    longitude: TEMPORARY_CENTRE.lng,
    capacity: 0,
    facilities: [],
    topography: 'TODO: enter real topography description',
    noiseInformation: 'TODO: enter real noise context',
    description:
      'Placeholder school record seeded by the local adapter so the map has ' +
      'something to render. Replace with real records through the admin dashboard. ' +
      'See TODO: REQUIRED PROJECT GIS DATA.',
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  };

  writeCollection<School>(KEYS.schools, [demoSchool]);

  // Curated media seeded from the project data/ folder (copied to
  // public/media/). These are screen captures of the site exploration
  // session (2026-08-11): the drone screencast plus five screenshots.
  // None carry GPS metadata, so lat/lng stay null per spec Section 12.
  const curatedMedia: Media[] = [
    {
      id: generateId(),
      title: 'Drone site tour — screencast (2026-08-11)',
      description:
        'Screen capture of the site exploration flight (~170 s, 1600×900). ' +
        'Non-georeferenced screen capture used as visual site evidence.',
      mediaType: 'drone_video',
      fileUrl: '/media/site-tour-2026-08-11.mp4',
      thumbnailUrl: '/media/captures/site-221205.png',
      latitude: null,
      longitude: null,
      featureId: null,
      isPublic: true,
      createdAt: now,
    },
    ...[['site-220320', '22:03'], ['site-220437', '22:04'], ['site-220640', '22:06'], ['site-220919', '22:09'], ['site-221205', '22:12']].map(
      ([slug, time]): Media => ({
        id: generateId(),
        title: `Site capture — ${time} (2026-08-11)`,
        description: 'Screen capture from the site exploration session (2026-08-11). Non-georeferenced.',
        mediaType: 'site_photo',
        fileUrl: `/media/captures/${slug}.png`,
        thumbnailUrl: null,
        latitude: null,
        longitude: null,
        featureId: null,
        isPublic: true,
        createdAt: now,
      }),
    ),
  ];
  writeCollection<Media>(KEYS.media, curatedMedia);
  writeCollection<SiteFeature>(KEYS.siteFeatures, []);
  localStorage.setItem(KEYS.seeded, '1');
}

// ---------------------------------------------------------------------------
// School validation gate — uses the pure function from types/school.ts
// so the same rules apply on the server when Supabase is wired.
// ---------------------------------------------------------------------------

function assertValidSchool(input: Partial<SchoolInput>): void {
  const issues: ValidationIssue[] = validateSchoolInput(input);
  if (issues.length > 0) {
    const msg = issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid school input — ${msg}`);
  }
}

function assertValidMedia(input: Partial<MediaInput>): void {
  const issues = validateMediaInput(input);
  if (issues.length > 0) {
    const msg = issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid media input — ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export const localSchoolsService: SchoolsService = {
  async list() {
    seedIfEmpty();
    return readCollection<School>(KEYS.schools);
  },
  async get(id) {
    seedIfEmpty();
    const all = readCollection<School>(KEYS.schools);
    return all.find((s) => s.id === id) ?? null;
  },
  async create(input) {
    seedIfEmpty();
    assertValidSchool(input);
    const now = nowIso();
    const school: School = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const all = readCollection<School>(KEYS.schools);
    all.push(school);
    writeCollection(KEYS.schools, all);
    emit(KEYS.schools);
    return school;
  },
  async update(id, input) {
    seedIfEmpty();
    const all = readCollection<School>(KEYS.schools);
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`School not found: ${id}`);
    // Validate the merged record, not just the patch.
    assertValidSchool({ ...all[idx], ...input });
    const next: School = {
      ...all[idx],
      ...input,
      id: all[idx].id,
      createdAt: all[idx].createdAt,
      updatedAt: nowIso(),
    };
    all[idx] = next;
    writeCollection(KEYS.schools, all);
    emit(KEYS.schools);
    return next;
  },
  async remove(id) {
    seedIfEmpty();
    const all = readCollection<School>(KEYS.schools);
    const next = all.filter((s) => s.id !== id);
    if (next.length === all.length) throw new Error(`School not found: ${id}`);
    writeCollection(KEYS.schools, next);
    emit(KEYS.schools);
  },
  async listPublic() {
    seedIfEmpty();
    return readCollection<School>(KEYS.schools).filter((s) => s.isPublic);
  },
};

export const localMediaService: MediaService = {
  async list() {
    seedIfEmpty();
    return readCollection<Media>(KEYS.media);
  },
  async get(id) {
    seedIfEmpty();
    const all = readCollection<Media>(KEYS.media);
    return all.find((m) => m.id === id) ?? null;
  },
  async create(input) {
    seedIfEmpty();
    assertValidMedia(input);
    const now = nowIso();
    // `file` is a storage-only transport for the Supabase adapter; it is
    // never persisted by the local adapter (a File is not JSON-serializable).
    const { file: _file, ...row } = input;
    void _file;
    const media: Media = {
      ...row,
      id: generateId(),
      createdAt: now,
    };
    const all = readCollection<Media>(KEYS.media);
    all.push(media);
    writeCollection(KEYS.media, all);
    emit(KEYS.media);
    return media;
  },
  async update(id, input) {
    seedIfEmpty();
    const all = readCollection<Media>(KEYS.media);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error(`Media not found: ${id}`);
    const { file: _file, ...patch } = input;
    void _file;
    assertValidMedia({ ...all[idx], ...patch });
    const next: Media = { ...all[idx], ...patch, id: all[idx].id, createdAt: all[idx].createdAt };
    all[idx] = next;
    writeCollection(KEYS.media, all);
    emit(KEYS.media);
    return next;
  },
  async remove(id) {
    seedIfEmpty();
    const all = readCollection<Media>(KEYS.media);
    const next = all.filter((m) => m.id !== id);
    if (next.length === all.length) throw new Error(`Media not found: ${id}`);
    writeCollection(KEYS.media, next);
    emit(KEYS.media);
  },
  async listPublic() {
    seedIfEmpty();
    return readCollection<Media>(KEYS.media).filter((m) => m.isPublic);
  },
};

export const localSiteFeaturesService: SiteFeaturesService = {
  async list() {
    seedIfEmpty();
    return readCollection<SiteFeature>(KEYS.siteFeatures);
  },
  async get(id) {
    seedIfEmpty();
    const all = readCollection<SiteFeature>(KEYS.siteFeatures);
    return all.find((f) => f.id === id) ?? null;
  },
  async create(input) {
    seedIfEmpty();
    const now = nowIso();
    const feature: SiteFeature = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const all = readCollection<SiteFeature>(KEYS.siteFeatures);
    all.push(feature);
    writeCollection(KEYS.siteFeatures, all);
    emit(KEYS.siteFeatures);
    return feature;
  },
  async update(id, input) {
    seedIfEmpty();
    const all = readCollection<SiteFeature>(KEYS.siteFeatures);
    const idx = all.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`Site feature not found: ${id}`);
    const next: SiteFeature = {
      ...all[idx],
      ...input,
      id: all[idx].id,
      createdAt: all[idx].createdAt,
      updatedAt: nowIso(),
    };
    all[idx] = next;
    writeCollection(KEYS.siteFeatures, all);
    emit(KEYS.siteFeatures);
    return next;
  },
  async remove(id) {
    seedIfEmpty();
    const all = readCollection<SiteFeature>(KEYS.siteFeatures);
    const next = all.filter((f) => f.id !== id);
    if (next.length === all.length) throw new Error(`Site feature not found: ${id}`);
    writeCollection(KEYS.siteFeatures, next);
    emit(KEYS.siteFeatures);
  },
};

// ---------------------------------------------------------------------------
// Auth — local adapter. Checks the VITE_DEMO_ADMIN_EMAIL / PASSWORD
// pair from .env. A successful sign-in produces a session that lasts
// 8 hours, after which it expires.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const authSubscribers = new Set<AuthChangeHandler>();

function getAdminCredentials(): { email: string; password: string } | null {
  const email = import.meta.env.VITE_DEMO_ADMIN_EMAIL;
  const password = import.meta.env.VITE_DEMO_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function buildSession(): Session {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
  const creds = getAdminCredentials();
  return {
    user: {
      id: 'local-admin',
      email: creds?.email ?? 'admin@school.local',
      role: 'admin',
    },
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function notify(event: AuthChangeEvent): void {
  for (const handler of authSubscribers) {
    try {
      handler(event);
    } catch (err) {
      console.error('[sms] auth subscriber threw:', err);
    }
  }
}

export const localAuthService: AuthService = {
  async getSession() {
    const session = readScalar<Session>(KEYS.session);
    if (!session) return null;
    // Expire sessions past their TTL.
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      writeScalar<Session>(KEYS.session, null);
      return null;
    }
    return session;
  },
  async signIn(email, password) {
    const creds = getAdminCredentials();
    if (!creds) {
      throw new Error(
        'Local auth is not configured. Set VITE_DEMO_ADMIN_EMAIL and ' +
          'VITE_DEMO_ADMIN_PASSWORD in your .env file (see .env.example).',
      );
    }
    if (email.trim().toLowerCase() !== creds.email.toLowerCase() || password !== creds.password) {
      throw new Error('Invalid email or password.');
    }
    const session = buildSession();
    writeScalar(KEYS.session, session);
    emit(KEYS.session);
    notify({ event: 'SIGNED_IN', session });
    return session;
  },
  async signOut() {
    writeScalar<Session>(KEYS.session, null);
    emit(KEYS.session);
    notify({ event: 'SIGNED_OUT', session: null });
  },
  onAuthStateChange(handler: AuthChangeHandler): Unsubscribe {
    authSubscribers.add(handler);
    // Fire immediately with the current state, matching Supabase's
    // behaviour where the first event arrives on subscription.
    this.getSession()
      .then((session) => {
        const event: AuthChangeEvent = session
          ? { event: 'SIGNED_IN', session }
          : { event: 'SIGNED_OUT', session: null };
        handler(event);
      })
      .catch((err) => console.error('[sms] initial auth state failed:', err));
    return () => {
      authSubscribers.delete(handler);
    };
  },
  async getUser() {
    const session = await this.getSession();
    return session?.user ?? null;
  },
};

// ---------------------------------------------------------------------------
// Reset utility — for the admin dev "Reset demo data" button.
// Wipes everything we own and re-seeds the demo school.
// ---------------------------------------------------------------------------

export function resetLocalData(): void {
  writeScalar(KEYS.schools, null);
  writeScalar(KEYS.media, null);
  writeScalar(KEYS.siteFeatures, null);
  writeScalar(KEYS.session, null);
  writeScalar(KEYS.seeded, null);
  // Re-seed and notify all subscribers.
  seedIfEmpty();
  emit(KEYS.schools);
  emit(KEYS.media);
  emit(KEYS.siteFeatures);
  emit(KEYS.session);
}
