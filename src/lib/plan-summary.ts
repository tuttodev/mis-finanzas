import type { MonthlyPlan, MonthlyPlanSummary, PlanItem } from '@/types/finance';

export function getGroupPlannedAmount(items: PlanItem[], groupId: string): number {
  return items
    .filter((item) => item.kind === 'expense' && item.parentItemId === groupId)
    .reduce((sum, item) => sum + item.plannedAmount, 0);
}

export function summarizePlan(plan: MonthlyPlan, items: PlanItem[]): MonthlyPlanSummary {
  const incomeGross = items
    .filter((item) => item.kind === 'income')
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const deductionsTotal = items
    .filter((item) => item.kind === 'deduction')
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const incomeTotal = incomeGross - deductionsTotal;
  const groupIds = new Set(items.filter((item) => item.kind === 'group').map((item) => item.id));
  const ungroupedTotal = items
    .filter((item) => item.kind === 'expense' && (!item.parentItemId || !groupIds.has(item.parentItemId)))
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const groupTotal = Array.from(groupIds).reduce(
    (sum, groupId) => sum + getGroupPlannedAmount(items, groupId),
    0,
  );
  const expenseTotal = ungroupedTotal + groupTotal;

  return {
    plan,
    items,
    incomeGross,
    deductionsTotal,
    incomeTotal,
    expenseTotal,
    leftover: incomeTotal - expenseTotal,
  };
}
