import type { Currency } from '@/shared/domain/currency.enum';

export type UserProfile = {
  id: string;
  displayName: string | null;
  avatarPath: string | null;
  defaultCurrency: Currency;
};

export type SaveProfileInput = {
  userId: string;
  displayName: string;
  defaultCurrency: Currency;
  /** Current avatar path; replaced by `avatarFile` or cleared by `removeAvatar`. */
  currentAvatarPath: string | null;
  avatarFile: File | null;
  removeAvatar: boolean;
};
