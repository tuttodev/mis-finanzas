import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountType } from '@/modules/accounts/domain/account-type.enum';
import type { Account } from '@/modules/accounts/domain/account.types';
import { Currency } from '@/shared/domain/currency.enum';
import { TransactionKind } from '../transaction-kind.enum';
import { TransactionType } from '../transaction-type.enum';
import {
  buildDescriptionSuggestions,
  toSignedTransactionAmount,
  validateRefund,
  validateTransfer,
} from '../transaction-rules';
import type { EditableTransaction } from '../transaction.types';

function account(id: string, currency = Currency.COP): Account {
  return { id, name: id, type: AccountType.Savings, currency, currentBalance: 0, debtAmount: 0 };
}

function expense(overrides: Partial<EditableTransaction> = {}): EditableTransaction {
  return {
    id: 'expense',
    accountId: 'cop',
    budgetCycleId: 'cycle',
    categoryId: 'food',
    categoryName: 'Comida',
    categorySlug: 'food',
    date: '2026-10-01',
    description: 'Mercado',
    amount: -150_000,
    transferId: null,
    kind: TransactionKind.Regular,
    relatedTransactionId: null,
    isPlanned: false,
    tags: [],
    budgetId: 'budget',
    budgetCycleEndedAt: null,
    ...overrides,
  };
}

test('expenses are stored negative and require a category', () => {
  assert.equal(toSignedTransactionAmount({ amount: 1500.004, type: TransactionType.Expense, categoryId: 'food' }), -1500);
  assert.equal(toSignedTransactionAmount({ amount: 200, type: TransactionType.Income, categoryId: null }), 200);
  assert.throws(() => toSignedTransactionAmount({ amount: 10, type: TransactionType.Expense, categoryId: null }), /categoría/);
  assert.throws(() => toSignedTransactionAmount({ amount: 0, type: TransactionType.Income }), /monto válido/);
});

test('refunds only apply to budgeted expenses in an open cycle', () => {
  const base = { account: account('cop'), amount: 30_000, date: '2026-10-02', description: 'Reembolso' };
  assert.equal(validateRefund({ ...base, originalTransaction: expense() }), 30_000);
  assert.throws(() => validateRefund({ ...base, originalTransaction: expense({ budgetCycleId: null }) }), /presupuesto/);
  assert.throws(() => validateRefund({ ...base, originalTransaction: expense({ amount: 100 }) }), /presupuesto/);
  assert.throws(
    () => validateRefund({ ...base, originalTransaction: expense({ budgetCycleEndedAt: '2026-10-05' }) }),
    /ciclo cerrado/,
  );
});

test('transfers move a positive amount between different accounts of one currency', () => {
  const base = { amount: 50, date: '2026-10-02', description: 'Ahorro' };
  assert.equal(validateTransfer({ ...base, fromAccount: account('a'), toAccount: account('b') }), 50);
  assert.throws(() => validateTransfer({ ...base, fromAccount: account('a'), toAccount: account('a') }), /diferentes/);
  assert.throws(
    () => validateTransfer({ ...base, fromAccount: account('a'), toAccount: account('b', Currency.USD) }),
    /misma moneda/,
  );
});

test('description suggestions group case-insensitively and keep the first category seen', () => {
  const suggestions = buildDescriptionSuggestions([
    { description: 'Mercado ', categoryId: 'food', createdAt: '2026-10-02', date: '2026-10-02' },
    { description: 'mercado', categoryId: 'other', createdAt: '2026-10-01', date: '2026-10-01' },
    { description: '   ', categoryId: null, createdAt: null, date: null },
  ]);

  assert.deepEqual(suggestions, [
    { description: 'Mercado', categoryId: 'food', count: 2, lastUsedAt: '2026-10-02' },
  ]);
});
