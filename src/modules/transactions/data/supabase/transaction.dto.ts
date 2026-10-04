import type { TransactionKind } from '../../domain/transaction-kind.enum';

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
