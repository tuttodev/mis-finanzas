import assert from 'node:assert/strict';
import test from 'node:test';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import { Currency } from '@/shared/domain/currency.enum';
import { calculateBudgetProgress, calculateSpentAmount, toBudgetSnapshot } from '../budget-progress';

test('spending adds expenses, subtracts refunds and ignores income', () => {
  assert.equal(calculateSpentAmount([
    { amount: -150_000, kind: TransactionKind.Regular },
    { amount: 30_000, kind: TransactionKind.Refund },
    { amount: 500_000, kind: TransactionKind.Regular },
  ]), 120_000);
});

test('progress compares spending with the budget limit', () => {
  const budget = { id: 'b', name: 'Mercado', currency: Currency.COP, limitAmount: 400_000, isActive: true };
  const cycle = { id: 'c', budgetId: 'b', startedAt: '2026-10-01T05:00:00.000Z' };

  const progress = calculateBudgetProgress(budget, cycle, 100_000);
  assert.equal(progress.remainingAmount, 300_000);
  assert.equal(progress.percentage, 25);
  assert.equal(calculateBudgetProgress({ ...budget, limitAmount: 0 }, cycle, 100_000).progress, 0);
});

test('only closed cycles with stored amounts become snapshots', () => {
  const open = { id: 'c', budgetId: 'b', startedAt: '2026-09-01', endedAt: null };
  assert.equal(toBudgetSnapshot(open), null);

  const closed = { ...open, endedAt: '2026-10-01', snapshotLimitAmount: 200, snapshotSpentAmount: 50 };
  assert.equal(toBudgetSnapshot(closed)?.percentage, 25);
});
