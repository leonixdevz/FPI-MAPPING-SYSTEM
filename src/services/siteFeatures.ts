import type { SiteFeature, SiteFeatureInput } from '../types/siteFeature';

export interface SiteFeaturesService {
  list(): Promise<SiteFeature[]>;
  get(id: string): Promise<SiteFeature | null>;
  create(input: SiteFeatureInput): Promise<SiteFeature>;
  update(id: string, input: Partial<SiteFeatureInput>): Promise<SiteFeature>;
  remove(id: string): Promise<void>;
}
