import { supabase } from '@/lib/supabase';
import { roundCurrencyAmount } from '@/lib/formatters';
import type {
  Account,
  AccountDTO,
  AccountType,
  Budget,
  BudgetCycle,
  BudgetCycleDTO,
  BudgetDetail,
  BudgetDTO,
  BudgetMovement,
  BudgetProgress,
  BudgetSnapshot,
  BudgetSnapshotDetail,
  CategorySpending,
  CreateAccountInput,
  CreateBudgetInput,
  CreateExpenseCategoryInput,
  CreatePlanItemInput,
  CreateRefundInput,
  CreateTransactionInput,
  CreateTransferInput,
  DailySpend,
  DashboardData,
  ExpenseCategory,
  ExpenseCategoryDTO,
  EditableTransaction,
  InsertAccountDTO,
  InsertMonthlyPlanDTO,
  InsertPlanItemDTO,
  MonthlyCashflow,
  MonthlyPlan,
  MonthlyPlanDTO,
  MonthlyPlanSummary,
  PlanItem,
  PlanItemDTO,
  TransactionWithAccount,
  InsertBudgetCycleDTO,
  InsertBudgetDTO,
  InsertExpenseCategoryDTO,
  InsertTransactionDTO,
  ResetBudgetCycleDTO,
  Transaction,
  TransactionDTO,
  UpdatePlanItemDTO,
  UpdatePlanItemInput,
  UpdateRefundInput,
  UpdateTransactionDTO,
  UpdateTransactionInput,
  UpdateBudgetDTO,
} from '@/types/finance';

type AccountBalanceDTO = {
  account_id: string;
  balance: number;
};

function ensure<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No se encontró información');
  return data;
}

function mapAccountType(type: string): AccountType {
  switch (type) {
    case 'savings':
      return 'Ahorros';
    case 'credit':
      return 'Crédito';
    default:
      return 'Efectivo';
  }
}

function mapAccountTypeToDatabase(type: AccountType): InsertAccountDTO['type'] {
  switch (type) {
    case 'Ahorros':
      return 'savings';
    case 'Crédito':
      return 'credit';
    default:
      return 'cash';
  }
}

function mapAccount(dto: AccountDTO, currentBalance = 0): Account {
  return {
    id: dto.id,
    name: dto.name,
    type: mapAccountType(dto.type),
    currentBalance,
  };
}

function mapBudget(dto: BudgetDTO): Budget {
  return {
    id: dto.id,
    name: dto.name,
    limitAmount: dto.limit_amount,
    isActive: dto.is_active,
  };
}

function mapBudgetCycle(dto: BudgetCycleDTO): BudgetCycle {
  return {
    id: dto.id,
    budgetId: dto.budget_id,
    startedAt: dto.started_at,
    endedAt: dto.ended_at ?? null,
    snapshotLimitAmount: dto.snapshot_limit_amount ?? null,
    snapshotSpentAmount: dto.snapshot_spent_amount ?? null,
  };
}

function mapSnapshot(dto: BudgetCycleDTO): BudgetSnapshot | null {
  if (
    !dto.ended_at ||
    dto.snapshot_limit_amount == null ||
    dto.snapshot_spent_amount == null
  ) {
    return null;
  }

  const percentage = dto.snapshot_limit_amount > 0
    ? (dto.snapshot_spent_amount / dto.snapshot_limit_amount) * 100
    : 0;

  return {
    id: dto.id,
    budgetId: dto.budget_id,
    startedAt: dto.started_at,
    endedAt: dto.ended_at,
    limitAmount: dto.snapshot_limit_amount,
    spentAmount: dto.snapshot_spent_amount,
    percentage,
  };
}

function mapExpenseCategory(
  dto: ExpenseCategoryDTO,
  usedCategoryIds: Set<string> = new Set(),
): ExpenseCategory {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    transactionType: dto.transaction_type,
    isSystem: dto.is_system,
    hasTransactions: usedCategoryIds.has(dto.id),
  };
}

