import { supabase } from '@/lib/supabase';
import { roundCurrencyAmount } from '@/lib/formatters';
import type {
  Account,
  AccountDTO,
  AccountType,
  Currency,
  AdjustAccountBalanceInput,
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
  CreateTagInput,
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
  PayrollDocument,
  TransactionWithAccount,
  Tag,
  TagDTO,
  TransactionTagDTO,
  TransactionDescriptionSuggestion,
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

function mapAccount(
  dto: AccountDTO,
  currentBalance = 0,
  creditLimit = 0,
): Account {
  const type = mapAccountType(dto.type);

  return {
    id: dto.id,
    name: dto.name,
    type,
    currency: dto.currency,
    currentBalance,
    debtAmount: type === 'Crédito' ? Math.max(0, creditLimit - currentBalance) : 0,
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
  tags: Tag[] = [],
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
    isPlanned: dto.is_planned ?? null,
    tags,
  };
}

async function fetchTransactionTagsMap(transactionIds: string[]) {
  const tagsByTransaction = new Map<string, Tag[]>();
  if (!transactionIds.length) return tagsByTransaction;

  // Fetch tags lookup table once
  const { data: tagsData, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  const tags = ensure(tagsData as TagDTO[] | null, tagsError);
  const tagsById = new Map(
    tags.map((tag) => [
      tag.id,
      { id: tag.id, name: tag.name, isSystem: tag.is_system },
    ]),
  );

  // Batch the .in() queries to avoid exceeding URL length limits (400 Bad Request)
  const BATCH_SIZE = 50;
  const allLinks: TransactionTagDTO[] = [];
  for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
    const batch = transactionIds.slice(i, i + BATCH_SIZE);
    const { data: linksData, error: linksError } = await supabase
      .from('transaction_tags')
      .select('transaction_id, tag_id')
      .in('transaction_id', batch);
    const links = ensure(linksData as TransactionTagDTO[] | null, linksError);
    allLinks.push(...links);
  }

  for (const link of allLinks) {
    const tag = tagsById.get(link.tag_id);
    if (!tag) continue;
    const transactionTags = tagsByTransaction.get(link.transaction_id) ?? [];
    transactionTags.push(tag);
    tagsByTransaction.set(link.transaction_id, transactionTags);
  }

  return tagsByTransaction;
}


async function syncTransactionTags(transactionId: string, tagIds: string[]) {
  const selectedTagIds = Array.from(new Set(tagIds));

  const { error: deleteError } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId);
  if (deleteError) throw new Error(deleteError.message);

  if (selectedTagIds.length) {
    const { error: insertError } = await supabase.from('transaction_tags').insert(
      selectedTagIds.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  if (!selectedTagIds.length) return [];

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .in('id', selectedTagIds)
    .order('name');
  const selectedTags = ensure(data as TagDTO[] | null, error);
  return selectedTags.map((tag) => mapTag(tag));
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
    supabase.from('account_balances').select('account_id, balance'),
  ]);

  const accountDtos = ensure(accountsResult.data as AccountDTO[] | null, accountsResult.error);
  const balanceRows = ensure(
    balancesResult.data as Array<{ account_id: string; balance: number }> | null,
    balancesResult.error,
  );

  // Use balances computed in the database (avoids the 1000-row client-side limit)
  const balancesMap = new Map<string, number>();
  for (const row of balanceRows) {
    balancesMap.set(row.account_id, Number(row.balance));
  }

  return accountDtos.map((dto) => {
    const rawBalance = balancesMap.get(dto.id) ?? 0;
    const currentBalance = roundCurrencyAmount(rawBalance);
    return mapAccount(dto, currentBalance);
  });
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 80) throw new Error('El nombre no puede superar 80 caracteres');

  const payload: InsertAccountDTO = {
    name,
    type: mapAccountTypeToDatabase(input.type),
    currency: input.currency,
  };

  const { data, error } = await supabase
    .from('accounts')
    .insert(payload)
    .select('*')
    .single();

  return mapAccount(ensure(data as AccountDTO | null, error));
}

