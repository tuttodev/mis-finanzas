import { queryOptions } from '@tanstack/react-query';
import { QueryKey } from '@/shared/query/query-key.enum';
import { listAccounts } from './accounts.use-cases';

export const accountQueries = {
  list: () => queryOptions({
    queryKey: [QueryKey.Accounts],
    queryFn: listAccounts,
  }),
};
