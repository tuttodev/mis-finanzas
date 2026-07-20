import { supabase } from '@/lib/supabase';
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
  CreateBudgetInput,
  CreateTransactionInput,
  DailySpend,
  DashboardData,
  MonthlyCashflow,
  TransactionWithAccount,
  InsertBudgetCycleDTO,
  InsertBudgetDTO,
  InsertTransactionDTO,
  ResetBudgetCycleDTO,
  Transaction,
  TransactionDTO,
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

function mapTransaction(dto: TransactionDTO): Transaction {
  return {
    id: dto.id,
    accountId: dto.account_id,
    date: dto.date,
    description: dto.description,
    amount: dto.amount,
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
    .select('amount')
    .eq('budget_cycle_id', cycleId);

  const rows = ensure(data as Array<{ amount: number }> | null, error);
  return rows.reduce((total, row) => (row.amount < 0 ? total + Math.abs(row.amount) : total), 0);
}

export async function fetchAccountsOverview(): Promise<Account[]> {
  const [accountsResult, balancesResult] = await Promise.all([
    supabase.from('accounts').select('*').order('name'),
    supabase.from('account_balances').select('*'),
  ]);

  const accountDtos = ensure(accountsResult.data as AccountDTO[] | null, accountsResult.error);
  const balanceDtos = ensure(balancesResult.data as AccountBalanceDTO[] | null, balancesResult.error);
  const balanceMap = new Map(balanceDtos.map((b) => [b.account_id, b.balance]));

  return accountDtos.map((dto) => ({
    id: dto.id,
    name: dto.name,
    type: mapAccountType(dto.type),
    currentBalance: balanceMap.get(dto.id) ?? 0,
  }));
}

export async function fetchAccountTransactions(accountId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  const transactions = ensure(data as TransactionDTO[] | null, error);
  return transactions.map(mapTransaction);
}

export async function createTransaction(input: CreateTransactionInput) {
  const signedAmount = input.type === 'Gasto' ? -input.amount : input.amount;

  let budgetCycleId: string | null = null;
  if (input.type === 'Gasto' && input.budgetId) {
    const cycle = await fetchOpenBudgetCycle(input.budgetId);
    budgetCycleId = cycle?.id ?? null;
  }

  const payload: InsertTransactionDTO = {
    account_id: input.account.id,
    budget_cycle_id: budgetCycleId,
    date: input.date,
    description: input.description,
    amount: signedAmount,
  };

  const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
  return mapTransaction(ensure(data as TransactionDTO | null, error));
}

export async function deleteTransaction(transactionId: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
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
  const accountsMap = await fetchAccountsMap();

  return transactions
    .filter((transaction) => transaction.amount < 0)
    .map((transaction) => ({
      id: transaction.id,
      accountId: transaction.account_id,
      accountName: accountsMap.get(transaction.account_id) ?? 'Cuenta desconocida',
      date: transaction.date,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
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

  const [accounts, txResult] = await Promise.all([
    fetchAccountsOverview(),
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

  for (const tx of transactions) {
    const monthIdx = monthIndex.get(tx.date.slice(0, 7));
    if (monthIdx !== undefined) {
      if (tx.amount >= 0) cashflow[monthIdx].income += tx.amount;
      else cashflow[monthIdx].expense += Math.abs(tx.amount);
    }

    if (tx.amount < 0) {
      const dayIdx = dayIndex.get(tx.date.slice(0, 10));
      if (dayIdx !== undefined) dailySpend[dayIdx].value += Math.abs(tx.amount);
    }
  }

  const currentMonth = cashflow[cashflow.length - 1];
  const recentTransactions: TransactionWithAccount[] = transactions.slice(0, 8).map((dto) => ({
    ...mapTransaction(dto),
    accountName: accountNames.get(dto.account_id) ?? 'Cuenta desconocida',
  }));

  return {
    totalBalance,
    monthIncome: currentMonth.income,
    monthExpense: currentMonth.expense,
    cashflow,
    dailySpend,
    recentTransactions,
  };
}

function dateInputToIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

export async function createBudget(input: CreateBudgetInput) {
  const payload: InsertBudgetDTO = {
    name: input.name,
    limit_amount: input.limitAmount,
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
    limit_amount: input.limitAmount,
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
    snapshot_limit_amount: progress.budget.limitAmount,
    snapshot_spent_amount: progress.spentAmount,
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
