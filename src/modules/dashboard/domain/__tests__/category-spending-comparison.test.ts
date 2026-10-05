import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountType } from '@/modules/accounts/domain/account-type.enum';
import type { Account } from '@/modules/accounts/domain/account.types';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { Currency } from '@/shared/domain/currency.enum';
import { compareCategorySpending, compareCategorySpendingByCurrency } from '../category-spending-comparison';

const accounts: Account[] = [
  { id: 'cop', name: 'Ahorros', type: AccountType.Savings, currency: Currency.COP, currentBalance: 0, debtAmount: 0 },
  { id: 'usd', name: 'Dólares', type: AccountType.Savings, currency: Currency.USD, currentBalance: 0, debtAmount: 0 },
];

const OCTOBER_15 = new Date(2026, 9, 15);

function tx(date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `${date}:${amount}:${overrides.categoryId ?? 'food'}:${overrides.kind ?? ''}`,
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

function compare(transactions: Transaction[], now = OCTOBER_15) {
  return compareCategorySpending({ transactions, accounts, currency: Currency.COP, now });
}

const refund = { kind: TransactionKind.Refund };
const rent = { categoryId: 'rent', categoryName: 'Arriendo', categorySlug: 'housing' };

test('AC-1: nets refunds per month and compares the current month with the previous one', () => {
  const result = compare([
    tx('2026-09-05', -150_000),
    tx('2026-09-10', 30_000, refund),
    tx('2026-10-05', -200_000),
    tx('2026-10-10', 50_000, refund),
  ]);

  assert.equal(result.currentMonth, '2026-10');
  assert.equal(result.previousMonth, '2026-09');
  assert.deepEqual(result.rows, [{
    categoryId: 'food',
    categoryName: 'Comida',
    currentAmount: 150_000,
    previousAmount: 120_000,
    difference: 30_000,
    percentChange: 25,
  }]);
});

test('AC-2: ignores transfers, income, other currencies and other months', () => {
  const result = compare([
    tx('2026-10-05', -100_000),
    tx('2026-10-06', -999_999, { transferId: 'transfer' }),
    tx('2026-10-07', 999_999),
    tx('2026-10-08', -999_999, { accountId: 'usd' }),
    tx('2026-08-20', -999_999),
    tx('2026-11-01', -999_999),
  ]);

  assert.deepEqual(result.rows.map((row) => [row.currentAmount, row.previousAmount]), [[100_000, 0]]);
});

test('AC-3: a category with spending in only one month shows zero in the other', () => {
  const result = compare([
    tx('2026-10-03', -500_000, rent),
    tx('2026-09-12', -80_000),
  ]);

  const rentRow = result.rows.find((row) => row.categoryId === 'rent');
  const foodRow = result.rows.find((row) => row.categoryId === 'food');
  assert.deepEqual(
    [rentRow?.previousAmount, rentRow?.difference, rentRow?.percentChange],
    [0, 500_000, null],
  );
  assert.deepEqual(
    [foodRow?.currentAmount, foodRow?.difference, foodRow?.percentChange],
    [0, -80_000, -100],
  );
});

test('AC-4: in January the previous month is December of the previous year', () => {
  const result = compare([tx('2026-12-20', -40_000), tx('2027-01-02', -10_000)], new Date(2027, 0, 10));

  assert.equal(result.currentMonth, '2027-01');
  assert.equal(result.previousMonth, '2026-12');
  assert.deepEqual([result.rows[0].currentAmount, result.rows[0].previousAmount], [10_000, 40_000]);
});

test('AC-5: keeps negative net spending and gives no percentage after a zero or negative month', () => {
  const result = compare([
    tx('2026-09-02', -20_000),
    tx('2026-09-03', 50_000, refund),
    tx('2026-10-02', -5_000),
    tx('2026-09-04', -10_000, rent),
    tx('2026-09-05', 10_000, { ...rent, ...refund }),
    tx('2026-10-04', -3_000, rent),
  ]);

  const food = result.rows.find((row) => row.categoryId === 'food');
  const rentRow = result.rows.find((row) => row.categoryId === 'rent');
  assert.equal(food?.previousAmount, -30_000);
  assert.equal(food?.difference, 35_000);
  assert.equal(food?.percentChange, null);
  assert.equal(rentRow?.previousAmount, 0);
  assert.equal(rentRow?.percentChange, null);
});

test('AC-6: returns no rows when neither month has category spending', () => {
  assert.deepEqual(compare([tx('2026-08-01', -10_000), tx('2026-10-01', 10_000)]).rows, []);
});

test('AC-7: groups by category ID and puts uncategorized spending in its own row', () => {
  const result = compare([
    tx('2026-10-01', -10_000, { categoryId: 'a', categoryName: 'Otros' }),
    tx('2026-10-02', -20_000, { categoryId: 'b', categoryName: 'Otros' }),
    tx('2026-10-03', -5_000, { categoryId: null, categoryName: null }),
  ]);

  assert.deepEqual(
    result.rows.map((row) => [row.categoryId, row.categoryName, row.currentAmount]),
    [['b', 'Otros', 20_000], ['a', 'Otros', 10_000], [null, 'Sin categoría', 5_000]],
  );
});

test('rows are ordered by current spending, then previous spending, then name', () => {
  const result = compare([
    tx('2026-10-01', -10_000, { categoryId: 'b', categoryName: 'Bebidas' }),
    tx('2026-10-01', -10_000, { categoryId: 'a', categoryName: 'Aseo' }),
    tx('2026-09-01', -1_000, { categoryId: 'b', categoryName: 'Bebidas' }),
    tx('2026-10-01', -30_000, { categoryId: 'c', categoryName: 'Comida' }),
  ]);

  assert.deepEqual(result.rows.map((row) => row.categoryId), ['c', 'b', 'a']);
});

test('amounts with cents are added without floating point drift', () => {
  const result = compare([tx('2026-10-01', -0.1), tx('2026-10-02', -0.2)]);
  assert.equal(result.rows[0].currentAmount, 0.3);
});

test('AC-8: builds one comparison per currency, default currency first, without mixing amounts', () => {
  const housing = { categoryId: 'housing', categoryName: 'Vivienda', categorySlug: 'housing' };
  const comparisons = compareCategorySpendingByCurrency({
    transactions: [
      tx('2026-10-01', -1_500_000, housing),
      tx('2026-10-02', -300, { ...housing, accountId: 'usd' }),
    ],
    accounts,
    primaryCurrency: Currency.COP,
    now: OCTOBER_15,
  });

  assert.deepEqual(comparisons.map((comparison) => comparison.currency), [Currency.COP, Currency.USD]);
  assert.deepEqual(comparisons.map((comparison) => comparison.rows[0].currentAmount), [1_500_000, 300]);
});

test('AC-8: the default currency is always shown and currencies without spending are omitted', () => {
  const comparisons = compareCategorySpendingByCurrency({
    transactions: [tx('2026-10-02', -300, { accountId: 'usd' })],
    accounts,
    primaryCurrency: Currency.USD,
    now: OCTOBER_15,
  });
  assert.deepEqual(comparisons.map((comparison) => comparison.currency), [Currency.USD]);

  const empty = compareCategorySpendingByCurrency({
    transactions: [],
    accounts,
    primaryCurrency: Currency.COP,
    now: OCTOBER_15,
  });
  assert.deepEqual(empty.map((comparison) => [comparison.currency, comparison.rows.length]), [[Currency.COP, 0]]);
});
