import { queryOptions } from '@tanstack/react-query';
import type { Currency } from '@/shared/domain/currency.enum';
import { QueryKey } from '@/shared/query/query-key.enum';
import { getDashboard } from './dashboard.use-cases';

export const dashboardQueries = {
  summary: (currency: Currency) => queryOptions({
    queryKey: [QueryKey.Dashboard, currency],
    queryFn: () => getDashboard(currency),
  }),
};
