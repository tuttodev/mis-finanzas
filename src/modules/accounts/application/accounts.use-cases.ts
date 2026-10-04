import { repositories } from '@/infrastructure/repositories';
import { CategorySlug } from '@/modules/categories/domain/category-slug.enum';
import { TransactionType } from '@/modules/transactions/domain/transaction-type.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { roundCurrencyAmount } from '@/shared/lib/formatters';
import type { Account, AdjustAccountBalanceInput, CreateAccountInput } from '../domain/account.types';

const ACCOUNT_NAME_MAX_LENGTH = 80;
const DEFAULT_ADJUSTMENT_DESCRIPTION = 'Ajuste de saldo';

export function listAccounts(): Promise<Account[]> {
  return repositories.accounts.list();
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    throw new Error('El nombre no puede superar 80 caracteres');
  }

  return repositories.accounts.create({ ...input, name });
}

/**
 * Records the difference between the current and the target balance as a transaction.
 * A decrease is an expense in the "other" category (or the first expense category).
 */
export async function adjustAccountBalance(input: AdjustAccountBalanceInput): Promise<Transaction> {
  const targetBalance = roundCurrencyAmount(input.targetBalance);
  const currentBalance = roundCurrencyAmount(input.account.currentBalance);
  const difference = roundCurrencyAmount(targetBalance - currentBalance);

  if (difference === 0) {
    throw new Error('El saldo ingresado es igual al saldo actual');
  }

  const description = input.description?.trim() || DEFAULT_ADJUSTMENT_DESCRIPTION;
  let categoryId: string | null = null;

  if (difference < 0) {
    const categories = await repositories.categories.list();
    const expenseCategory =
      categories.find((category) =>
        category.slug === CategorySlug.Other && category.transactionType === TransactionType.Expense,
      ) ||
      categories.find((category) => category.transactionType === TransactionType.Expense);

    if (!expenseCategory) {
      throw new Error('No se encontró una categoría de gastos para el ajuste');
    }
    categoryId = expenseCategory.id;
  }

  return repositories.transactions.create({
    accountId: input.account.id,
    date: input.date,
    description,
    amount: difference,
    budgetCycleId: null,
    categoryId,
    isPlanned: false,
  }, []);
}
