import { queryOptions } from '@tanstack/react-query';
import { QueryKey } from '@/shared/query/query-key.enum';
import { getUserProfile } from './profile.use-cases';

export const profileQueries = {
  detail: (userId: string) => queryOptions({
    queryKey: [QueryKey.UserProfile, userId],
    queryFn: () => getUserProfile(userId),
  }),
};
