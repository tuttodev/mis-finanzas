import type { Tag } from '../../domain/tag.types';
import type { TagDTO } from './tag.dto';

export function mapTag(dto: TagDTO, usageCount = 0): Tag {
  return { id: dto.id, name: dto.name, isSystem: dto.is_system, usageCount };
}
