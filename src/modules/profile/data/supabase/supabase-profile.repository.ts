import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { StorageBucket } from '@/infrastructure/supabase/storage-bucket.enum';
import { ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { Currency } from '@/shared/domain/currency.enum';
import type { UserProfile } from '../../domain/profile.types';
import type { ProfileRepository } from '../profile.repository';

type UserProfileDTO = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  default_currency: Currency;
};

function mapProfile(dto: UserProfileDTO): UserProfile {
  return {
    id: dto.id,
    displayName: dto.display_name,
    avatarPath: dto.avatar_path,
    defaultCurrency: dto.default_currency,
  };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  private get avatars() {
    return this.client.storage.from(StorageBucket.ProfileAvatars);
  }

  async get(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.UserProfiles)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    ensureSuccess(error);
    return data ? mapProfile(data as UserProfileDTO) : null;
  }

  async save(profile: UserProfile): Promise<UserProfile> {
    const { data, error } = await this.client.from(SupabaseTable.UserProfiles).upsert({
      id: profile.id,
      display_name: profile.displayName,
      avatar_path: profile.avatarPath,
      default_currency: profile.defaultCurrency,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    ensureSuccess(error);
    return mapProfile(data as UserProfileDTO);
  }

  getAvatarUrl(avatarPath: string): string {
    return this.avatars.getPublicUrl(avatarPath).data.publicUrl;
  }

  async uploadAvatar(userId: string, file: File, extension: string): Promise<string> {
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.avatars.upload(path, file, { contentType: file.type, upsert: false });
    ensureSuccess(error);
    return path;
  }

  async removeAvatar(avatarPath: string): Promise<void> {
    await this.avatars.remove([avatarPath]);
  }
}
