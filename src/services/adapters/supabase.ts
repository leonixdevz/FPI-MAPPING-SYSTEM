/**
 * Supabase adapter (Phase K) — implements the same service interfaces as
 * the local adapter, against a real Supabase project:
 *
 *   - Data:   Postgres tables + Row Level Security (supabase/migrations)
 *   - Auth:   Supabase Auth (signInWithPassword, getSession, onAuthStateChange)
 *   - Media:  files are uploaded to the `school-media` Storage bucket and
 *             the row stores the resulting public URL
 *   - Reset:  admin dashboard reset calls the guarded reset_demo_data() RPC
 *
 * The client is injected (createSupabaseServices(client)) so unit tests can
 * pass a mock. snake_case columns map to camelCase TypeScript fields via the
 * exported pure mappers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolsService } from '../schools';
import type { MediaService } from '../media';
import type { SiteFeaturesService } from '../siteFeatures';
import type { AuthChangeEvent, AuthService } from '../auth';
import type { School, SchoolInput } from '../../types/school';
import { validateSchoolInput } from '../../types/school';
import type { Media, MediaInput } from '../../types/media';
import { validateMediaInput } from '../../types/media';
import type { SiteFeature, SiteFeatureInput } from '../../types/siteFeature';
import { validateSiteFeatureInput } from '../../types/siteFeature';
import type { Session, UserRole } from '../../types/user';

// ---------------------------------------------------------------------------
// Row shapes (snake_case, as returned by PostgREST)
// ---------------------------------------------------------------------------

interface SchoolRow {
  id: string;
  name: string;
  school_type: string;
  education_level: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  facilities: string[];
  topography: string;
  noise_information: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface MediaRow {
  id: string;
  title: string;
  description: string;
  media_type: string;
  file_url: string;
  thumbnail_url: string | null;
  latitude: number | null;
  longitude: number | null;
  feature_id: string | null;
  is_public: boolean;
  created_at: string;
}

interface SiteFeatureRow {
  id: string;
  name: string;
  feature_type: string;
  description: string;
  latitude: number;
  longitude: number;
  geometry: unknown;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mappers — exported for unit tests.
// ---------------------------------------------------------------------------

export function mapSchoolRow(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    schoolType: row.school_type as School['schoolType'],
    educationLevel: row.education_level as School['educationLevel'],
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    facilities: row.facilities ?? [],
    topography: row.topography,
    noiseInformation: row.noise_information,
    description: row.description,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSchoolRow(input: SchoolInput): Record<string, unknown> {
  return {
    name: input.name,
    school_type: input.schoolType,
    education_level: input.educationLevel,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    capacity: input.capacity,
    facilities: input.facilities,
    topography: input.topography,
    noise_information: input.noiseInformation,
    description: input.description,
    is_public: input.isPublic,
  };
}

export function mapMediaRow(row: MediaRow): Media {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mediaType: row.media_type as Media['mediaType'],
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    latitude: row.latitude,
    longitude: row.longitude,
    featureId: row.feature_id,
    isPublic: row.is_public,
    createdAt: row.created_at,
  };
}

/** MediaInput may carry a raw File (uploaded to Storage by the adapter); the row never stores it. */
export function toMediaRow(input: Omit<MediaInput, 'file'>): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description,
    media_type: input.mediaType,
    file_url: input.fileUrl,
    thumbnail_url: input.thumbnailUrl ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    feature_id: input.featureId ?? null,
    is_public: input.isPublic,
  };
}

