import { ImageMimeType } from '@/shared/http/image-mime-type.enum';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_NAME_MAX_LENGTH = 80;

export const AVATAR_EXTENSIONS: Record<ImageMimeType, string> = {
  [ImageMimeType.Jpeg]: 'jpg',
  [ImageMimeType.Png]: 'png',
  [ImageMimeType.Webp]: 'webp',
};

/** Returns the file extension for a valid avatar or throws a user-facing error. */
export function getAvatarExtension(file: Pick<File, 'type' | 'size'>): string {
  const extension = AVATAR_EXTENSIONS[file.type as ImageMimeType];
  if (!extension || file.size > AVATAR_MAX_BYTES) {
    throw new Error('Usa una imagen JPG, PNG o WebP de máximo 2 MB');
  }
  return extension;
}
