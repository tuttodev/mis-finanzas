import type { Account } from '@/modules/accounts/domain/account.types';
import type { Tag } from '@/modules/tags/domain/tag.types';
import type { Currency } from '@/shared/domain/currency.enum';
import type { TransactionKind } from './transaction-kind.enum';
import type { TransactionType } from './transaction-type.enum';

export type Transaction = {
  id: string;
  accountId: string;
  budgetCycleId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  date: string;
  description: string;
  /** Signed amount: expenses are negative; income, refunds and incoming transfers are positive. */
  amount: number;
  transferId: string | null;
  kind: TransactionKind;
  relatedTransactionId: string | null;
  isPlanned: boolean | null;
  tags: Tag[];
};

export type EditableTransaction = Transaction & {
  budgetId: string | null;
  budgetCycleEndedAt: string | null;
};

export type TransactionWithAccount = Transaction & {
  accountName: string;
  currency: Currency;
};

/** Persistence-neutral record used to create or replace a transaction. */
export type TransactionRecord = {
  accountId: string;
  budgetCycleId?: string | null;
  categoryId?: string | null;
  date: string;
  description: string;
  amount: number;
  transferId?: string | null;
  kind?: TransactionKind;
  relatedTransactionId?: string | null;
  isPlanned?: boolean | null;
  planItemId?: string | null;
};

export type TransactionDescriptionRow = {
  description: string | null;
  categoryId: string | null;
  createdAt: string | null;
  date: string | null;
};

export type TransactionDescriptionSuggestion = {
  description: string;
  categoryId: string | null;
  count: number;
  lastUsedAt: string;
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
