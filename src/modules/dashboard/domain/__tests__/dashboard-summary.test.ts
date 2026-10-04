import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountType } from '@/modules/accounts/domain/account-type.enum';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { Currency } from '@/shared/domain/currency.enum';
import { buildDashboardSummary } from '../dashboard-summary';

const accounts = [
  { id: 'cop', name: 'Bancolombia', type: AccountType.Savings, currency: Currency.COP, currentBalance: 1_000, debtAmount: 0 },
  { id: 'usd', name: 'Wise', type: AccountType.Savings, currency: Currency.USD, currentBalance: 50, debtAmount: 0 },
];

function tx(date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `${date}-${amount}`,
    accountId: 'cop',
    budgetCycleId: null,
    categoryId: 'food',
    categoryName: 'Comida',
    categorySlug: 'food',
    date,
    description: '',
    amount,
    transferId: null,
    kind: TransactionKind.Regular,
    relatedTransactionId: null,
    isPlanned: null,
    tags: [],
    ...overrides,
  };
}

test('current month totals exclude transfers and other currencies and net out refunds', () => {
  const summary = buildDashboardSummary({
    accounts,
    transactions: [
      tx('2026-10-05', -150_000),
      tx('2026-10-06', 30_000, { kind: TransactionKind.Refund }),
      tx('2026-10-07', 2_000_000, { categoryId: null, categoryName: null }),
      tx('2026-10-08', -500_000, { transferId: 'transfer' }),
      tx('2026-10-09', -99, { accountId: 'usd' }),
    ],
    recentTransactions: [],
    currency: Currency.COP,
    now: new Date(2026, 9, 15),
  });

  assert.equal(summary.monthIncome, 2_000_000);
  assert.equal(summary.monthExpense, 120_000);
  assert.deepEqual(summary.categorySpending, [{ label: 'Comida', value: 120_000 }]);
  assert.deepEqual(summary.balancesByCurrency, [
    { currency: Currency.COP, balance: 1_000 },
    { currency: Currency.USD, balance: 50 },
  ]);
  assert.equal(summary.cashflow.length, 6);
  assert.equal(summary.dailySpend.length, 30);
});

test('recent transactions carry the account name and currency', () => {
  const summary = buildDashboardSummary({
    accounts,
    transactions: [],
    recentTransactions: [tx('2026-10-05', -10, { accountId: 'usd' })],
    currency: Currency.COP,
    now: new Date(2026, 9, 15),
  });

  assert.equal(summary.recentTransactions[0].accountName, 'Wise');
  assert.equal(summary.recentTransactions[0].currency, Currency.USD);
});
