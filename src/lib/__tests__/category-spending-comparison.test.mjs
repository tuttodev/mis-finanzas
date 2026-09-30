import assert from 'node:assert/strict';
import test from 'node:test';
import { compareCategorySpending } from '../category-spending-comparison.ts';

const accounts = new Map([
  ['cop', { currency: 'COP' }],
  ['usd', { currency: 'USD' }],
]);
const categories = new Map([
  ['food', { name: 'Food' }],
  ['rent', { name: 'Rent' }],
  ['travel', { name: 'Travel' }],
]);

function transaction(date, amount, categoryId, extra = {}) {
  return {
    account_id: 'cop',
    category_id: categoryId,
    date,
    amount,
    kind: 'regular',
    transfer_id: null,
    ...extra,
  };
}

test('compares consecutive calendar months using net spending in COP', () => {
  const result = compareCategorySpending([
    transaction('2026-09-05', -150, 'food'),
    transaction('2026-09-10', 30, 'food', { kind: 'refund' }),
    transaction('2026-10-05', -200, 'food'),
    transaction('2026-10-10', 50, 'food', { kind: 'refund' }),
    transaction('2026-10-11', -500, 'rent'),
    transaction('2026-09-12', -80, 'travel'),
    transaction('2026-10-12', -999, 'food', { transfer_id: 'transfer' }),
    transaction('2026-10-13', -999, 'food', { account_id: 'usd' }),
    transaction('2026-10-14', 999, 'food'),
    transaction('2026-08-14', -999, 'food'),
  ], accounts, categories, 'COP', new Date(2026, 9, 15), 'Uncategorized');

  assert.equal(result.currentMonth, '2026-10');
  assert.equal(result.previousMonth, '2026-09');
  assert.deepEqual(result.rows.find((row) => row.categoryId === 'food'), {
    categoryId: 'food', categoryName: 'Food', currentAmount: 150,
    previousAmount: 120, difference: 30, percentChange: 25,
  });
  assert.deepEqual(result.rows.find((row) => row.categoryId === 'rent'), {
    categoryId: 'rent', categoryName: 'Rent', currentAmount: 500,
    previousAmount: 0, difference: 500, percentChange: null,
  });
  assert.deepEqual(result.rows.find((row) => row.categoryId === 'travel'), {
    categoryId: 'travel', categoryName: 'Travel', currentAmount: 0,
    previousAmount: 80, difference: -80, percentChange: -100,
  });
});

test('crosses the year boundary and keeps uncategorized refunds and negative net totals', () => {
  const result = compareCategorySpending([
    transaction('2025-12-01', -10.1, null),
    transaction('2026-01-01', -1.2, null),
    transaction('2026-01-02', 2.4, null, { kind: 'refund' }),
  ], accounts, categories, 'COP', new Date(2026, 0, 15), 'Uncategorized');

  assert.equal(result.previousMonth, '2025-12');
  assert.deepEqual(result.rows, [{
    categoryId: null, categoryName: 'Uncategorized', currentAmount: -1.2,
    previousAmount: 10.1, difference: -11.3,
    percentChange: (-1130 / 1010) * 100,
  }]);
});

test('does not invent a percentage for zero or negative previous spending', () => {
  const result = compareCategorySpending([
    transaction('2026-09-02', -20, 'food'),
    transaction('2026-09-03', 20, 'food', { kind: 'refund' }),
    transaction('2026-10-02', -5, 'food'),
    transaction('2026-09-04', 10, 'travel', { kind: 'refund' }),
    transaction('2026-10-04', -3, 'travel'),
  ], accounts, categories, 'COP', new Date(2026, 9, 15), 'Uncategorized');

  assert.equal(result.rows.find((row) => row.categoryId === 'food')?.percentChange, null);
  assert.equal(result.rows.find((row) => row.categoryId === 'travel')?.percentChange, null);
});

test('returns an empty comparison when both months have no spending', () => {
  const result = compareCategorySpending([
    transaction('2026-08-01', -10, 'food'),
    transaction('2026-10-01', -10, 'food', { account_id: 'usd' }),
  ], accounts, categories, 'COP', new Date(2026, 9, 15), 'Uncategorized');

  assert.deepEqual(result.rows, []);
});

test('keeps separate category IDs even when their display names match', () => {
  const sameNames = new Map([
    ['first', { name: 'Other' }],
    ['second', { name: 'Other' }],
  ]);
  const result = compareCategorySpending([
    transaction('2026-10-01', -10, 'first'),
    transaction('2026-10-02', -20, 'second'),
  ], accounts, sameNames, 'COP', new Date(2026, 9, 15), 'Uncategorized');

  assert.equal(result.rows.length, 2);
  assert.deepEqual(new Set(result.rows.map((row) => row.categoryId)), new Set(['first', 'second']));
});
