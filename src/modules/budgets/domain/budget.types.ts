import type { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Currency } from '@/shared/domain/currency.enum';

export type Budget = {
  id: string;
  name: string;
  currency: Currency;
  limitAmount: number;
  isActive: boolean;
};

export type BudgetCycle = {
  id: string;
  budgetId: string;
  startedAt: string;
  endedAt?: string | null;
  snapshotLimitAmount?: number | null;
  snapshotSpentAmount?: number | null;
};

export type BudgetSnapshot = {
  id: string;
  budgetId: string;
  startedAt: string;
  endedAt: string;
  limitAmount: number;
  spentAmount: number;
  percentage: number;
};

export type BudgetProgress = {
  budget: Budget;
  currentCycle: BudgetCycle;
  spentAmount: number;
  remainingAmount: number;
  progress: number;
  percentage: number;
};

export type BudgetMovement = {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  description: string;
  amount: number;
  categoryName: string | null;
  kind: TransactionKind;
};

export type BudgetDetail = {
  progress: BudgetProgress;
  movements: BudgetMovement[];
  snapshots: BudgetSnapshot[];
};

export type BudgetSnapshotDetail = {
  snapshot: BudgetSnapshot;
  movements: BudgetMovement[];
  currency: Currency;
};

export type CreateBudgetInput = {
  name: string;
  currency: Currency;
  limitAmount: number;
  startedAt?: string;
};

export type CloseBudgetCycleInput = {
  cycleId: string;
  endedAt: string;
  limitAmount: number;
  spentAmount: number;
};
