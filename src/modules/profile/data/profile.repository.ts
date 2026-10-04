import type { UserProfile } from '../domain/profile.types';

export interface ProfileRepository {
  get(userId: string): Promise<UserProfile | null>;
  save(profile: UserProfile): Promise<UserProfile>;
  getAvatarUrl(avatarPath: string): string;
  /** Stores an avatar under the user's folder and returns its path. */
  uploadAvatar(userId: string, file: File, extension: string): Promise<string>;
  removeAvatar(avatarPath: string): Promise<void>;
}
