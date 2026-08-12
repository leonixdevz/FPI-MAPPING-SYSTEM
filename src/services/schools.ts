import type { School, SchoolInput } from '../types/school';

/**
 * Schools service contract. Implemented by:
 *   - adapters/local.ts (in-memory + localStorage)
 *   - adapters/supabase.ts (Phase K)
 *
 * Components import this module, never an adapter directly. That way
 * swapping the data backend is a one-line change in services/index.ts.
 */

export interface SchoolsService {
  list(): Promise<School[]>;
  get(id: string): Promise<School | null>;
  create(input: SchoolInput): Promise<School>;
  update(id: string, input: Partial<SchoolInput>): Promise<School>;
  remove(id: string): Promise<void>;

  /**
   * List public-only schools (isPublic = true). Used by the public map
   * and the public schools list. Admin views should use list() instead.
   */
  listPublic(): Promise<School[]>;
}
