import { TransactionType } from '../domain/transaction-type.enum';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.Income]: 'Ingreso',
  [TransactionType.Expense]: 'Gasto',
};
