import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/application/auth-provider';
import { DEFAULT_CURRENCY, type Currency } from '@/shared/domain/currency.enum';
import { profileQueries } from './profile.queries';

export function useUserProfile() {
  const { session } = useAuth();
  return useQuery(profileQueries.detail(session.user.id));
}

export function useDefaultCurrency(): { currency: Currency; isLoading: boolean; isError: boolean } {
  const profile = useUserProfile();
  return {
    currency: profile.data?.defaultCurrency ?? DEFAULT_CURRENCY,
    isLoading: profile.isLoading,
    isError: profile.isError,
  };
}
