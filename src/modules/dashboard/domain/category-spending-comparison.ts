import type { Account } from '@/modules/accounts/domain/account.types';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import type { Currency } from '@/shared/domain/currency.enum';
import { toIsoDate } from '@/shared/lib/formatters';

const UNCATEGORIZED_LABEL = 'Sin categoría';
const CENTS = 100;

export type CategorySpendingComparisonRow = {
  /** `null` groups transactions without a category. */
  categoryId: string | null;
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  /** current − previous: positive means more spending. */
  difference: number;
  /** Change against the previous month; `null` when the previous month had no positive spending. */
  percentChange: number | null;
};

export type CategorySpendingComparison = {
  /** YYYY-MM of the current month (month to date). */
  currentMonth: string;
  /** YYYY-MM of the whole previous calendar month. */
  previousMonth: string;
  rows: CategorySpendingComparisonRow[];
};

type CategoryTotals = {
  categoryId: string | null;
  categoryName: string;
  currentCents: number;
  previousCents: number;
};

function toCents(amount: number) {
  return Math.round(amount * CENTS);
}

/**
 * Net spending in cents: expenses add their absolute value and refunds subtract theirs.
 * Income and transfers are not spending.
 */
function spendingCents(transaction: Transaction): number {
  if (transaction.transferId) return 0;
  if (transaction.kind === TransactionKind.Refund) return -toCents(transaction.amount);
  return transaction.amount < 0 ? toCents(-transaction.amount) : 0;
}

/**
 * Compares net spending per category between the current calendar month and the
 * previous one, for one currency. See specs/001-category-spending-comparison.
 */
export function compareCategorySpending(params: {
  transactions: Transaction[];
  accounts: Account[];
  currency: Currency;
  now: Date;
}): CategorySpendingComparison {
  const { transactions, accounts, currency, now } = params;
  const currentMonth = toIsoDate(now).slice(0, 7);
  const previousMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const accountCurrency = new Map(accounts.map((account) => [account.id, account.currency]));
  const totals = new Map<string, CategoryTotals>();

  for (const transaction of transactions) {
    if (accountCurrency.get(transaction.accountId) !== currency) continue;

    const month = transaction.date.slice(0, 7);
    if (month !== currentMonth && month !== previousMonth) continue;

    const cents = spendingCents(transaction);
    if (cents === 0) continue;

    const key = transaction.categoryId ?? '';
    const entry = totals.get(key) ?? {
      categoryId: transaction.categoryId,
      categoryName: transaction.categoryId
        ? transaction.categoryName ?? UNCATEGORIZED_LABEL
        : UNCATEGORIZED_LABEL,
      currentCents: 0,
      previousCents: 0,
    };
    if (month === currentMonth) entry.currentCents += cents;
    else entry.previousCents += cents;
    totals.set(key, entry);
  }

  const rows = Array.from(totals.values())
    .filter((entry) => entry.currentCents !== 0 || entry.previousCents !== 0)
    .map((entry): CategorySpendingComparisonRow => {
      const differenceCents = entry.currentCents - entry.previousCents;
      return {
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        currentAmount: entry.currentCents / CENTS,
        previousAmount: entry.previousCents / CENTS,
        difference: differenceCents / CENTS,
        percentChange: entry.previousCents > 0 ? (differenceCents / entry.previousCents) * 100 : null,
      };
    })
    .sort((a, b) =>
      b.currentAmount - a.currentAmount ||
      b.previousAmount - a.previousAmount ||
      a.categoryName.localeCompare(b.categoryName),
    );

  return { currentMonth, previousMonth, rows };
}