function mapTransaction(
  dto: TransactionDTO,
  categories: Map<string, ExpenseCategory> = new Map(),
): Transaction {
  const categoryId = dto.category_id ?? null;
  const category = categoryId ? categories.get(categoryId) : null;

  return {
    id: dto.id,
    accountId: dto.account_id,
    categoryId,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    date: dto.date,
    description: dto.description,
    amount: dto.amount,
    transferId: dto.transfer_id ?? null,
    kind: dto.kind ?? 'regular',
    relatedTransactionId: dto.related_transaction_id ?? null,
  };
}

function mapBudgetProgress(budget: Budget, cycle: BudgetCycle, spentAmount: number): BudgetProgress {
  const progress = budget.limitAmount > 0 ? spentAmount / budget.limitAmount : 0;

  return {
    budget,
    currentCycle: cycle,
    spentAmount,
    remainingAmount: budget.limitAmount - spentAmount,
    progress,
    percentage: progress * 100,
  };
}

async function fetchAccountsMap() {
  const { data, error } = await supabase.from('accounts').select('*');
  const accounts = ensure(data as AccountDTO[] | null, error);

  return new Map(accounts.map((account) => [account.id, account.name]));
}

async function fetchCategoriesMap() {
  const categories = await fetchExpenseCategories();
  return new Map(categories.map((category) => [category.id, category]));
}

async function fetchOpenBudgetCycle(budgetId: string) {
  const { data, error } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('budget_id', budgetId)
    .order('started_at', { ascending: false });

  const cycles = ensure(data as BudgetCycleDTO[] | null, error);
  return cycles.find((cycle) => cycle.ended_at == null) ?? null;
}

async function fetchSpentAmount(cycleId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, kind')
    .eq('budget_cycle_id', cycleId);

  const rows = ensure(data as Array<{ amount: number; kind?: string }> | null, error);
  return rows.reduce((total, row) => {
    if (row.amount < 0) return total + Math.abs(row.amount);
    if (row.kind === 'refund') return total - row.amount;
    return total;
  }, 0);
}

export async function fetchAccountsOverview(): Promise<Account[]> {
  const [accountsResult, balancesResult] = await Promise.all([
    supabase.from('accounts').select('*').order('name'),
    supabase.from('account_balances').select('*'),
  ]);

  const accountDtos = ensure(accountsResult.data as AccountDTO[] | null, accountsResult.error);
  const balanceDtos = ensure(balancesResult.data as AccountBalanceDTO[] | null, balancesResult.error);
  const balanceMap = new Map(balanceDtos.map((b) => [b.account_id, b.balance]));

  return accountDtos.map((dto) => mapAccount(dto, balanceMap.get(dto.id) ?? 0));
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 80) throw new Error('El nombre no puede superar 80 caracteres');

  const payload: InsertAccountDTO = {
    name,
    type: mapAccountTypeToDatabase(input.type),
  };

  const { data, error } = await supabase
    .from('accounts')
    .insert(payload)
    .select('*')
    .single();

  return mapAccount(ensure(data as AccountDTO | null, error));
}

export async function fetchAccountTransactions(accountId: string): Promise<Transaction[]> {
  const [transactionsResult, categoryNames] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    fetchCategoriesMap(),
  ]);

  const transactions = ensure(
    transactionsResult.data as TransactionDTO[] | null,
    transactionsResult.error,
  );
  return transactions.map((transaction) => mapTransaction(transaction, categoryNames));
}

export async function createTransaction(input: CreateTransactionInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  const signedAmount = input.type === 'Gasto' ? -normalizedAmount : normalizedAmount;

  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.type === 'Gasto' && !input.categoryId) {
    throw new Error('Selecciona una categoría');
  }

  let budgetCycleId: string | null = null;
  if (input.type === 'Gasto' && input.budgetId) {
    const cycle = await fetchOpenBudgetCycle(input.budgetId);
    budgetCycleId = cycle?.id ?? null;
  }

  const payload: InsertTransactionDTO = {
    account_id: input.account.id,
    budget_cycle_id: budgetCycleId,
    category_id: input.categoryId ?? null,
    date: input.date,
    description: input.description,
    amount: signedAmount,
  };

  const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
  return mapTransaction(ensure(data as TransactionDTO | null, error));
}