export async function adjustAccountBalance(input: AdjustAccountBalanceInput): Promise<Transaction> {
  const normalizedTarget = roundCurrencyAmount(input.targetBalance);
  const currentBalance = roundCurrencyAmount(input.account.currentBalance);
  const difference = roundCurrencyAmount(normalizedTarget - currentBalance);

  if (difference === 0) {
    throw new Error('El saldo ingresado es igual al saldo actual');
  }

  const description = input.description?.trim() || 'Ajuste de saldo';

  if (difference > 0) {
    const payload: InsertTransactionDTO = {
      account_id: input.account.id,
      date: input.date,
      description,
      amount: difference,
      budget_cycle_id: null,
      category_id: null,
      is_planned: false,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*')
      .single();

    const transaction = ensure(data as TransactionDTO | null, error);
    return mapTransaction(transaction, new Map(), []);
  } else {
    const categories = await fetchExpenseCategories();
    const expenseCategory =
      categories.find((c) => c.slug === 'other' && c.transactionType === 'expense') ||
      categories.find((c) => c.transactionType === 'expense');

    if (!expenseCategory) {
      throw new Error('No se encontró una categoría de gastos para el ajuste');
    }

    const payload: InsertTransactionDTO = {
      account_id: input.account.id,
      date: input.date,
      description,
      amount: difference,
      category_id: expenseCategory.id,
      budget_cycle_id: null,
      is_planned: false,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('*')
      .single();

    const transaction = ensure(data as TransactionDTO | null, error);
    return mapTransaction(transaction, new Map(), []);
  }
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
  const transactionTags = await fetchTransactionTagsMap(transactions.map((transaction) => transaction.id));
  return transactions.map((transaction) =>
    mapTransaction(transaction, categoryNames, transactionTags.get(transaction.id)),
  );
}

export async function fetchTransactionDescriptions(): Promise<TransactionDescriptionSuggestion[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('description, category_id, created_at, date')
    .not('description', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  if (!data) return [];

  const map = new Map<string, TransactionDescriptionSuggestion>();

  for (const row of data) {
    const rawDesc = row.description?.trim();
    if (!rawDesc) continue;
    const key = rawDesc.toLowerCase();

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        description: rawDesc,
        categoryId: row.category_id ?? null,
        count: 1,
        lastUsedAt: row.created_at || row.date || '',
      });
    }
  }

  return Array.from(map.values());
}

export async function createTransaction(input: CreateTransactionInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  const signedAmount = input.type === 'Gasto' ? -normalizedAmount : normalizedAmount;

  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.type === 'Gasto' && !input.categoryId) {
    throw new Error('Selecciona una categoría');
  }
  if (input.account.currency !== 'COP' && input.budgetId) {
    throw new Error('Los movimientos en USD no se pueden asignar a presupuestos en COP');
  }
  if (input.account.currency !== 'COP' && input.planItemId) {
    throw new Error('Los movimientos en USD no se pueden vincular a partidas planeadas en COP');
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
    is_planned: input.isPlanned,
    plan_item_id: input.planItemId ?? null,
  };

  const { data, error } = await supabase.from('transactions').insert(payload).select('*').single();
  const transaction = ensure(data as TransactionDTO | null, error);
  const tags = await syncTransactionTags(transaction.id, input.tagIds);
  return mapTransaction(transaction, new Map(), tags);
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
    is_planned: input.originalTransaction.isPlanned,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*')
    .single();

  const transaction = ensure(data as TransactionDTO | null, error);
  const tags = await syncTransactionTags(
    transaction.id,
    input.originalTransaction.tags.map((tag) => tag.id),
  );
  return mapTransaction(transaction, new Map(), tags);
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
    is_planned: input.originalTransaction.isPlanned,
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', refundId)
    .select('*')
    .single();

  const transaction = ensure(data as TransactionDTO | null, error);
  const tags = await syncTransactionTags(
    transaction.id,
    input.originalTransaction.tags.map((tag) => tag.id),
  );
  return mapTransaction(transaction, new Map(), tags);
}

