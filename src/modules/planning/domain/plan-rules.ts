import { roundCurrencyAmount } from '@/shared/lib/formatters';
import { PlanItemType } from './plan-item-type.enum';
import type { CreatePlanItemInput, PlanItem, PlanItemRecord, PlanSection } from './plan.types';

/** Sections created with every new plan. */
export const DEFAULT_PLAN_SECTIONS: Array<Pick<PlanSection, 'name' | 'sortOrder'>> = [
  { name: 'Obligatorios', sortOrder: 10 },
  { name: 'Opcionales', sortOrder: 20 },
];

/** Gap between consecutive sort orders so items can be inserted between them. */
export const PLAN_SORT_STEP = 10;

/** Identity used to avoid importing the same concept twice into a plan. */
export function planItemKey(item: Pick<PlanItem, 'kind' | 'name'>) {
  return `${item.kind}::${normalizeName(item.name)}`;
}

export function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function requireName(name: string, message = 'El nombre es obligatorio') {
  const trimmed = name.trim();
  if (!trimmed) throw new Error(message);
  return trimmed;
}

/** Only expenses belong to sections, carry categories and tags. */
export function toPlanItemRecord(input: CreatePlanItemInput, sortOrder?: number): PlanItemRecord {
  const isExpense = input.kind === PlanItemType.Expense;
  return {
    planId: input.planId,
    name: input.name.trim(),
    kind: input.kind,
    plannedAmount: roundCurrencyAmount(input.plannedAmount),
    sectionId: isExpense ? input.sectionId ?? null : null,
    note: input.note?.trim() || null,
    budgetId: input.budgetId ?? null,
    categoryId: isExpense ? input.categoryId ?? null : null,
    sortOrder,
  };
}

/** Copy of an item for another plan, remapping its group and section to the copied ones. */
export function toCopiedPlanItemRecord(
  item: PlanItem,
  planId: string,
  groupIds: Map<string, string>,
  sectionIds: Map<string, string>,
): PlanItemRecord {
  if (item.kind === PlanItemType.Group) {
    return {
      planId,
      name: item.name,
      kind: PlanItemType.Group,
      plannedAmount: 0,
      sectionId: item.sectionId ? sectionIds.get(item.sectionId) ?? null : null,
      note: item.note,
      sortOrder: item.sortOrder,
    };
  }

  return {
    planId,
    name: item.name,
    kind: item.kind,
    plannedAmount: item.plannedAmount,
    parentItemId: item.parentItemId ? groupIds.get(item.parentItemId) ?? null : null,
    sectionId: item.parentItemId ? null : item.sectionId ? sectionIds.get(item.sectionId) ?? null : null,
    note: item.note,
    budgetId: item.budgetId,
    categoryId: item.categoryId,
    sortOrder: item.sortOrder,
  };
}
