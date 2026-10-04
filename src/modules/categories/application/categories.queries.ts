import { queryOptions } from '@tanstack/react-query';
import { QueryKey } from '@/shared/query/query-key.enum';
import { listExpenseCategories } from './categories.use-cases';

export const categoryQueries = {
  list: () => queryOptions({
    queryKey: [QueryKey.ExpenseCategories],
    queryFn: listExpenseCategories,
  }),
};
