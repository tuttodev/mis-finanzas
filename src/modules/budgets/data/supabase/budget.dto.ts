import type { Currency } from '@/shared/domain/currency.enum';

export type BudgetDTO = {
  id: string;
  name: string;
  currency: Currency;
  limit_amount: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InsertBudgetDTO = {
  name: string;
  currency: Currency;
  limit_amount: number;
};

export type UpdateBudgetDTO = {
  name: string;
  limit_amount: number;
};

export type BudgetCycleDTO = {
  id: string;
  budget_id: string;
  started_at: string;
  ended_at?: string | null;
  snapshot_limit_amount?: number | null;
  snapshot_spent_amount?: number | null;
  created_at?: string | null;
};

export type InsertBudgetCycleDTO = {
  budget_id: string;
  started_at: string;
};

export type CloseBudgetCycleDTO = {
  ended_at: string;
  snapshot_limit_amount: number;
  snapshot_spent_amount: number;
};
