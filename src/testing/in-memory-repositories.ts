import { configureRepositories, type Repositories } from '@/infrastructure/repositories';
import type { Account } from '@/modules/accounts/domain/account.types';
import type { Budget, BudgetCycle } from '@/modules/budgets/domain/budget.types';
import type { ExpenseCategory } from '@/modules/categories/domain/category.types';
import type { Tag } from '@/modules/tags/domain/tag.types';
import { InMemoryAccountsRepository } from './in-memory-accounts.repository';
import { InMemoryBudgetsRepository } from './in-memory-budgets.repository';
import { InMemoryCategoriesRepository } from './in-memory-categories.repository';
import { InMemoryTransactionsRepository } from './in-memory-transactions.repository';
import { unimplemented } from './unimplemented';

export type InMemorySeed = {
  accounts?: Account[];
  budgets?: Budget[];
  budgetCycles?: BudgetCycle[];
  categories?: ExpenseCategory[];
  tags?: Tag[];
};

/**
 * Wires in-memory repositories into the composition root so use cases can be
 * tested without Supabase. Returns the repositories to seed and inspect them.
 */
export function setupInMemoryRepositories(seed: InMemorySeed = {}) {
  const repositories = {
    accounts: new InMemoryAccountsRepository(seed.accounts),
    budgets: new InMemoryBudgetsRepository(seed.budgets, seed.budgetCycles),
    categories: new InMemoryCategoriesRepository(seed.categories),
    transactions: new InMemoryTransactionsRepository(seed.tags),
  };

  configureRepositories({
    ...repositories,
    auth: unimplemented('auth'),
    feedback: unimplemented('feedback'),
    payrollDocuments: unimplemented('payrollDocuments'),
    payslipParser: unimplemented('payslipParser'),
    plans: unimplemented('plans'),
    profile: unimplemented('profile'),
    tags: unimplemented('tags'),
  } satisfies Repositories);

  return repositories;
}
