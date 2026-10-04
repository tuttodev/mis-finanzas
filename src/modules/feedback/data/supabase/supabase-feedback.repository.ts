import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { CreateFeedbackInput } from '../../domain/feedback.types';
import type { FeedbackRepository } from '../feedback.repository';

export class SupabaseFeedbackRepository implements FeedbackRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateFeedbackInput): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Feedback).insert({
      message: input.message,
      page_path: input.pagePath,
    });
    ensureSuccess(error);
  }
}
