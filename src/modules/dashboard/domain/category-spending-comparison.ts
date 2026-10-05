import type { Account } from '@/modules/accounts/domain/account.types';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { Currency } from '@/shared/domain/currency.enum';
import { toIsoDate } from '@/shared/lib/formatters';

const UNCATEGORIZED_LABEL = 'Sin categoría';
const CENTS = 100;

/** One currency line inside a category row. Amounts are never mixed across currencies. */
export type CategoryCurrencySpending = {
  currency: Currency;
  currentAmount: number;
  previousAmount: number;
  /** current − previous: positive means more spending. */
  difference: number;
  /** Change against the previous month; `null` when the previous month had no positive spending. */
  percentChange: number | null;
};

export type CategorySpendingComparisonRow = {
  /** `null` groups transactions without a category. */
  categoryId: string | null;
  categoryName: string;
  /** Primary currency first, then the rest in `Currency` order. Only currencies with spending in either month. */
  amounts: CategoryCurrencySpending[];
};

export type CategorySpendingComparison = {
  /** YYYY-MM of the current month (month to date). */
  currentMonth: string;
  /** YYYY-MM of the whole previous calendar month. */
  previousMonth: string;
  /** Currencies present in the comparison, primary currency first. */
  currencies: Currency[];
  rows: CategorySpendingComparisonRow[];
};

type MonthCents = { currentCents: number; previousCents: number };

type CategoryTotals = {
  categoryId: string | null;
  categoryName: string;
  byCurrency: Map<Currency, MonthCents>;
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

function toCurrencySpending(currency: Currency, cents: MonthCents): CategoryCurrencySpending {
  const differenceCents = cents.currentCents - cents.previousCents;
  return {
    currency,
    currentAmount: cents.currentCents / CENTS,
    previousAmount: cents.previousCents / CENTS,
    difference: differenceCents / CENTS,
    percentChange: cents.previousCents > 0 ? (differenceCents / cents.previousCents) * 100 : null,
  };
}

/**
 * Compares net spending per category between the current calendar month and the
 * previous one. Each category has one line per currency; currencies are never added
 * together. See specs/001-category-spending-comparison.
 */
export function compareCategorySpending(params: {
  transactions: Transaction[];
  accounts: Account[];
  primaryCurrency: Currency;
  now: Date;
}): CategorySpendingComparison {
  const { transactions, accounts, primaryCurrency, now } = params;
  const currentMonth = toIsoDate(now).slice(0, 7);
  const previousMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const accountCurrency = new Map(accounts.map((account) => [account.id, account.currency]));
  const currencyOrder = [primaryCurrency, ...Object.values(Currency).filter((currency) => currency !== primaryCurrency)];
  const totals = new Map<string, CategoryTotals>();

  for (const transaction of transactions) {
    const currency = accountCurrency.get(transaction.accountId);
    if (!currency) continue;

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
      byCurrency: new Map<Currency, MonthCents>(),
    };
    const monthCents = entry.byCurrency.get(currency) ?? { currentCents: 0, previousCents: 0 };
    if (month === currentMonth) monthCents.currentCents += cents;
    else monthCents.previousCents += cents;
    entry.byCurrency.set(currency, monthCents);
    totals.set(key, entry);
  }

  const rows = Array.from(totals.values())
    .map((entry): CategorySpendingComparisonRow => ({
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      amounts: currencyOrder.flatMap((currency) => {
        const cents = entry.byCurrency.get(currency);
        if (!cents || (cents.currentCents === 0 && cents.previousCents === 0)) return [];
        return [toCurrencySpending(currency, cents)];
      }),
    }))
    .filter((row) => row.amounts.length > 0);

  const primaryAmount = (row: CategorySpendingComparisonRow) =>
    row.amounts.find((amount) => amount.currency === primaryCurrency);

  rows.sort((a, b) =>
    (primaryAmount(b)?.currentAmount ?? 0) - (primaryAmount(a)?.currentAmount ?? 0) ||
    (primaryAmount(b)?.previousAmount ?? 0) - (primaryAmount(a)?.previousAmount ?? 0) ||
    a.categoryName.localeCompare(b.categoryName),
  );

  const present = new Set(rows.flatMap((row) => row.amounts.map((amount) => amount.currency)));
  const currencies = currencyOrder.filter((currency) => currency === primaryCurrency || present.has(currency));

  return { currentMonth, previousMonth, currencies, rows };
}
