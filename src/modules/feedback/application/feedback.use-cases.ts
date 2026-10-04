import { repositories } from '@/infrastructure/repositories';
import type { CreateFeedbackInput } from '../domain/feedback.types';

export async function sendFeedback(input: CreateFeedbackInput): Promise<void> {
  const message = input.message.trim();
  if (message.length < 3) throw new Error('Cuéntanos un poco más para poder ayudarte');
  if (message.length > 2000) throw new Error('El feedback no puede superar 2.000 caracteres');
  if (!input.pagePath || input.pagePath.length > 500) {
    throw new Error('No se pudo identificar la sección de la aplicación');
  }

  await repositories.feedback.create({ message, pagePath: input.pagePath });
}
