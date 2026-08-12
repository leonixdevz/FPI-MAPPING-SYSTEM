/**
 * Service barrel — selects the adapter based on VITE_DATA_BACKEND.
 *
 * Today only the local adapter exists. Phase K adds a Supabase adapter
 * and switches based on this env var. Components import from this
 * module only; they never reach into an adapter directly.
 */

import { localSchoolsService } from './adapters/local';
import { localMediaService } from './adapters/local';
import { localSiteFeaturesService } from './adapters/local';
import { localAuthService, resetLocalData } from './adapters/local';
import type { SchoolsService } from './schools';
import type { MediaService } from './media';
import type { SiteFeaturesService } from './siteFeatures';
import type { AuthService } from './auth';

const backend = import.meta.env.VITE_DATA_BACKEND ?? 'local';

function pick<T>(local: T, _supabase: T | null): T {
  // The Supabase adapter is not yet implemented (Phase K). Until it is,
  // the only valid backend is 'local'. Any other value falls back to
  // local with a console warning so the dev server stays usable.
  if (backend === 'supabase') {
    console.warn(
      '[sms] VITE_DATA_BACKEND=supabase requested but the Supabase adapter ' +
        'is not yet implemented (Phase K). Falling back to local adapter.',
    );
  }
  return local;
}

export const schoolsService: SchoolsService = pick(localSchoolsService, null);
export const mediaService: MediaService = pick(localMediaService, null);
export const siteFeaturesService: SiteFeaturesService = pick(localSiteFeaturesService, null);
export const authService: AuthService = pick(localAuthService, null);

export { resetLocalData };
