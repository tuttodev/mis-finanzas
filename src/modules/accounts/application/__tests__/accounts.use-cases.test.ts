import assert from 'node:assert/strict';
import test from 'node:test';
import { CategorySlug } from '@/modules/categories/domain/category-slug.enum';
import { aCategory, anAccount } from '@/testing/fixtures';
import { setupInMemoryRepositories } from '@/testing/in-memory-repositories';
import { AccountType } from '../../domain/account-type.enum';
import { Currency } from '@/shared/domain/currency.enum';
import { adjustAccountBalance, createAccount } from '../accounts.use-cases';

test('createAccount trims the name and rejects empty or long names', async () => {
  const repos = setupInMemoryRepositories();

  const account = await createAccount({ name: '  Nequi  ', type: AccountType.Savings, currency: Currency.COP });
  assert.equal(account.name, 'Nequi');
  assert.equal(repos.accounts.accounts.length, 1);

  await assert.rejects(createAccount({ name: '   ', type: AccountType.Cash, currency: Currency.COP }), /obligatorio/);
  await assert.rejects(
    createAccount({ name: 'x'.repeat(81), type: AccountType.Cash, currency: Currency.COP }),
    /80 caracteres/,
  );
});

test('adjustAccountBalance records an increase as income without category', async () => {
  const repos = setupInMemoryRepositories();

  await adjustAccountBalance({ account: anAccount({ currentBalance: 100 }), targetBalance: 150, date: '2026-10-01' });

  const [adjustment] = repos.transactions.transactions;
  assert.equal(adjustment.amount, 50);
  assert.equal(adjustment.categoryId, null);
  assert.equal(adjustment.description, 'Ajuste de saldo');
});

test('adjustAccountBalance records a decrease as an expense in the "other" category', async () => {
  const other = aCategory({ id: 'other', slug: CategorySlug.Other, name: 'Otros' });
  const repos = setupInMemoryRepositories({ categories: [aCategory(), other] });

  await adjustAccountBalance({ account: anAccount({ currentBalance: 100 }), targetBalance: 40, date: '2026-10-01' });

  const [adjustment] = repos.transactions.transactions;
  assert.equal(adjustment.amount, -60);
  assert.equal(adjustment.categoryId, 'other');
});

test('adjustAccountBalance rejects a target equal to the current balance', async () => {
  setupInMemoryRepositories();
  await assert.rejects(
    adjustAccountBalance({ account: anAccount({ currentBalance: 100 }), targetBalance: 100, date: '2026-10-01' }),
    /igual al saldo actual/,
  );
});
