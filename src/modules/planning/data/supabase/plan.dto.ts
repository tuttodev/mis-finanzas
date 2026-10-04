import type { Currency } from '@/shared/domain/currency.enum';
import type { PlanItemKind, PlanItemType } from '../../domain/plan-item-type.enum';

export type PlanSectionDTO = {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
};

export type MonthlyPlanDTO = {
  id: string;
  month: string;
  currency: Currency;
  payday: string | null;
  created_at?: string | null;
};

export type PlanItemDTO = {
  id: string;
  plan_id: string;
  name: string;
  kind: PlanItemType;
  planned_amount: number;
  parent_item_id: string | null;
  section_id: string | null;
  note: string | null;
  is_paid: boolean;
  budget_id: string | null;
  category_id: string | null;
  sort_order: number;
  created_at?: string | null;
};

export type InsertMonthlyPlanDTO = {
  month: string;
  currency: Currency;
  payday?: string | null;
};

export type InsertPlanItemDTO = {
  plan_id: string;
  name: string;
  kind: PlanItemType;
  planned_amount: number;
  parent_item_id?: string | null;
  section_id?: string | null;
  note?: string | null;
  budget_id?: string | null;
  category_id?: string | null;
  sort_order?: number;
};

export type UpdatePlanItemDTO = {
  name: string;
  kind?: PlanItemKind;
  planned_amount: number;
  parent_item_id?: string | null;
  section_id?: string | null;
  note: string | null;
  budget_id?: string | null;
  category_id?: string | null;
};

export type PayrollDocumentDTO = {
  id: string;
  plan_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};
