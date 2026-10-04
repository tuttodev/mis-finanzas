import type { Currency } from '@/shared/domain/currency.enum';
import type { PayrollItemKind, PlanItemKind, PlanItemType } from './plan-item-type.enum';

export type PlanSection = {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
};

export type MonthlyPlan = {
  id: string;
  month: string;
  currency: Currency;
  payday: string | null;
};

export type PlanItem = {
  id: string;
  planId: string;
  name: string;
  kind: PlanItemType;
  plannedAmount: number;
  parentItemId: string | null;
  sectionId: string | null;
  /** Sum of amounts of all transactions linked to this plan item (absolute value). */
  actualAmount: number | null;
  note: string | null;
  isPaid: boolean;
  budgetId: string | null;
  categoryId: string | null;
  tagIds: string[];
  sortOrder: number;
};

export type MonthlyPlanSummary = {
  plan: MonthlyPlan;
  items: PlanItem[];
  sections: PlanSection[];
  sectionTotals: Record<string, number>;
  unassignedTotal: number;
  incomeGross: number;
  deductionsTotal: number;
  incomeTotal: number;
  expenseTotal: number;
  leftover: number;
};

export type CreatePlanItemInput = {
  planId: string;
  name: string;
  kind: PlanItemKind;
  plannedAmount: number;
  sectionId?: string | null;
  note?: string;
  budgetId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

export type UpdatePlanItemInput = {
  name: string;
  kind?: PlanItemKind;
  plannedAmount: number;
  sectionId?: string | null;
  note?: string;
  budgetId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

/** Persistence-neutral record used to create a plan item. */
export type PlanItemRecord = {
  planId: string;
  name: string;
  kind: PlanItemType;
  plannedAmount: number;
  parentItemId?: string | null;
  sectionId?: string | null;
  note?: string | null;
  budgetId?: string | null;
  categoryId?: string | null;
  sortOrder?: number;
};

/** Fields of a plan item that an update may change; omitted fields keep their value. */
export type PlanItemPatch = {
  name: string;
  kind?: PlanItemKind;
  plannedAmount: number;
  parentItemId?: string | null;
  sectionId?: string | null;
  note: string | null;
  budgetId?: string | null;
  categoryId?: string | null;
};

export type PlanItemPlacement = Pick<PlanItem, 'id' | 'kind' | 'parentItemId' | 'sortOrder'>;

export type ParsedColillaItem = {
  id: string;
  name: string;
  amount: number;
  kind: PayrollItemKind;
  originalText?: string;
  selected?: boolean;
};

export type ParsedColillaSummary = {
  period?: string | null;
  monthKey?: string | null;
  payDate?: string | null;
  companyName?: string | null;
  employeeName?: string | null;
  devengos: ParsedColillaItem[];
  deducciones: ParsedColillaItem[];
  totalDevengado: number;
  totalDeducciones: number;
  netoPagar: number;
  rawText?: string;
};

export type ParseColillaResponse = {
  success: boolean;
  data?: ParsedColillaSummary;
  error?: string;
};

export type PayrollDocument = {
  id: string;
  planId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};
