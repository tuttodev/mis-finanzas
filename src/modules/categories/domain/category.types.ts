import type { TransactionType } from '@/modules/transactions/domain/transaction-type.enum';

export type ExpenseCategory = {
  id: string;
  slug: string;
  name: string;
  transactionType: TransactionType;
  isSystem: boolean;
  hasTransactions: boolean;
};

export type CreateExpenseCategoryInput = {
  name: string;
  transactionType: TransactionType;
};
