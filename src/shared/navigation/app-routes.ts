import { AppRoute, SearchParam } from './app-route.enum';

type SearchParams = Partial<Record<SearchParam, string | null | undefined>>;

/** Appends the defined search params to a route. */
export function withSearchParams(route: string, params: SearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return query ? `${route}?${query}` : route;
}

/** Builders for pages that take an ID in the path. */
export const appRoutes = {
  account: (accountId: string) => `/app/account/${accountId}`,
  budget: (budgetId: string) => `/app/budget/${budgetId}`,
  budgetCycle: (cycleId: string) => `/app/budget-cycle/${cycleId}`,
  editTransaction: (transactionId: string) => `/app/transaction/${transactionId}/edit`,
  refundTransaction: (transactionId: string) => `/app/transaction/${transactionId}/refund`,
  plan: (monthKey: string) => withSearchParams(AppRoute.Plan, { [SearchParam.Month]: monthKey }),
};
