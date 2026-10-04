import type { CreateTagInput, Tag } from '../domain/tag.types';

export interface TagsRepository {
  /** All tags ordered by name, with how many transactions use each one. */
  list(): Promise<Tag[]>;
  create(input: CreateTagInput): Promise<Tag>;
  /** Whether a tag is a system tag and whether any transaction uses it. */
  getDeletionInfo(tagId: string): Promise<{ isSystem: boolean; isInUse: boolean }>;
  delete(tagId: string): Promise<void>;
}
