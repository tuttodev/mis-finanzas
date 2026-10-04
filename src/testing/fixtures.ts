import { AccountType } from '@/modules/accounts/domain/account-type.enum';
import type { Account } from '@/modules/accounts/domain/account.types';
import { CategorySlug } from '@/modules/categories/domain/category-slug.enum';
import type { ExpenseCategory } from '@/modules/categories/domain/category.types';
import { TransactionType } from '@/modules/transactions/domain/transaction-type.enum';
import { Currency } from '@/shared/domain/currency.enum';

/** Fictional test data. Never copy real account names, balances or transactions into tests. */
export function anAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'savings-cop',
    name: 'Ahorros',
    type: AccountType.Savings,
    currency: Currency.COP,
    currentBalance: 0,
    debtAmount: 0,
    ...overrides,
  };
}

export function aCategory(overrides: Partial<ExpenseCategory> = {}): ExpenseCategory {
  return {
    id: 'food',
    slug: CategorySlug.Food,
    name: 'Comida',
    transactionType: TransactionType.Expense,
    isSystem: true,
    hasTransactions: false,
    ...overrides,
  };
}
