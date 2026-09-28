import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/finance';

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  default_currency: Currency;
};

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserProfile | null;
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const { data, error } = await supabase.from('user_profiles').upsert({
    id: profile.id,
    display_name: profile.display_name,
    avatar_path: profile.avatar_path,
    default_currency: profile.default_currency,
    updated_at: new Date().toISOString(),
  }).select('*').single();
  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export function avatarPublicUrl(path: string): string {
  return supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
}
