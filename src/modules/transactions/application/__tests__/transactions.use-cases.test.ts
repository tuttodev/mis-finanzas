import assert from 'node:assert/strict';
import test from 'node:test';
import { Currency } from '@/shared/domain/currency.enum';
import { anAccount } from '@/testing/fixtures';
import { setupInMemoryRepositories } from '@/testing/in-memory-repositories';
import { TransactionKind } from '../../domain/transaction-kind.enum';
import { TransactionType } from '../../domain/transaction-type.enum';
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  getRefundedAmount,
  getTransaction,
} from '../transactions.use-cases';

const budget = { id: 'groceries', name: 'Mercado', currency: Currency.COP, limitAmount: 500_000, isActive: true };
const openCycle = { id: 'cycle-oct', budgetId: 'groceries', startedAt: '2026-10-01T05:00:00.000Z', endedAt: null };

test('an expense with a budget is assigned to the budget open cycle', async () => {
  const repos = setupInMemoryRepositories({ budgets: [budget], budgetCycles: [openCycle] });

  const created = await createTransaction({
    account: anAccount(),
    amount: 150_000,
    description: 'Mercado',
    type: TransactionType.Expense,
    date: '2026-10-05',
    budgetId: 'groceries',
    categoryId: 'food',
    isPlanned: false,
    tagIds: [],
  });

  assert.equal(created.amount, -150_000);
  assert.equal(repos.transactions.transactions[0].budgetCycleId, 'cycle-oct');
});

test('income ignores the budget', async () => {
  const repos = setupInMemoryRepositories({ budgets: [budget], budgetCycles: [openCycle] });

  await createTransaction({
    account: anAccount(),
    amount: 2_000_000,
    description: 'Salario',
    type: TransactionType.Income,
    date: '2026-10-01',
    budgetId: 'groceries',
    isPlanned: false,
    tagIds: [],
  });

  assert.equal(repos.transactions.transactions[0].budgetCycleId, null);
});

test('a transfer creates two opposite movements and deleting one side removes both', async () => {
  const repos = setupInMemoryRepositories();

  await createTransfer({
    fromAccount: anAccount({ id: 'a' }),
    toAccount: anAccount({ id: 'b' }),
    amount: 300_000,
    date: '2026-10-03',
    description: 'Ahorro',
  });

  const [first, second] = repos.transactions.transactions;
  assert.equal(first.transferId, second.transferId);
  assert.deepEqual([first.amount, second.amount].sort((x, y) => x - y), [-300_000, 300_000]);

  await deleteTransaction(first.id);
  assert.equal(repos.transactions.transactions.length, 0);
});

test('a transfer between currencies is rejected before saving anything', async () => {
  const repos = setupInMemoryRepositories();

  await assert.rejects(createTransfer({
    fromAccount: anAccount({ id: 'a' }),
    toAccount: anAccount({ id: 'b', currency: Currency.USD }),
    amount: 10,
    date: '2026-10-03',
    description: 'Cambio',
  }), /misma moneda/);
  assert.equal(repos.transactions.transactions.length, 0);
});

test('a transaction in a budget cycle exposes its budget and whether the cycle is closed', async () => {
  const repos = setupInMemoryRepositories({ budgets: [budget], budgetCycles: [openCycle] });
  const [expense] = repos.transactions.seed([
    { accountId: 'savings-cop', budgetCycleId: 'cycle-oct', date: '2026-10-05', description: 'Mercado', amount: -100 },
  ]);
  repos.transactions.seed([
    { accountId: 'savings-cop', date: '2026-10-06', description: 'Reembolso', amount: 30, kind: TransactionKind.Refund, relatedTransactionId: expense.id },
  ]);

  const detail = await getTransaction(expense.id);
  assert.equal(detail.budgetId, 'groceries');
  assert.equal(detail.budgetCycleEndedAt, null);
  assert.equal(await getRefundedAmount(expense.id), 30);
});
