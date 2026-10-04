import type { TransactionType } from '@/modules/transactions/domain/transaction-type.enum';

export type ExpenseCategoryDTO = {
  id: string;
  slug: string;
  name: string;
  transaction_type: TransactionType;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at?: string | null;
};

export type InsertExpenseCategoryDTO = {
  name: string;
  transaction_type: TransactionType;
};
