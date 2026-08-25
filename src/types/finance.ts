export type AccountType = 'Ahorros' | 'Crédito' | 'Efectivo';
export type TransactionType = 'Ingreso' | 'Gasto';
export type TransactionKind = 'regular' | 'refund';

export type TagDTO = {
  id: string;
  name: string;
  is_system: boolean;
  created_at?: string | null;
};
export type Tag = {
  id: string;
  name: string;
  isSystem: boolean;
  usageCount?: number;
};

export type ExpenseCategoryDTO = {
  id: string;
  slug: string;
  name: string;
  transaction_type: 'expense' | 'income';
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at?: string | null;
};

export type AccountDTO = {
  id: string;
  name: string;
  type: string;
  created_at?: string | null;
};

export type InsertAccountDTO = {
  name: string;
  type: 'savings' | 'credit' | 'cash';
};

export type InsertExpenseCategoryDTO = {
  name: string;
  transaction_type: 'expense' | 'income';
};

export type TransactionDTO = {
  id: string;
  account_id: string;
  budget_cycle_id?: string | null;
  category_id?: string | null;
  date: string;
  description: string;
  amount: number;
  transfer_id?: string | null;
  kind?: TransactionKind;
  related_transaction_id?: string | null;
  is_planned: boolean | null;
  plan_item_id?: string | null;
  created_at?: string | null;
};

export type TransactionTagDTO = {
  transaction_id: string;
  tag_id: string;
};

export type InsertTransactionDTO = {
  account_id: string;
  budget_cycle_id?: string | null;
  category_id?: string | null;
  date: string;
  description: string;
  amount: number;
  transfer_id?: string | null;
  kind?: TransactionKind;
  related_transaction_id?: string | null;
  is_planned?: boolean | null;
  plan_item_id?: string | null;
};

export type UpdateTransactionDTO = InsertTransactionDTO;

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
  debtAmount: number;
};

export type ExpenseCategory = {
  id: string;
  slug: string;
  name: string;
  transactionType: 'expense' | 'income';
  isSystem: boolean;
  hasTransactions: boolean;
};

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  date: string;
  description: string;
  amount: number;
  transferId: string | null;
  kind: TransactionKind;
  relatedTransactionId: string | null;
  isPlanned: boolean | null;
  tags: Tag[];
};

export type EditableTransaction = Transaction & {
  budgetCycleId: string | null;
  budgetId: string | null;
  budgetCycleEndedAt: string | null;
};

export type TransactionDescriptionSuggestion = {
  description: string;
  categoryId: string | null;
  count: number;
  lastUsedAt: string;
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

export type CategorySpending = {
  label: string;
  value: number;
};

export type DashboardData = {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  cashflow: MonthlyCashflow[];
  dailySpend: DailySpend[];
  categorySpending: CategorySpending[];
  recentTransactions: TransactionWithAccount[];
};

export type CreateTransactionInput = {
  account: Account;
  amount: number;
  description: string;
  type: TransactionType;
  date: string;
  budgetId?: string | null;
  categoryId?: string | null;
  isPlanned: boolean | null;
  tagIds: string[];
  planItemId?: string | null;
};

export type UpdateTransactionInput = CreateTransactionInput & {
  originalBudgetCycleId?: string | null;
  originalBudgetId?: string | null;
};

export type CreateTransferInput = {
  fromAccount: Account;
  toAccount: Account;
  amount: number;
  date: string;
  description: string;
};

export type CreateRefundInput = {
  originalTransaction: EditableTransaction;
  account: Account;
  amount: number;
  date: string;
  description: string;
};

export type UpdateRefundInput = CreateRefundInput;

export type CreateAccountInput = {
  name: string;
  type: AccountType;
};

export type AdjustAccountBalanceInput = {
  account: Account;
  targetBalance: number;
  date: string;
  description?: string;
};

export type CreateExpenseCategoryInput = {
  name: string;
  transactionType: 'expense' | 'income';
};

export type CreateTagInput = {
  name: string;
};

export type CreateBudgetInput = {
  name: string;
  limitAmount: number;
  startedAt?: string;
};

export type PlanItemKind = 'income' | 'expense' | 'deduction';

export type MonthlyPlanDTO = {
  id: string;
  month: string;
  payday: string | null;
  created_at?: string | null;
};

export type PlanItemDTO = {
  id: string;
  plan_id: string;
  name: string;
  kind: PlanItemKind;
  planned_amount: number;
  note: string | null;
  is_paid: boolean;
  budget_id: string | null;
  category_id: string | null;
  sort_order: number;
  created_at?: string | null;
};

export type InsertMonthlyPlanDTO = {
  month: string;
  payday?: string | null;
};

export type InsertPlanItemDTO = {
  plan_id: string;
  name: string;
  kind: PlanItemKind;
  planned_amount: number;
  note: string | null;
  budget_id?: string | null;
  category_id?: string | null;
  sort_order?: number;
};

export type UpdatePlanItemDTO = {
  name: string;
  kind?: PlanItemKind;
  planned_amount: number;
  note: string | null;
  budget_id?: string | null;
  category_id?: string | null;
};

export type MonthlyPlan = {
  id: string;
  month: string;
  payday: string | null;
};

export type PlanItem = {
  id: string;
  planId: string;
  name: string;
  kind: PlanItemKind;
  plannedAmount: number;
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
  note?: string;
  budgetId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

export type UpdatePlanItemInput = {
  name: string;
  kind?: PlanItemKind;
  plannedAmount: number;
  note?: string;
  budgetId?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

export type ParsedColillaItem = {
  id: string;
  name: string;
  amount: number;
  kind: 'income' | 'deduction';
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
