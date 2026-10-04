import { repositories } from '@/infrastructure/repositories';
import { TransactionKind } from '../domain/transaction-kind.enum';
import { TransactionType } from '../domain/transaction-type.enum';
import {
  buildDescriptionSuggestions,
  toSignedTransactionAmount,
  validateRefund,
  validateTransfer,
} from '../domain/transaction-rules';
import type {
  CreateRefundInput,
  CreateTransactionInput,
  CreateTransferInput,
  EditableTransaction,
  Transaction,
  TransactionDescriptionSuggestion,
  UpdateRefundInput,
  UpdateTransactionInput,
} from '../domain/transaction.types';

const DESCRIPTION_SUGGESTION_LIMIT = 500;

export function listAccountTransactions(accountId: string): Promise<Transaction[]> {
  return repositories.transactions.listByAccount(accountId);
}

export async function getTransaction(transactionId: string): Promise<EditableTransaction> {
  const transaction = await repositories.transactions.get(transactionId);
  if (!transaction.budgetCycleId) {
    return { ...transaction, budgetId: null, budgetCycleEndedAt: null };
  }

  const cycle = await repositories.budgets.getCycle(transaction.budgetCycleId);
  return { ...transaction, budgetId: cycle.budgetId, budgetCycleEndedAt: cycle.endedAt ?? null };
}

export async function listTransactionDescriptions(): Promise<TransactionDescriptionSuggestion[]> {
  const rows = await repositories.transactions.listRecentDescriptions(DESCRIPTION_SUGGESTION_LIMIT);
  return buildDescriptionSuggestions(rows);
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const amount = toSignedTransactionAmount(input);

  let budgetCycleId: string | null = null;
  if (input.type === TransactionType.Expense && input.budgetId) {
    const cycle = await repositories.budgets.getOpenCycle(input.budgetId);
    budgetCycleId = cycle?.id ?? null;
  }

  return repositories.transactions.create({
    accountId: input.account.id,
    budgetCycleId,
    categoryId: input.categoryId ?? null,
    date: input.date,
    description: input.description,
    amount,
    isPlanned: input.isPlanned,
    planItemId: input.planItemId ?? null,
  }, input.tagIds);
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const amount = toSignedTransactionAmount(input);

  let budgetCycleId: string | null = null;
  if (input.type === TransactionType.Expense && input.budgetId) {
    const keepsOriginalCycle =
      input.budgetId === input.originalBudgetId && Boolean(input.originalBudgetCycleId);

    if (keepsOriginalCycle) {
      budgetCycleId = input.originalBudgetCycleId ?? null;
    } else {
      const cycle = await repositories.budgets.getOpenCycle(input.budgetId);
      budgetCycleId = cycle?.id ?? null;
    }
  }

  return repositories.transactions.update(transactionId, {
    accountId: input.account.id,
    budgetCycleId,
    categoryId: input.categoryId ?? null,
    date: input.date,
    description: input.description,
    amount,
    isPlanned: input.isPlanned,
    kind: TransactionKind.Regular,
    relatedTransactionId: null,
  }, input.tagIds);
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const transferId = await repositories.transactions.getTransferId(transactionId);
  if (transferId) {
    await repositories.transactions.deleteTransfer(transferId);
  } else {
    await repositories.transactions.delete(transactionId);
  }
}

export async function createTransfer(input: CreateTransferInput): Promise<void> {
  const amount = validateTransfer(input);
  const transferId = crypto.randomUUID();

  await repositories.transactions.createMany([
    {
      accountId: input.fromAccount.id,
      date: input.date,
      description: input.description,
      amount: -amount,
      transferId,
    },
    {
      accountId: input.toAccount.id,
      date: input.date,
      description: input.description,
      amount,
      transferId,
    },
  ]);
}

export async function getRefundedAmount(transactionId: string, excludeRefundId?: string): Promise<number> {
  const amounts = await repositories.transactions.listRefundAmounts(transactionId, excludeRefundId);
  return amounts.reduce((total, amount) => total + amount, 0);
}

function toRefundRecord(input: CreateRefundInput) {
  return {
    accountId: input.account.id,
    budgetCycleId: input.originalTransaction.budgetCycleId,
    categoryId: input.originalTransaction.categoryId,
    date: input.date,
    description: input.description,
    amount: validateRefund(input),
    kind: TransactionKind.Refund,
    relatedTransactionId: input.originalTransaction.id,
    isPlanned: input.originalTransaction.isPlanned,
  };
}

export function createRefund(input: CreateRefundInput): Promise<Transaction> {
  return repositories.transactions.create(
    toRefundRecord(input),
    input.originalTransaction.tags.map((tag) => tag.id),
  );
}

export function updateRefund(refundId: string, input: UpdateRefundInput): Promise<Transaction> {
  return repositories.transactions.update(
    refundId,
    toRefundRecord(input),
    input.originalTransaction.tags.map((tag) => tag.id),
  );
}