export function mapSiteFeatureRow(row: SiteFeatureRow): SiteFeature {
  return {
    id: row.id,
    name: row.name,
    featureType: row.feature_type as SiteFeature['featureType'],
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    geometry: (row.geometry as SiteFeature['geometry']) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSiteFeatureRow(input: SiteFeatureInput): Record<string, unknown> {
  return {
    name: input.name,
    feature_type: input.featureType,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    geometry: input.geometry ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEDIA_BUCKET = 'school-media';

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

function randomId(): string {
  // crypto.randomUUID needs a secure context (https/localhost) and isn't
  // available in every runtime; fall back like the local adapter's
  // generateId() so uploads never crash on plain-HTTP deployments.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
}

/**
 * Upload a picked file to the school-media bucket and return its public URL.
 * Note: if the subsequent row insert/update fails, the uploaded object stays
 * in storage (orphaned). Acceptable for the MVP; a cleanup job or storage
 * trigger could remove it later.
 */
function uploadMediaFile(client: SupabaseClient, file: File): Promise<string> {
  const path = `uploads/${randomId()}-${sanitizeFileName(file.name)}`;
  return client.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })
    .then(({ error }) => {
      if (error) throw new Error(`Media upload failed — ${error.message}`);
      const { data } = client.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    });
}

function assertValidSchool(input: Partial<SchoolInput>): void {
  const issues = validateSchoolInput(input);
  if (issues.length > 0) {
    throw new Error(`Invalid school input — ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`);
  }
}

function assertValidMedia(input: Partial<MediaInput>): void {
  const issues = validateMediaInput(input);
  if (issues.length > 0) {
    throw new Error(`Invalid media input — ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`);
  }
}

function assertValidSiteFeature(input: Partial<SiteFeatureInput>): void {
  const issues = validateSiteFeatureInput(input);
  if (issues.length > 0) {
    throw new Error(`Invalid site feature input — ${issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`);
  }
}

// ---------------------------------------------------------------------------
// Auth — maps Supabase Auth sessions onto the app's Session type. The role
// comes from the server-side is_admin() RPC (RLS-protected admins table),
// so the client never guesses who is an administrator.
// ---------------------------------------------------------------------------

async function roleFor(client: SupabaseClient, email: string | undefined): Promise<UserRole> {
  if (!email) return 'public';
  const { data, error } = await client.rpc('is_admin');
  if (error) return 'public';
  return data === true ? 'admin' : 'public';
}

function toAppSession(
  supabaseSession: {
    user: { id: string; email?: string };
    expires_at?: number;
  },
  role: UserRole,
): Session {
  const issuedAt = new Date();
  const expiresAt = supabaseSession.expires_at
    ? new Date(supabaseSession.expires_at * 1000)
    : new Date(issuedAt.getTime() + 8 * 60 * 60 * 1000);
  return {
    user: {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      role,
    },
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function mapAuthEvent(event: string): AuthChangeEvent['event'] {
  switch (event) {
    case 'SIGNED_OUT':
      return 'SIGNED_OUT';
    case 'TOKEN_REFRESHED':
      return 'TOKEN_REFRESHED';
    case 'USER_UPDATED':
      return 'USER_UPDATED';
    default:
      // 'INITIAL_SESSION' and 'SIGNED_IN' both mean "here is the session".
      return 'SIGNED_IN';
  }
}

// ---------------------------------------------------------------------------
// createSupabaseServices — builds the four service implementations around a
// given client. Injectable for tests.
// ---------------------------------------------------------------------------

export interface SupabaseServices {
  schools: SchoolsService;
  media: MediaService;
  siteFeatures: SiteFeaturesService;
  auth: AuthService;
  resetData: () => Promise<void>;
}

export function createSupabaseServices(client: SupabaseClient): SupabaseServices {
  // ---- schools --------------------------------------------------------------

  const fetchSchool = async (id: string): Promise<School | null> => {
    const { data, error } = await client
      .from('schools')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError(error, 'Failed to load school.');
    return data ? mapSchoolRow(data) : null;
  };

  const schools: SchoolsService = {
    async list() {
      const { data, error } = await client.from('schools').select('*').order('name');
      throwIfError(error, 'Failed to load schools.');
      return (data ?? []).map(mapSchoolRow);
    },
    async get(id) {
      return fetchSchool(id);
    },
    async create(input) {
      assertValidSchool(input);
      const { data, error } = await client
        .from('schools')
        .insert(toSchoolRow(input))
        .select()
        .single();
      throwIfError(error, 'Failed to create school.');
      return mapSchoolRow(data);
    },
    async update(id, input) {
      const current = await fetchSchool(id);
      if (!current) throw new Error(`School not found: ${id}`);
      assertValidSchool({ ...current, ...input });
      const { data, error } = await client
        .from('schools')
        .update(toSchoolRow({ ...current, ...input } as SchoolInput))
        .eq('id', id)
        .select()
        .single();
      throwIfError(error, 'Failed to update school.');
      return mapSchoolRow(data);
    },
    async remove(id) {
      const { data, error } = await client.from('schools').delete().eq('id', id).select();
      throwIfError(error, 'Failed to delete school.');
      if (!data || data.length === 0) throw new Error(`School not found: ${id}`);
    },
    async listPublic() {
      const { data, error } = await client
        .from('schools')
        .select('*')
        .eq('is_public', true)
        .order('name');
      throwIfError(error, 'Failed to load schools.');
      return (data ?? []).map(mapSchoolRow);
    },
  };

  // ---- media ----------------------------------------------------------------

  const media: MediaService = {
    async list() {
      const { data, error } = await client
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });
      throwIfError(error, 'Failed to load media.');
      return (data ?? []).map(mapMediaRow);
    },
    async get(id) {
      const { data, error } = await client
        .from('media')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwIfError(error, 'Failed to load media record.');
      return data ? mapMediaRow(data) : null;
    },
    async create(input) {
      assertValidMedia(input);
      let fileUrl = input.fileUrl;
      if (input.file) {
        fileUrl = await uploadMediaFile(client, input.file);
      }
      const { data, error } = await client
        .from('media')
        .insert(toMediaRow({ ...input, fileUrl }))
        .select()
        .single();
      throwIfError(error, 'Failed to create media record.');
      return mapMediaRow(data);
    },
    async update(id, input) {
      const { data: current, error: fetchError } = await client
        .from('media')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwIfError(fetchError, 'Failed to load media record.');
      if (!current) throw new Error(`Media not found: ${id}`);

      let fileUrl = input.fileUrl ?? current.file_url;
      if (input.file) {
        fileUrl = await uploadMediaFile(client, input.file);
      }
      assertValidMedia({ ...mapMediaRow(current), ...input, fileUrl });
      const { data, error } = await client
        .from('media')
        .update(toMediaRow({ ...mapMediaRow(current), ...input, fileUrl }))
        .eq('id', id)
        .select()
        .single();
      throwIfError(error, 'Failed to update media record.');
      return mapMediaRow(data);
    },
    async remove(id) {
      const { data, error } = await client.from('media').delete().eq('id', id).select();
      throwIfError(error, 'Failed to delete media record.');
      if (!data || data.length === 0) throw new Error(`Media not found: ${id}`);
    },
    async listPublic() {
      const { data, error } = await client
        .from('media')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      throwIfError(error, 'Failed to load media.');
      return (data ?? []).map(mapMediaRow);
    },
  };

  // ---- site features ----------------------------------------------------------

  const siteFeatures: SiteFeaturesService = {
    async list() {
      const { data, error } = await client.from('site_features').select('*').order('name');
      throwIfError(error, 'Failed to load site features.');
      return (data ?? []).map(mapSiteFeatureRow);
    },
    async get(id) {
      const { data, error } = await client
        .from('site_features')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwIfError(error, 'Failed to load site feature.');
      return data ? mapSiteFeatureRow(data) : null;
    },
    async create(input) {
      assertValidSiteFeature(input);
      const { data, error } = await client
        .from('site_features')
        .insert(toSiteFeatureRow(input))
        .select()
        .single();
      throwIfError(error, 'Failed to create site feature.');
      return mapSiteFeatureRow(data);
    },
    async update(id, input) {
      const { data: current, error: fetchError } = await client
        .from('site_features')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      throwIfError(fetchError, 'Failed to load site feature.');
      if (!current) throw new Error(`Site feature not found: ${id}`);
      assertValidSiteFeature({ ...mapSiteFeatureRow(current), ...input });
      const { data, error } = await client
        .from('site_features')
        .update(toSiteFeatureRow({ ...mapSiteFeatureRow(current), ...input }))
        .eq('id', id)
        .select()
        .single();
      throwIfError(error, 'Failed to update site feature.');
      return mapSiteFeatureRow(data);
    },
    async remove(id) {
      const { data, error } = await client
        .from('site_features')
        .delete()
        .eq('id', id)
        .select();
      throwIfError(error, 'Failed to delete site feature.');
      if (!data || data.length === 0) throw new Error(`Site feature not found: ${id}`);
    },
  };

  // ---- auth -------------------------------------------------------------------

  const auth: AuthService = {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      throwIfError(error, 'Failed to read session.');
      if (!data.session) return null;
      const role = await roleFor(client, data.session.user.email);
      return toAppSession(data.session, role);
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      throwIfError(error, 'Sign in failed.');
      if (!data.session) throw new Error('Sign in succeeded but no session was returned.');
      const role = await roleFor(client, data.session.user.email);
      return toAppSession(data.session, role);
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      throwIfError(error, 'Sign out failed.');
    },
    onAuthStateChange(handler) {
      // Role lookup is async (is_admin RPC). `disposed` guards against
      // emitting after unsubscribe; a transient RPC failure degrades the
      // role to 'public' (fail-safe) until the next event or refresh.
      let disposed = false;
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, supabaseSession) => {
        void (async () => {
          const role = supabaseSession
            ? await roleFor(client, supabaseSession.user.email)
            : 'public';
          if (disposed) return;
          handler({
            event: mapAuthEvent(event),
            session: supabaseSession ? toAppSession(supabaseSession, role) : null,
          });
        })();
      });
      return () => {
        disposed = true;
        subscription.unsubscribe();
      };
    },
    async getUser() {
      const session = await auth.getSession();
      return session?.user ?? null;
    },
  };

  // ---- reset -------------------------------------------------------------------

  async function resetData(): Promise<void> {
    const { error } = await client.rpc('reset_demo_data');
    throwIfError(error, 'Reset failed (are you an administrator?).');
  }

  return { schools, media, siteFeatures, auth, resetData };
}
