import assert from 'node:assert/strict';
import test from 'node:test';
import { getGroupPlannedAmount, summarizePlan } from '../plan-summary.ts';

const plan = { id: 'plan', month: '2026-09', payday: null };

function item(id, kind, amount, parentItemId = null) {
  return {
    id, planId: plan.id, name: id, kind, plannedAmount: amount, parentItemId,
    actualAmount: null, note: null, isPaid: false, budgetId: null, categoryId: null,
    tagIds: [], sortOrder: 0,
  };
}

test('grouping expense items changes presentation without changing the remaining balance', () => {
  const income = item('salary', 'income', 1000);
  const deduction = item('health', 'deduction', 50);
  const unrelated = item('rent', 'expense', 500);
  const first = item('icloud', 'expense', 100);
  const second = item('netflix', 'expense', 200);
  const before = summarizePlan(plan, [income, deduction, unrelated, first, second]);

  const group = item('tc-nu', 'group', 0);
  const grouped = summarizePlan(plan, [income, deduction, unrelated, group, { ...first, parentItemId: group.id }, { ...second, parentItemId: group.id }]);

  assert.equal(getGroupPlannedAmount(grouped.items, group.id), 300);
  assert.equal(grouped.expenseTotal, 800);
  assert.equal(grouped.leftover, 150);
  assert.equal(grouped.expenseTotal, before.expenseTotal);
  assert.equal(grouped.leftover, before.leftover);
});

test('removing a child from a group updates the parent amount and preserves the plan total', () => {
  const group = item('tc-nu', 'group', 0);
  const first = item('icloud', 'expense', 100, group.id);
  const second = item('netflix', 'expense', 200);
  const summary = summarizePlan(plan, [group, first, second]);

  assert.equal(getGroupPlannedAmount(summary.items, group.id), 100);
  assert.equal(summary.expenseTotal, 300);
  assert.equal(summary.leftover, -300);
});
