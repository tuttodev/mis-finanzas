import type { CreateFeedbackInput } from '../domain/feedback.types';

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<void>;
}
