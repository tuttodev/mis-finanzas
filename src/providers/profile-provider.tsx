'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { fetchUserProfile } from '@/services/profile';
import type { Currency } from '@/types/finance';

export function useUserProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['user-profile', session.user.id],
    queryFn: () => fetchUserProfile(session.user.id),
  });
}

export function useDefaultCurrency(): { currency: Currency; isLoading: boolean; isError: boolean } {
  const profile = useUserProfile();
  return {
    currency: profile.data?.default_currency ?? 'COP',
    isLoading: profile.isLoading,
    isError: profile.isError,
  };
}
