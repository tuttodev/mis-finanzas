export type AccountType = 'Ahorros' | 'Crédito' | 'Efectivo';
export type TransactionType = 'Ingreso' | 'Gasto';

export type AccountDTO = {
  id: string;
  name: string;
  type: string;
  created_at?: string | null;
};

export type TransactionDTO = {
  id: string;
  account_id: string;
  budget_cycle_id?: string | null;
  date: string;
  description: string;
  amount: number;
  created_at?: string | null;
};

export type InsertTransactionDTO = {
  account_id: string;
  budget_cycle_id?: string | null;
  date: string;
  description: string;
  amount: number;
};

export type BudgetDTO = {
  id: string;
  name: string;
  limit_amount: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InsertBudgetDTO = {
  name: string;
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

export type ResetBudgetCycleDTO = {
  ended_at: string;
  snapshot_limit_amount: number;
  snapshot_spent_amount: number;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
};

export type Transaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
};

export type Budget = {
  id: string;
  name: string;
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
};

export type BudgetDetail = {
  progress: BudgetProgress;
  movements: BudgetMovement[];
  snapshots: BudgetSnapshot[];
};

export type BudgetSnapshotDetail = {
  snapshot: BudgetSnapshot;
  movements: BudgetMovement[];
};

export type TransactionWithAccount = Transaction & {
  accountName: string;
};

export type MonthlyCashflow = {
  label: string;
  income: number;
  expense: number;
};

export type DailySpend = {
  date: string;
  value: number;
};

export type DashboardData = {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  cashflow: MonthlyCashflow[];
  dailySpend: DailySpend[];
  recentTransactions: TransactionWithAccount[];
};

export type CreateTransactionInput = {
  account: Account;
  amount: number;
  description: string;
  type: TransactionType;
  date: string;
  budgetId?: string | null;
};

export type CreateBudgetInput = {
  name: string;
  limitAmount: number;
  startedAt?: string;
};
