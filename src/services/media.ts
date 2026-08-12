import type { Media, MediaInput } from '../types/media';

export interface MediaService {
  list(): Promise<Media[]>;
  get(id: string): Promise<Media | null>;
  create(input: MediaInput): Promise<Media>;
  update(id: string, input: Partial<MediaInput>): Promise<Media>;
  remove(id: string): Promise<void>;

  listPublic(): Promise<Media[]>;
}
