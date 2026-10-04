import assert from 'node:assert/strict';
import test from 'node:test';
import { Currency } from '@/shared/domain/currency.enum';
import { setupInMemoryRepositories } from '@/testing/in-memory-repositories';
import { createBudget, listBudgetProgress, resetBudget } from '../budgets.use-cases';

test('a new budget starts with an open cycle and no spending', async () => {
  setupInMemoryRepositories();

  await createBudget({ name: 'Mercado', currency: Currency.COP, limitAmount: 400_000, startedAt: '2026-10-01' });

  const [progress] = await listBudgetProgress(Currency.COP);
  assert.equal(progress.budget.name, 'Mercado');
  assert.equal(progress.spentAmount, 0);
  assert.equal(progress.remainingAmount, 400_000);
});

test('progress only lists budgets of the requested currency', async () => {
  setupInMemoryRepositories();
  await createBudget({ name: 'Mercado', currency: Currency.COP, limitAmount: 400_000 });
  await createBudget({ name: 'Viajes', currency: Currency.USD, limitAmount: 1_000 });

  assert.deepEqual((await listBudgetProgress(Currency.USD)).map((item) => item.budget.name), ['Viajes']);
  assert.equal((await listBudgetProgress()).length, 2);
});

test('resetting a budget closes the cycle with a snapshot and opens a new one', async () => {
  const repos = setupInMemoryRepositories();
  const budget = await createBudget({ name: 'Mercado', currency: Currency.COP, limitAmount: 400_000 });
  const cycle = await repos.budgets.getOpenCycle(budget.id);
  repos.transactions.seed([
    { accountId: 'a', budgetCycleId: cycle!.id, date: '2026-10-05', description: 'Mercado', amount: -150_000 },
  ]);

  const [progress] = await listBudgetProgress(Currency.COP);
  await resetBudget(progress, '2026-11-01');

  const [closed] = await repos.budgets.listClosedCycles(budget.id);
  assert.equal(closed.snapshotSpentAmount, 150_000);
  assert.equal(closed.snapshotLimitAmount, 400_000);
  assert.notEqual((await repos.budgets.getOpenCycle(budget.id))?.id, cycle!.id);
});
