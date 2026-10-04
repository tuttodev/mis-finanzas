import { roundCurrencyAmount } from '@/shared/lib/formatters';
import { TransactionKind } from './transaction-kind.enum';
import { TransactionType } from './transaction-type.enum';
import type {
  CreateRefundInput,
  CreateTransactionInput,
  CreateTransferInput,
  TransactionDescriptionRow,
  TransactionDescriptionSuggestion,
} from './transaction.types';

/** Validates a regular transaction and returns its signed amount. */
export function toSignedTransactionAmount(input: Pick<CreateTransactionInput, 'amount' | 'type' | 'categoryId'>) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.type === TransactionType.Expense && !input.categoryId) {
    throw new Error('Selecciona una categoría');
  }

  return input.type === TransactionType.Expense ? -normalizedAmount : normalizedAmount;
}

/** Validates a refund against its original expense and returns the refunded amount. */
export function validateRefund(input: CreateRefundInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  const original = input.originalTransaction;

  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (original.kind !== TransactionKind.Regular || original.amount >= 0 || !original.budgetCycleId) {
    throw new Error('El movimiento relacionado debe ser un gasto con presupuesto');
  }
  if (original.budgetCycleEndedAt) {
    throw new Error('No se pueden registrar reembolsos en un ciclo cerrado');
  }

  return normalizedAmount;
}

/** Validates a transfer between two own accounts and returns the transferred amount. */
export function validateTransfer(input: CreateTransferInput) {
  const normalizedAmount = roundCurrencyAmount(input.amount);
  if (normalizedAmount <= 0) throw new Error('Ingresa un monto válido');
  if (input.fromAccount.id === input.toAccount.id) {
    throw new Error('Selecciona cuentas diferentes');
  }
  if (input.fromAccount.currency !== input.toAccount.currency) {
    throw new Error('Las transferencias solo están disponibles entre cuentas de la misma moneda');
  }

  return normalizedAmount;
}

/** Groups previous descriptions case-insensitively, keeping the most recent spelling first seen. */
export function buildDescriptionSuggestions(
  rows: TransactionDescriptionRow[],
): TransactionDescriptionSuggestion[] {
  const suggestions = new Map<string, TransactionDescriptionSuggestion>();

  for (const row of rows) {
    const description = row.description?.trim();
    if (!description) continue;
    const key = description.toLowerCase();

    const existing = suggestions.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      suggestions.set(key, {
        description,
        categoryId: row.categoryId ?? null,
        count: 1,
        lastUsedAt: row.createdAt || row.date || '',
      });
    }
  }

  return Array.from(suggestions.values());
}
