import { PlanItemType } from './plan-item-type.enum';
import type { MonthlyPlan, MonthlyPlanSummary, PlanItem, PlanSection } from './plan.types';

export function getGroupPlannedAmount(items: PlanItem[], groupId: string): number {
  return items
    .filter((item) => item.kind === PlanItemType.Expense && item.parentItemId === groupId)
    .reduce((sum, item) => sum + item.plannedAmount, 0);
}

export function summarizePlan(
  plan: MonthlyPlan,
  items: PlanItem[],
  sections: PlanSection[],
): MonthlyPlanSummary {
  const incomeGross = items
    .filter((item) => item.kind === PlanItemType.Income)
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const deductionsTotal = items
    .filter((item) => item.kind === PlanItemType.Deduction)
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const incomeTotal = incomeGross - deductionsTotal;
  const groupIds = new Set(items.filter((item) => item.kind === PlanItemType.Group).map((item) => item.id));
  const expenses = items.filter((item) => item.kind === PlanItemType.Expense);
  const ungroupedTotal = expenses
    .filter((item) => !item.parentItemId || !groupIds.has(item.parentItemId))
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const groupTotal = Array.from(groupIds).reduce(
    (sum, groupId) => sum + getGroupPlannedAmount(items, groupId),
    0,
  );
  const expenseTotal = ungroupedTotal + groupTotal;

  const sectionTotals: Record<string, number> = Object.fromEntries(sections.map((section) => [section.id, 0]));
  const groupById = new Map(items.filter((item) => item.kind === PlanItemType.Group).map((item) => [item.id, item]));
  let unassignedTotal = 0;
  for (const item of expenses) {
    const sectionId = item.parentItemId
      ? groupById.get(item.parentItemId)?.sectionId ?? item.sectionId
      : item.sectionId;
    if (sectionId && sectionId in sectionTotals) {
      sectionTotals[sectionId] += item.plannedAmount;
    } else {
      unassignedTotal += item.plannedAmount;
    }
  }

  return {
    plan,
    items,
    sections,
    sectionTotals,
    unassignedTotal,
    incomeGross,
    deductionsTotal,
    incomeTotal,
    expenseTotal,
    leftover: incomeTotal - expenseTotal,
  };
}