export async function fetchRefundedAmount(
  transactionId: string,
  excludeRefundId?: string,
): Promise<number> {
  let query = supabase
    .from('transactions')
    .select('amount')
    .eq('kind', 'refund')
    .eq('related_transaction_id', transactionId);

  if (excludeRefundId) query = query.neq('id', excludeRefundId);

  const { data, error } = await query;
  const rows = ensure(data as Array<{ amount: number }> | null, error);
  return rows.reduce((total, row) => total + row.amount, 0);
}

function validateRefundInput(input: CreateRefundInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  const original = input.originalTransaction;

  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (original.kind !== 'regular' || original.amount >= 0 || !original.budgetCycleId) {
    throw new Error('El movimiento relacionado debe ser un gasto con presupuesto');
  }
  if (original.budgetCycleEndedAt) {
    throw new Error('No se pueden registrar reembolsos en un ciclo cerrado');
  }

  return normalizedAmount;
}

export async function createRefund(input: CreateRefundInput) {
  const normalizedAmount = validateRefundInput(input);
  const payload: InsertTransactionDTO = {
    account_id: input.account.id,
    budget_cycle_id: input.originalTransaction.budgetCycleId,
    category_id: input.originalTransaction.categoryId,
    date: input.date,
    description: input.description,
    amount: normalizedAmount,
    kind: 'refund',
    related_transaction_id: input.originalTransaction.id,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*')
    .single();

  return mapTransaction(ensure(data as TransactionDTO | null, error));
}

export async function updateRefund(
  refundId: string,
  input: UpdateRefundInput,
) {
  const normalizedAmount = validateRefundInput(input);
  const payload: UpdateTransactionDTO = {
    account_id: input.account.id,
    budget_cycle_id: input.originalTransaction.budgetCycleId,
    category_id: input.originalTransaction.categoryId,
    date: input.date,
    description: input.description,
    amount: normalizedAmount,
    kind: 'refund',
    related_transaction_id: input.originalTransaction.id,
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', refundId)
    .select('*')
    .single();

  return mapTransaction(ensure(data as TransactionDTO | null, error));
}

export async function createTransfer(input: CreateTransferInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.fromAccount.id === input.toAccount.id) {
    throw new Error('Selecciona cuentas diferentes');
  }

  const transferId = crypto.randomUUID();
  const payload: InsertTransactionDTO[] = [
    {
      account_id: input.fromAccount.id,
      date: input.date,
      description: input.description,
      amount: -normalizedAmount,
      transfer_id: transferId,
    },
    {
      account_id: input.toAccount.id,
      date: input.date,
      description: input.description,
      amount: normalizedAmount,
      transfer_id: transferId,
    },
  ];

  const { error } = await supabase.from('transactions').insert(payload);
  if (error) throw new Error(error.message);
}

export async function fetchTransaction(transactionId: string): Promise<EditableTransaction> {
  const [transactionResult, categoryNames] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', transactionId).single(),
    fetchCategoriesMap(),
  ]);
  const transactionDto = ensure(
    transactionResult.data as TransactionDTO | null,
    transactionResult.error,
  );
  const budgetCycleId = transactionDto.budget_cycle_id ?? null;
  let budgetId: string | null = null;
  let budgetCycleEndedAt: string | null = null;

  if (budgetCycleId) {
    const { data, error } = await supabase
      .from('budget_cycles')
      .select('budget_id, ended_at')
      .eq('id', budgetCycleId)
      .single();
    const cycle = ensure(
      data as { budget_id: string; ended_at: string | null } | null,
      error,
    );
    budgetId = cycle.budget_id;
    budgetCycleEndedAt = cycle.ended_at;
  }

  return {
    ...mapTransaction(transactionDto, categoryNames),
    budgetCycleId,
    budgetId,
    budgetCycleEndedAt,
  };
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput,
) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  const signedAmount = input.type === 'Gasto' ? -normalizedAmount : normalizedAmount;

  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.type === 'Gasto' && !input.categoryId) {
    throw new Error('Selecciona una categoría');
  }

  let budgetCycleId: string | null = null;
  if (input.type === 'Gasto' && input.budgetId) {
    const keepsOriginalCycle =
      input.budgetId === input.originalBudgetId && Boolean(input.originalBudgetCycleId);

    if (keepsOriginalCycle) {
      budgetCycleId = input.originalBudgetCycleId ?? null;
    } else {
      const cycle = await fetchOpenBudgetCycle(input.budgetId);
      budgetCycleId = cycle?.id ?? null;
    }
  }

  const payload: UpdateTransactionDTO = {
    account_id: input.account.id,
    budget_cycle_id: budgetCycleId,
    category_id: input.categoryId ?? null,
    date: input.date,
    description: input.description,
    amount: signedAmount,
    kind: 'regular',
    related_transaction_id: null,
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', transactionId)
    .select('*')
    .single();

  return mapTransaction(ensure(data as TransactionDTO | null, error));
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const [{ data, error }, { data: txData, error: txError }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase.from('transactions').select('category_id').not('category_id', 'is', null),
  ]);

  const categories = ensure(data as ExpenseCategoryDTO[] | null, error);
  const usedRows = ensure(txData as { category_id: string }[] | null, txError);
  const usedCategoryIds = new Set(usedRows.map((row) => row.category_id));

  return categories.map((category) => mapExpenseCategory(category, usedCategoryIds));
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 60) throw new Error('El nombre no puede superar 60 caracteres');

  const payload: InsertExpenseCategoryDTO = {
    name,
    transaction_type: input.transactionType,
  };
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error?.code === '23505') {
    throw new Error('Ya existe una categoría con ese nombre');
  }

  return mapExpenseCategory(ensure(data as ExpenseCategoryDTO | null, error));
}