export async function createTransfer(input: CreateTransferInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.fromAccount.id === input.toAccount.id) {
    throw new Error('Selecciona cuentas diferentes');
  }
  if (input.fromAccount.currency !== input.toAccount.currency) {
    throw new Error('Las transferencias solo están disponibles entre cuentas de la misma moneda');
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
  const [transactionResult, categoryNames, transactionTags] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', transactionId).single(),
    fetchCategoriesMap(),
    fetchTransactionTagsMap([transactionId]),
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
    ...mapTransaction(transactionDto, categoryNames, transactionTags.get(transactionId)),
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
  if (input.account.currency !== 'COP' && input.budgetId) {
    throw new Error('Los movimientos en USD no se pueden asignar a presupuestos en COP');
  }
  if (input.account.currency !== 'COP' && input.planItemId) {
    throw new Error('Los movimientos en USD no se pueden vincular a partidas planeadas en COP');
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
    is_planned: input.isPlanned,
    kind: 'regular',
    related_transaction_id: null,
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', transactionId)
    .select('*')
    .single();

  const transaction = ensure(data as TransactionDTO | null, error);
  const tags = await syncTransactionTags(transaction.id, input.tagIds);
  return mapTransaction(transaction, new Map(), tags);
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

function mapTag(dto: TagDTO, usageCount = 0): Tag {
  return { id: dto.id, name: dto.name, isSystem: dto.is_system, usageCount };
}

export async function fetchTags(): Promise<Tag[]> {
  const [{ data, error }, { data: usageData, error: usageError }] = await Promise.all([
    supabase.from('tags').select('*').order('name'),
    supabase.from('transaction_tags').select('tag_id'),
  ]);
  const tagDtos = ensure(data as TagDTO[] | null, error);
  const usageRows = ensure(usageData as Array<{ tag_id: string }> | null, usageError);
  const usageCounts = new Map<string, number>();

  for (const row of usageRows) {
    usageCounts.set(row.tag_id, (usageCounts.get(row.tag_id) ?? 0) + 1);
  }

  return tagDtos.map((tag) => mapTag(tag, usageCounts.get(tag.id) ?? 0));
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 40) throw new Error('La etiqueta no puede superar 40 caracteres');

  const { data, error } = await supabase
    .from('tags')
    .insert({ name })
    .select('*')
    .single();

  if (error?.code === '23505') {
    throw new Error('Ya existe una etiqueta con ese nombre');
  }

  return mapTag(ensure(data as TagDTO | null, error));
}

export async function deleteTag(tagId: string) {
  const { data: tagData, error: tagError } = await supabase
    .from('tags')
    .select('is_system')
    .eq('id', tagId)
    .single();
  const tag = ensure(tagData as { is_system: boolean } | null, tagError);
  if (tag.is_system) throw new Error('Las etiquetas comunes no se pueden eliminar');

  const { data, error } = await supabase
    .from('transaction_tags')
    .select('transaction_id')
    .eq('tag_id', tagId)
    .limit(1);
  const links = ensure(data as Array<{ transaction_id: string }> | null, error);

  if (links.length) {
    throw new Error('No se puede eliminar una etiqueta que está en uso');
  }

  const { error: deleteError } = await supabase.from('tags').delete().eq('id', tagId);
  if (deleteError) throw new Error(deleteError.message);
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
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const balancesByCurrency = (['COP', 'USD'] as Currency[])
    .map((currency) => ({
      currency,
      balance: accounts
        .filter((account) => account.currency === currency)
        .reduce((sum, account) => sum + account.currentBalance, 0),
    }))
    .filter(({ currency }) => accounts.some((account) => account.currency === currency));

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
    // Budgets and dashboard charts are denominated in COP. USD is tracked in its
    // own account balance and is intentionally never mixed into these metrics.
    if (accountsById.get(tx.account_id)?.currency !== 'COP') continue;
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

  // Only fetch tags for the 8 recent transactions shown in the dashboard
  // (avoids a 400 Bad Request from a URL that's too long when passing all IDs)
  const recentDtos = transactions.slice(0, 8);
  const transactionTags = await fetchTransactionTagsMap(recentDtos.map((tx) => tx.id));

  const currentMonth = cashflow[cashflow.length - 1];
  const categorySpending: CategorySpending[] = Array.from(categoryTotals, ([label, value]) => ({
    label,
    value,
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const recentTransactions: TransactionWithAccount[] = recentDtos.map((dto) => ({
    ...mapTransaction(dto, categories, transactionTags.get(dto.id)),
    accountName: accountNames.get(dto.account_id) ?? 'Cuenta desconocida',
    currency: accountsById.get(dto.account_id)?.currency ?? 'COP',
  }));

  return {
    balancesByCurrency,
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

function mapPlanItem(dto: PlanItemDTO, tagIds: string[] = [], actualAmount: number | null = null): PlanItem {
  return {
    id: dto.id,
    planId: dto.plan_id,
    name: dto.name,
    kind: dto.kind,
    plannedAmount: dto.planned_amount,
    actualAmount,
    note: dto.note,
    isPaid: dto.is_paid,
    budgetId: dto.budget_id,
    categoryId: dto.category_id,
    tagIds,
    sortOrder: dto.sort_order,
  };
}

function summarizePlan(plan: MonthlyPlan, items: PlanItem[]): MonthlyPlanSummary {
  const incomeGross = items
    .filter((item) => item.kind === 'income')
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const deductionsTotal = items
    .filter((item) => item.kind === 'deduction')
    .reduce((sum, item) => sum + item.plannedAmount, 0);
  const incomeTotal = incomeGross - deductionsTotal;
  const expenseTotal = items
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.plannedAmount, 0);

  return {
    plan,
    items,
    incomeGross,
    deductionsTotal,
    incomeTotal,
    expenseTotal,
    leftover: incomeTotal - expenseTotal,
  };
}

async function fetchPlanItems(planId: string): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order')
    .order('created_at');

  const planItems = ensure(data as PlanItemDTO[] | null, error);
  const planItemIds = planItems.map((item) => item.id);

  const [tagIdsByPlanItem, actualAmountByPlanItem] = await Promise.all([
    fetchPlanItemTagsMap(planItemIds),
    fetchPlanItemActualAmounts(planItemIds),
  ]);

  return planItems.map((item) =>
    mapPlanItem(item, tagIdsByPlanItem.get(item.id), actualAmountByPlanItem.get(item.id) ?? null),
  );
}

async function fetchPlanItemActualAmounts(planItemIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!planItemIds.length) return result;

  const { data, error } = await supabase
    .from('transactions')
    .select('plan_item_id, amount')
    .in('plan_item_id', planItemIds);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ plan_item_id: string; amount: number }>;
  for (const row of rows) {
    if (!row.plan_item_id) continue;
    const prev = result.get(row.plan_item_id) ?? 0;
    // amounts for expenses are stored as negative; we sum absolute values
    result.set(row.plan_item_id, prev + Math.abs(row.amount));
  }

  return result;
}

async function fetchPlanItemTagsMap(planItemIds: string[]) {
  const tagsByPlanItem = new Map<string, string[]>();
  if (!planItemIds.length) return tagsByPlanItem;

  const { data, error } = await supabase
    .from('plan_item_tags')
    .select('plan_item_id, tag_id')
    .in('plan_item_id', planItemIds);
  const links = ensure(
    data as Array<{ plan_item_id: string; tag_id: string }> | null,
    error,
  );

  for (const link of links) {
    const tagIds = tagsByPlanItem.get(link.plan_item_id) ?? [];
    tagIds.push(link.tag_id);
    tagsByPlanItem.set(link.plan_item_id, tagIds);
  }

  return tagsByPlanItem;
}

async function syncPlanItemTags(planItemId: string, tagIds: string[]) {
  const selectedTagIds = Array.from(new Set(tagIds));
  const { error: deleteError } = await supabase
    .from('plan_item_tags')
    .delete()
    .eq('plan_item_id', planItemId);
  if (deleteError) throw new Error(deleteError.message);

  if (!selectedTagIds.length) return;

  const { error: insertError } = await supabase.from('plan_item_tags').insert(
    selectedTagIds.map((tagId) => ({ plan_item_id: planItemId, tag_id: tagId })),
  );
  if (insertError) throw new Error(insertError.message);
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
    await Promise.all(
      previous.items.map(async (item) => {
        const { data: insertedItem, error: itemError } = await supabase
          .from('plan_items')
          .insert({
            plan_id: plan.id,
            name: item.name,
            kind: item.kind,
            planned_amount: item.plannedAmount,
            note: item.note,
            budget_id: item.budgetId,
            category_id: item.categoryId,
            sort_order: item.sortOrder,
          })
          .select('*')
          .single();
        const createdItem = ensure(insertedItem as PlanItemDTO | null, itemError);
        await syncPlanItemTags(createdItem.id, item.tagIds);
      }),
    );
  }

  const items = await fetchPlanItems(plan.id);
  return summarizePlan(plan, items);
}

/**
 * Imports selected items from the previous month's plan into an existing plan.
 * Items that already exist in the target plan (matched by name + kind, case-insensitive)
 * are skipped so there are no duplicates.
 * Returns the newly inserted PlanItems.
 */
export async function mergeFromPreviousPlan(
  targetPlanId: string,
  monthKey: string,
  selectedItemIds: string[],
): Promise<PlanItem[]> {
  if (!selectedItemIds.length) return [];

  const previous = await fetchPreviousPlanSummary(monthKey);
  if (!previous) throw new Error('No hay un plan anterior para importar');

  const existingItems = await fetchPlanItems(targetPlanId);
  const existingKeys = new Set(
    existingItems.map((i) => `${i.kind}::${i.name.trim().toLowerCase()}`),
  );

  const toInsert = previous.items.filter(
    (item) =>
      selectedItemIds.includes(item.id) &&
      !existingKeys.has(`${item.kind}::${item.name.trim().toLowerCase()}`),
  );

  if (!toInsert.length) return [];

  const inserted: PlanItem[] = [];
  await Promise.all(
    toInsert.map(async (item) => {
      const { data: insertedItem, error: itemError } = await supabase
        .from('plan_items')
        .insert({
          plan_id: targetPlanId,
          name: item.name,
          kind: item.kind,
          planned_amount: item.plannedAmount,
          note: item.note,
          budget_id: item.budgetId,
          category_id: item.categoryId,
          sort_order: item.sortOrder,
        })
        .select('*')
        .single();
      const createdItem = ensure(insertedItem as PlanItemDTO | null, itemError);
      await syncPlanItemTags(createdItem.id, item.tagIds);
      const tagIdsByPlanItem = await fetchPlanItemTagsMap([createdItem.id]);
      inserted.push(mapPlanItem(createdItem, tagIdsByPlanItem.get(createdItem.id)));
    }),
  );

  return inserted;
}

export async function fetchPlanItem(itemId: string): Promise<PlanItem> {
  const { data, error } = await supabase.from('plan_items').select('*').eq('id', itemId).single();
  const planItem = ensure(data as PlanItemDTO | null, error);
  const tagIdsByPlanItem = await fetchPlanItemTagsMap([itemId]);
  return mapPlanItem(planItem, tagIdsByPlanItem.get(itemId));
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
    budget_id: input.budgetId ?? null,
    category_id: input.kind === 'expense' ? input.categoryId ?? null : null,
  };

  const { data, error } = await supabase.from('plan_items').insert(payload).select('*').single();
  const planItem = ensure(data as PlanItemDTO | null, error);
  await syncPlanItemTags(planItem.id, input.kind === 'expense' ? input.tagIds ?? [] : []);
  return mapPlanItem(planItem, Array.from(new Set(input.tagIds ?? [])));
}

