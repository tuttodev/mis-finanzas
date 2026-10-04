import { queryOptions } from '@tanstack/react-query';
import type { Currency } from '@/shared/domain/currency.enum';
import { QueryKey } from '@/shared/query/query-key.enum';
import {
  getMonthlyPlan,
  getPlanCurrency,
  getPlanItem,
  getPreviousPlanSummary,
  listPayrollDocuments,
  listPlanSections,
} from './planning.use-cases';

export const planningQueries = {
  month: (monthKey: string, currency: Currency) => queryOptions({
    queryKey: [QueryKey.Plan, monthKey, currency],
    queryFn: () => getMonthlyPlan(monthKey, currency),
  }),
  previous: (monthKey: string, currency: Currency) => queryOptions({
    queryKey: [QueryKey.PlanPrevious, monthKey, currency],
    queryFn: () => getPreviousPlanSummary(monthKey, currency),
  }),
  item: (itemId: string) => queryOptions({
    queryKey: [QueryKey.PlanItem, itemId],
    queryFn: () => getPlanItem(itemId),
  }),
  currency: (planId: string) => queryOptions({
    queryKey: [QueryKey.PlanCurrency, planId],
    queryFn: () => getPlanCurrency(planId),
  }),
  sections: (planId: string) => queryOptions({
    queryKey: [QueryKey.PlanSections, planId],
    queryFn: () => listPlanSections(planId),
  }),
  payrollDocuments: (planId: string) => queryOptions({
    queryKey: [QueryKey.PayrollDocuments, planId],
    queryFn: () => listPayrollDocuments(planId),
  }),
};