export async function deleteExpenseCategory(categoryId: string) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);

  if (error?.code === '23503') {
    throw new Error('No puedes eliminar una categoría con transacciones asociadas');
  }
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(transactionId: string) {
  const { data, error: fetchError } = await supabase
    .from('transactions')
    .select('transfer_id')
    .eq('id', transactionId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const transferId = (data as { transfer_id: string | null }).transfer_id;
  const deleteQuery = transferId
    ? supabase.from('transactions').delete().eq('transfer_id', transferId)
    : supabase.from('transactions').delete().eq('id', transactionId);

  const { error } = await deleteQuery;
  if (error?.code === '23503') {
    throw new Error('Elimina primero los reembolsos asociados a este gasto');
  }
  if (error) throw new Error(error.message);
}

export async function fetchBudgetOptions(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('is_active', true)
    .order('name');

  const budgets = ensure(data as BudgetDTO[] | null, error);
  return budgets.map(mapBudget);
}

export async function fetchBudgetProgressList(): Promise<BudgetProgress[]> {
  const budgets = await fetchBudgetOptions();

  const progress = await Promise.all(
    budgets.map(async (budget) => {
      const cycleDto = await fetchOpenBudgetCycle(budget.id);
      if (!cycleDto) return null;

      const spentAmount = await fetchSpentAmount(cycleDto.id);
      return mapBudgetProgress(budget, mapBudgetCycle(cycleDto), spentAmount);
    }),
  );

  return progress.filter(Boolean) as BudgetProgress[];
}

export async function fetchBudgetDetail(budgetId: string): Promise<BudgetDetail> {
  const { data, error } = await supabase.from('budgets').select('*').eq('id', budgetId).single();
  const budgetDto = ensure(data as BudgetDTO | null, error);
  const openCycleDto = await fetchOpenBudgetCycle(budgetId);

  if (!openCycleDto) {
    throw new Error('No se encontró un ciclo activo para el presupuesto');
  }

  const [spentAmount, movements, closedCycles] = await Promise.all([
    fetchSpentAmount(openCycleDto.id),
    fetchBudgetMovements(openCycleDto.id),
    fetchClosedCycles(budgetId),
  ]);

  return {
    progress: mapBudgetProgress(mapBudget(budgetDto), mapBudgetCycle(openCycleDto), spentAmount),
    movements,
    snapshots: closedCycles.map(mapSnapshot).filter(Boolean) as BudgetSnapshot[],
  };
}

export async function fetchBudgetSnapshotDetail(cycleId: string): Promise<BudgetSnapshotDetail> {
  const { data, error } = await supabase
    .from('budget_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  const cycleDto = ensure(data as BudgetCycleDTO | null, error);
  const snapshot = mapSnapshot(cycleDto);

  if (!snapshot) {
    throw new Error('No se encontró un snapshot válido para este ciclo');
  }

  const movements = await fetchBudgetMovements(cycleId);
  return { snapshot, movements };
}

export async function fetchBudgetMovements(cycleId: string): Promise<BudgetMovement[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('budget_cycle_id', cycleId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  const transactions = ensure(data as TransactionDTO[] | null, error);
  const [accountsMap, categories] = await Promise.all([
    fetchAccountsMap(),
    fetchCategoriesMap(),
  ]);

  return transactions
    .filter((transaction) => transaction.amount < 0 || transaction.kind === 'refund')
    .map((transaction) => ({
      id: transaction.id,
      accountId: transaction.account_id,
      accountName: accountsMap.get(transaction.account_id) ?? 'Cuenta desconocida',
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      categoryName: transaction.category_id
        ? categories.get(transaction.category_id)?.name ?? null
        : null,
      kind: transaction.kind ?? 'regular',
    }));
}

async function fetchClosedCycles(budgetId: string) {
  const { data, error } = await supabase.from('budget_cycles').select('*').eq('budget_id', budgetId);
  const cycles = ensure(data as BudgetCycleDTO[] | null, error);

  return cycles
    .filter((cycle) => cycle.ended_at != null)
    .sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)));
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const monthLabelFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short' });

export async function fetchDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const monthsBack = 5;
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

  const [accounts, categories, txResult] = await Promise.all([
    fetchAccountsOverview(),
    fetchCategoriesMap(),
    supabase
      .from('transactions')
      .select('*')
      .gte('date', toIsoDate(rangeStart))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const transactions = ensure(txResult.data as TransactionDTO[] | null, txResult.error);
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);

  const cashflow: MonthlyCashflow[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = monthsBack; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = toIsoDate(month).slice(0, 7);
    monthIndex.set(key, cashflow.length);
    cashflow.push({
      label: monthLabelFormatter.format(month).replace('.', ''),
      income: 0,
      expense: 0,
    });
  }

  const dailySpend: DailySpend[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = toIsoDate(day);
    dayIndex.set(key, dailySpend.length);
    dailySpend.push({ date: key, value: 0 });
  }

  const currentMonthKey = toIsoDate(now).slice(0, 7);
  const categoryTotals = new Map<string, number>();

  for (const tx of transactions) {
    // Transfers move money between own accounts; they are not income nor expense
    if (tx.transfer_id) continue;

    const isRefund = tx.kind === 'refund';
    const monthIdx = monthIndex.get(tx.date.slice(0, 7));
    if (monthIdx !== undefined) {
      if (isRefund) cashflow[monthIdx].expense -= tx.amount;
      else if (tx.amount >= 0) cashflow[monthIdx].income += tx.amount;
      else cashflow[monthIdx].expense += Math.abs(tx.amount);
    }

    if (tx.amount < 0 || isRefund) {
      const dayIdx = dayIndex.get(tx.date.slice(0, 10));
      if (dayIdx !== undefined) {
        dailySpend[dayIdx].value += isRefund ? -tx.amount : Math.abs(tx.amount);
      }

      if (tx.date.startsWith(currentMonthKey)) {
        const categoryName = tx.category_id
          ? categories.get(tx.category_id)?.name ?? 'Sin categoría'
          : 'Sin categoría';
        categoryTotals.set(
          categoryName,
          (categoryTotals.get(categoryName) ?? 0)
            + (isRefund ? -tx.amount : Math.abs(tx.amount)),
        );
      }
    }
  }

  cashflow.forEach((point) => {
    point.expense = Math.max(0, point.expense);
  });
  dailySpend.forEach((point) => {
    point.value = Math.max(0, point.value);
  });

  const currentMonth = cashflow[cashflow.length - 1];
  const categorySpending: CategorySpending[] = Array.from(categoryTotals, ([label, value]) => ({
    label,
    value,
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const recentTransactions: TransactionWithAccount[] = transactions.slice(0, 8).map((dto) => ({
    ...mapTransaction(dto, categories),
    accountName: accountNames.get(dto.account_id) ?? 'Cuenta desconocida',
  }));

  return {
    totalBalance,
    monthIncome: currentMonth.income,
    monthExpense: currentMonth.expense,
    cashflow,
    dailySpend,
    categorySpending,
    recentTransactions,
  };
}

function dateInputToIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

export async function createBudget(input: CreateBudgetInput) {
  const payload: InsertBudgetDTO = {
    name: input.name,
    limit_amount: roundCurrencyAmount(input.limitAmount),
  };

  const { data, error } = await supabase.from('budgets').insert(payload).select('*').single();
  const budgetDto = ensure(data as BudgetDTO | null, error);

  const cyclePayload: InsertBudgetCycleDTO = {
    budget_id: budgetDto.id,
    started_at: input.startedAt ? dateInputToIso(input.startedAt) : new Date().toISOString(),
  };

  const { error: cycleError } = await supabase.from('budget_cycles').insert(cyclePayload);
  if (cycleError) throw new Error(cycleError.message);

  return mapBudget(budgetDto);
}

export async function updateBudget(budgetId: string, input: CreateBudgetInput) {
  const payload: UpdateBudgetDTO = {
    name: input.name,
    limit_amount: roundCurrencyAmount(input.limitAmount),
  };

  const { error } = await supabase.from('budgets').update(payload).eq('id', budgetId);
  if (error) throw new Error(error.message);
}

export async function softDeleteBudget(budgetId: string) {
  const { error } = await supabase.from('budgets').update({ is_active: false }).eq('id', budgetId);
  if (error) throw new Error(error.message);
}

export async function resetBudget(progress: BudgetProgress, restartDate?: string) {
  const endedAt = new Date().toISOString();

  const resetPayload: ResetBudgetCycleDTO = {
    ended_at: endedAt,
    snapshot_limit_amount: roundCurrencyAmount(progress.budget.limitAmount),
    snapshot_spent_amount: roundCurrencyAmount(progress.spentAmount),
  };

  const { error } = await supabase
    .from('budget_cycles')
    .update(resetPayload)
    .eq('id', progress.currentCycle.id);

  if (error) throw new Error(error.message);

  const newCyclePayload: InsertBudgetCycleDTO = {
    budget_id: progress.budget.id,
    started_at: restartDate ? dateInputToIso(restartDate) : endedAt,
  };

  const { error: insertError } = await supabase.from('budget_cycles').insert(newCyclePayload);
  if (insertError) throw new Error(insertError.message);
}

function mapMonthlyPlan(dto: MonthlyPlanDTO): MonthlyPlan {
  return {
    id: dto.id,
    month: dto.month,
    payday: dto.payday ?? null,
  };
}

function mapPlanItem(dto: PlanItemDTO): PlanItem {
  return {
    id: dto.id,
    planId: dto.plan_id,
    name: dto.name,
    kind: dto.kind,
    plannedAmount: dto.planned_amount,
    note: dto.note,
    isPaid: dto.is_paid,
    budgetId: dto.budget_id,
    categoryId: dto.category_id,
    sortOrder: dto.sort_order,
  };
}

function summarizePlan(plan: MonthlyPlan, items: PlanItem[]): MonthlyPlanSummary {
  const incomeTotal = items
    .filter((item) => item.kind === 'income')
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const expenseTotal = items
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.plannedAmount, 0);

  return { plan, items, incomeTotal, expenseTotal, leftover: incomeTotal - expenseTotal };
}

async function fetchPlanItems(planId: string): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order')
    .order('created_at');

  return ensure(data as PlanItemDTO[] | null, error).map(mapPlanItem);
}

export async function fetchMonthlyPlan(monthKey: string): Promise<MonthlyPlanSummary | null> {
  const { data, error } = await supabase
    .from('monthly_plans')
    .select('*')
    .eq('month', monthKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const plan = mapMonthlyPlan(data as MonthlyPlanDTO);
  const items = await fetchPlanItems(plan.id);
  return summarizePlan(plan, items);
}

export async function fetchPreviousPlanSummary(
  monthKey: string,
): Promise<MonthlyPlanSummary | null> {
  const { data, error } = await supabase
    .from('monthly_plans')
    .select('*')
    .lt('month', monthKey)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const plan = mapMonthlyPlan(data as MonthlyPlanDTO);
  const items = await fetchPlanItems(plan.id);
  return summarizePlan(plan, items);
}

export async function createBlankPlan(monthKey: string): Promise<MonthlyPlanSummary> {
  const payload: InsertMonthlyPlanDTO = { month: monthKey };
  const { data, error } = await supabase
    .from('monthly_plans')
    .insert(payload)
    .select('*')
    .single();

  const plan = mapMonthlyPlan(ensure(data as MonthlyPlanDTO | null, error));
  return summarizePlan(plan, []);
}

export async function duplicatePreviousPlan(monthKey: string): Promise<MonthlyPlanSummary> {
  const previous = await fetchPreviousPlanSummary(monthKey);
  if (!previous) throw new Error('No hay un plan anterior para duplicar');

  const payload: InsertMonthlyPlanDTO = { month: monthKey };
  const { data, error } = await supabase
    .from('monthly_plans')
    .insert(payload)
    .select('*')
    .single();

  const plan = mapMonthlyPlan(ensure(data as MonthlyPlanDTO | null, error));

  if (previous.items.length) {
    const itemsPayload: InsertPlanItemDTO[] = previous.items.map((item) => ({
      plan_id: plan.id,
      name: item.name,
      kind: item.kind,
      planned_amount: item.plannedAmount,
      note: item.note,
      sort_order: item.sortOrder,
    }));

    const { error: itemsError } = await supabase.from('plan_items').insert(itemsPayload);
    if (itemsError) throw new Error(itemsError.message);
  }

  const items = await fetchPlanItems(plan.id);
  return summarizePlan(plan, items);
}

export async function fetchPlanItem(itemId: string): Promise<PlanItem> {
  const { data, error } = await supabase.from('plan_items').select('*').eq('id', itemId).single();
  return mapPlanItem(ensure(data as PlanItemDTO | null, error));
}

export async function createPlanItem(input: CreatePlanItemInput): Promise<PlanItem> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const payload: InsertPlanItemDTO = {
    plan_id: input.planId,
    name,
    kind: input.kind,
    planned_amount: roundCurrencyAmount(input.plannedAmount),
    note: input.note?.trim() || null,
  };

  const { data, error } = await supabase.from('plan_items').insert(payload).select('*').single();
  return mapPlanItem(ensure(data as PlanItemDTO | null, error));
}

export async function updatePlanItem(itemId: string, input: UpdatePlanItemInput) {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const payload: UpdatePlanItemDTO = {
    name,
    planned_amount: roundCurrencyAmount(input.plannedAmount),
    note: input.note?.trim() || null,
  };

  const { error } = await supabase.from('plan_items').update(payload).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function reorderPlanItems(
  updates: { id: string; sortOrder: number }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map(({ id, sortOrder }) =>
      supabase.from('plan_items').update({ sort_order: sortOrder }).eq('id', id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function deletePlanItem(itemId: string) {
  const { error } = await supabase.from('plan_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function setPlanItemPaid(itemId: string, isPaid: boolean) {
  const { error } = await supabase.from('plan_items').update({ is_paid: isPaid }).eq('id', itemId);
  if (error) throw new Error(error.message);
}
