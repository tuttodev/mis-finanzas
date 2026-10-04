import { repositories } from '@/infrastructure/repositories';
import type { CreateTagInput, Tag } from '../domain/tag.types';

export function listTags(): Promise<Tag[]> {
  return repositories.tags.list();
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 40) throw new Error('La etiqueta no puede superar 40 caracteres');

  return repositories.tags.create({ name });
}

export async function deleteTag(tagId: string): Promise<void> {
  const { isSystem, isInUse } = await repositories.tags.getDeletionInfo(tagId);
  if (isSystem) throw new Error('Las etiquetas comunes no se pueden eliminar');
  if (isInUse) throw new Error('No se puede eliminar una etiqueta que está en uso');

  await repositories.tags.delete(tagId);
}
