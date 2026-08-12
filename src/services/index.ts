/**
 * Service barrel — selects the active adapter based on VITE_DATA_BACKEND.
 *
 *   VITE_DATA_BACKEND=local     (default) in-memory + localStorage adapter
 *   VITE_DATA_BACKEND=supabase  real Supabase project (needs the env keys)
 *
 * Components import from this module only; they never reach into an
 * adapter directly. That keeps the swap to a single config change.
 */

import { createSupabaseClient } from '../lib/supabase';
import { createSupabaseServices } from './adapters/supabase';
import {
  localSchoolsService,
  localMediaService,
  localSiteFeaturesService,
  localAuthService,
  resetLocalData,
} from './adapters/local';
import type { SchoolsService } from './schools';
import type { MediaService } from './media';
import type { SiteFeaturesService } from './siteFeatures';
import type { AuthService } from './auth';

const backend = import.meta.env.VITE_DATA_BACKEND ?? 'local';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const useSupabase =
  backend === 'supabase' && Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

if (backend === 'supabase' && !useSupabase) {
  console.warn(
    '[sms] VITE_DATA_BACKEND=supabase set, but VITE_SUPABASE_URL / ' +
      'VITE_SUPABASE_ANON_KEY are missing — falling back to the local adapter.',
  );
}

const services = useSupabase
  ? createSupabaseServices(createSupabaseClient(supabaseUrl!, supabaseAnonKey!))
  : {
      schools: localSchoolsService,
      media: localMediaService,
      siteFeatures: localSiteFeaturesService,
      auth: localAuthService,
      resetData: resetLocalData,
    };

export const schoolsService: SchoolsService = services.schools;
export const mediaService: MediaService = services.media;
export const siteFeaturesService: SiteFeaturesService = services.siteFeatures;
export const authService: AuthService = services.auth;

/**
 * Resets demo data: clears + re-seeds the local adapter, or calls the
 * guarded reset_demo_data() RPC against Supabase. Works with both backends.
 */
export const resetData: (() => void) | (() => Promise<void>) = services.resetData;
