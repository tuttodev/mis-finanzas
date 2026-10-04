import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { PostgresErrorCode } from '@/infrastructure/supabase/postgres-error-code.enum';
import { ensureData, ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { CreateTagInput, Tag } from '../../domain/tag.types';
import type { TagsRepository } from '../tags.repository';
import type { TagDTO } from './tag.dto';
import { mapTag } from './tag.mapper';

export class SupabaseTagsRepository implements TagsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Tag[]> {
    const [{ data, error }, { data: usageData, error: usageError }] = await Promise.all([
      this.client.from(SupabaseTable.Tags).select('*').order('name'),
      this.client.from(SupabaseTable.TransactionTags).select('tag_id'),
    ]);
    const tagDtos = ensureData(data as TagDTO[] | null, error);
    const usageRows = ensureData(usageData as Array<{ tag_id: string }> | null, usageError);
    const usageCounts = new Map<string, number>();

    for (const row of usageRows) {
      usageCounts.set(row.tag_id, (usageCounts.get(row.tag_id) ?? 0) + 1);
    }

    return tagDtos.map((tag) => mapTag(tag, usageCounts.get(tag.id) ?? 0));
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const { data, error } = await this.client
      .from(SupabaseTable.Tags)
      .insert({ name: input.name })
      .select('*')
      .single();

    if (error?.code === PostgresErrorCode.UniqueViolation) {
      throw new Error('Ya existe una etiqueta con ese nombre');
    }

    return mapTag(ensureData(data as TagDTO | null, error));
  }

  async getDeletionInfo(tagId: string): Promise<{ isSystem: boolean; isInUse: boolean }> {
    const { data: tagData, error: tagError } = await this.client
      .from(SupabaseTable.Tags)
      .select('is_system')
      .eq('id', tagId)
      .single();
    const tag = ensureData(tagData as { is_system: boolean } | null, tagError);

    const { data, error } = await this.client
      .from(SupabaseTable.TransactionTags)
      .select('transaction_id')
      .eq('tag_id', tagId)
      .limit(1);
    const links = ensureData(data as Array<{ transaction_id: string }> | null, error);

    return { isSystem: tag.is_system, isInUse: links.length > 0 };
  }

  async delete(tagId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Tags).delete().eq('id', tagId);
    ensureSuccess(error);
  }
}