export async function updatePlanItem(itemId: string, input: UpdatePlanItemInput) {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');

  const payload: UpdatePlanItemDTO = {
    name,
    planned_amount: roundCurrencyAmount(input.plannedAmount),
    note: input.note?.trim() || null,
  };
  if (input.kind !== undefined) payload.kind = input.kind;
  if (input.budgetId !== undefined) payload.budget_id = input.budgetId;
  if (input.categoryId !== undefined) {
    payload.category_id = input.kind === 'expense' ? input.categoryId : null;
  }

  const { error } = await supabase.from('plan_items').update(payload).eq('id', itemId);
  if (error) throw new Error(error.message);
  await syncPlanItemTags(itemId, input.kind === 'expense' ? input.tagIds ?? [] : []);
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

export async function createPlanItemsBatch(
  planId: string,
  items: CreatePlanItemInput[],
): Promise<PlanItem[]> {
  if (!items.length) return [];

  const payloads: InsertPlanItemDTO[] = items.map((item, index) => ({
    plan_id: planId,
    name: item.name.trim(),
    kind: item.kind,
    planned_amount: roundCurrencyAmount(item.plannedAmount),
    note: item.note?.trim() || null,
    budget_id: item.budgetId ?? null,
    category_id: item.kind === 'expense' ? item.categoryId ?? null : null,
    sort_order: (index + 1) * 10,
  }));

  const { data, error } = await supabase
    .from('plan_items')
    .insert(payloads)
    .select('*');

  const createdDtos = ensure(data as PlanItemDTO[] | null, error);
  return createdDtos.map((dto) => mapPlanItem(dto, []));
}

export async function replacePayrollPlanItems(
  planId: string,
  newItems: CreatePlanItemInput[],
): Promise<PlanItem[]> {
  const { error: deleteError } = await supabase
    .from('plan_items')
    .delete()
    .eq('plan_id', planId)
    .in('kind', ['income', 'deduction']);

  if (deleteError) throw new Error(deleteError.message);

  return createPlanItemsBatch(planId, newItems);
}

const PAYROLL_DOCUMENT_BUCKET = 'payroll-documents';

export async function uploadPayrollDocument(planId: string, file: File): Promise<PayrollDocument> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');

  const storagePath = `${userId}/${planId}/${crypto.randomUUID()}.pdf`;
  const storage = supabase.storage.from(PAYROLL_DOCUMENT_BUCKET);

  const { error: uploadError } = await storage.upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error: metadataError } = await supabase
    .from('payroll_documents')
    .insert({
      plan_id: planId,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: 'application/pdf',
      file_size: file.size,
    })
    .select('*')
    .single();

  if (metadataError || !data) {
    await storage.remove([storagePath]);
    throw new Error(metadataError?.message ?? 'No se pudo registrar el documento');
  }

  return {
    id: data.id,
    planId: data.plan_id,
    storagePath: data.storage_path,
    originalName: data.original_name,
    mimeType: data.mime_type,
    fileSize: data.file_size,
    createdAt: data.created_at,
  };
}

export async function fetchPayrollDocuments(planId: string): Promise<PayrollDocument[]> {
  const { data, error } = await supabase
    .from('payroll_documents')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((document) => ({
    id: document.id,
    planId: document.plan_id,
    storagePath: document.storage_path,
    originalName: document.original_name,
    mimeType: document.mime_type,
    fileSize: document.file_size,
    createdAt: document.created_at,
  }));
}

export async function createPayrollDocumentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PAYROLL_DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 10 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'No se pudo generar el enlace del documento');
  }

  return data.signedUrl;
}

export async function downloadPayrollDocument(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(PAYROLL_DOCUMENT_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo descargar el documento');
  }

  return data;
}
