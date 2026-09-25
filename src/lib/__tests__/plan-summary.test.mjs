import assert from 'node:assert/strict';
import test from 'node:test';
import { getGroupPlannedAmount, summarizePlan } from '../plan-summary.ts';

const plan = { id: 'plan', month: '2026-09', payday: null };
const sections = [
  { id: 'required', planId: plan.id, name: 'Obligatorios', sortOrder: 10 },
  { id: 'optional', planId: plan.id, name: 'Opcionales', sortOrder: 20 },
];

function item(id, kind, amount, parentItemId = null, sectionId = null) {
  return {
    id, planId: plan.id, name: id, kind, plannedAmount: amount, parentItemId, sectionId,
    actualAmount: null, note: null, isPaid: false, budgetId: null, categoryId: null,
    tagIds: [], sortOrder: 0,
  };
}

test('section totals include group children once and reconcile with the whole plan', () => {
  const income = item('salary', 'income', 1000);
  const deduction = item('health', 'deduction', 50);
  const required = item('rent', 'expense', 500, null, 'required');
  const group = item('tc-nu', 'group', 0, null, 'optional');
  const first = item('icloud', 'expense', 100, group.id);
  const second = item('netflix', 'expense', 200, group.id);
  const unassigned = item('other', 'expense', 50);
  const summary = summarizePlan(plan, [income, deduction, required, group, first, second, unassigned], sections);

  assert.equal(getGroupPlannedAmount(summary.items, group.id), 300);
  assert.equal(summary.sectionTotals.required, 500);
  assert.equal(summary.sectionTotals.optional, 300);
  assert.equal(summary.unassignedTotal, 50);
  assert.equal(summary.expenseTotal, 850);
  assert.equal(summary.leftover, 100);
  assert.equal(Object.values(summary.sectionTotals).reduce((sum, amount) => sum + amount, 0) + summary.unassignedTotal, summary.expenseTotal);
});

test('moving a group changes its section total without changing the leftover', () => {
  const group = item('tc-nu', 'group', 0, null, 'required');
  const first = item('icloud', 'expense', 100, group.id);
  const second = item('netflix', 'expense', 200, group.id);
  const before = summarizePlan(plan, [group, first, second], sections);
  const after = summarizePlan(plan, [{ ...group, sectionId: 'optional' }, first, second], sections);

  assert.equal(before.sectionTotals.required, 300);
  assert.equal(after.sectionTotals.optional, 300);
  assert.equal(after.expenseTotal, before.expenseTotal);
  assert.equal(after.leftover, before.leftover);
});

test('moving one child out of a group updates both section totals once', () => {
  const group = item('tc-nu', 'group', 0, null, 'required');
  const first = item('icloud', 'expense', 100, group.id);
  const second = item('netflix', 'expense', 200, null, 'optional');
  const summary = summarizePlan(plan, [group, first, second], sections);

  assert.equal(getGroupPlannedAmount(summary.items, group.id), 100);
  assert.equal(summary.sectionTotals.required, 100);
  assert.equal(summary.sectionTotals.optional, 200);
  assert.equal(summary.expenseTotal, 300);
});
