import assert from 'node:assert/strict';
import test from 'node:test';
import { Currency } from '@/shared/domain/currency.enum';
import { toIsoDate } from '@/shared/lib/formatters';
import { anAccount } from '@/testing/fixtures';
import { setupInMemoryRepositories } from '@/testing/in-memory-repositories';
import { getDashboard } from '../dashboard.use-cases';

test('the dashboard includes the category comparison for the selected currency', async () => {
  const repos = setupInMemoryRepositories({
    accounts: [anAccount({ id: 'cop' }), anAccount({ id: 'usd', currency: Currency.USD })],
  });
  const now = new Date();
  const thisMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  repos.transactions.seed([
    { accountId: 'cop', categoryId: 'food', date: thisMonth, description: 'Mercado', amount: -200_000 },
    { accountId: 'cop', categoryId: 'food', date: lastMonth, description: 'Mercado', amount: -100_000 },
    { accountId: 'usd', categoryId: 'food', date: thisMonth, description: 'Groceries', amount: -50 },
  ]);

  const dashboard = await getDashboard(Currency.COP);

  assert.equal(dashboard.categoryComparisons[0].rows.length, 1);
  assert.deepEqual(
    [dashboard.categoryComparisons[0].rows[0].currentAmount, dashboard.categoryComparisons[0].rows[0].previousAmount],
    [200_000, 100_000],
  );
});
