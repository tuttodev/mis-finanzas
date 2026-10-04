import { queryOptions } from '@tanstack/react-query';
import type { Currency } from '@/shared/domain/currency.enum';
import { QueryKey, QueryScope } from '@/shared/query/query-key.enum';
import { getBudgetDetail, getBudgetSnapshotDetail, listBudgetProgress } from './budgets.use-cases';

export const budgetQueries = {
  /** Progress of active budgets, optionally limited to one currency. */
  progress: (currency?: Currency) => queryOptions({
    queryKey: [QueryKey.Budgets, currency ?? QueryScope.All],
    queryFn: () => listBudgetProgress(currency),
  }),
  detail: (budgetId: string) => queryOptions({
    queryKey: [QueryKey.Budget, budgetId],
    queryFn: () => getBudgetDetail(budgetId),
  }),
  snapshot: (cycleId: string) => queryOptions({
    queryKey: [QueryKey.BudgetCycle, cycleId],
    queryFn: () => getBudgetSnapshotDetail(cycleId),
  }),
};
