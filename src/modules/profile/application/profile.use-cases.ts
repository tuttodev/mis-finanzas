import { repositories } from '@/infrastructure/repositories';
import { getAvatarExtension, PROFILE_NAME_MAX_LENGTH } from '../domain/avatar';
import type { SaveProfileInput, UserProfile } from '../domain/profile.types';

export function getUserProfile(userId: string): Promise<UserProfile | null> {
  return repositories.profile.get(userId);
}

export function getAvatarUrl(avatarPath: string): string {
  return repositories.profile.getAvatarUrl(avatarPath);
}

/** Saves the profile, uploading a new avatar first and cleaning up the file that is no longer used. */
export async function saveUserProfile(input: SaveProfileInput): Promise<UserProfile> {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > PROFILE_NAME_MAX_LENGTH) {
    throw new Error('Escribe un nombre de hasta 80 caracteres');
  }

  const oldPath = input.currentAvatarPath;
  let avatarPath = input.removeAvatar ? null : oldPath;
  let uploadedPath: string | null = null;

  if (input.avatarFile) {
    const extension = getAvatarExtension(input.avatarFile);
    uploadedPath = await repositories.profile.uploadAvatar(input.userId, input.avatarFile, extension);
    avatarPath = uploadedPath;
  }

  try {
    const saved = await repositories.profile.save({
      id: input.userId,
      displayName,
      avatarPath,
      defaultCurrency: input.defaultCurrency,
    });
    if (oldPath && oldPath !== avatarPath) await repositories.profile.removeAvatar(oldPath);
    return saved;
  } catch (error) {
    if (uploadedPath) await repositories.profile.removeAvatar(uploadedPath);
    throw error;
  }
}
