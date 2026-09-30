import type { Currency, TransactionDTO } from '@/types/finance';

type SpendingTransaction = Pick<
  TransactionDTO,
  'account_id' | 'category_id' | 'date' | 'amount' | 'kind' | 'transfer_id'
>;

export type CategorySpendingComparisonRow = {
  categoryId: string | null;
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  difference: number;
  percentChange: number | null;
};

export type CategorySpendingComparison = {
  currentMonth: string;
  previousMonth: string;
  rows: CategorySpendingComparisonRow[];
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function compareCategorySpending(
  transactions: readonly SpendingTransaction[],
  accountsById: ReadonlyMap<string, { currency: Currency }>,
  categoryNamesById: ReadonlyMap<string, { name: string }>,
  currency: Currency,
  today: Date,
  uncategorizedName: string,
): CategorySpendingComparison {
  const currentMonth = monthKey(today);
  const previousMonth = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const totals = new Map<string | null, { currentCents: number; previousCents: number }>();

  for (const transaction of transactions) {
    if (accountsById.get(transaction.account_id)?.currency !== currency) continue;
    if (transaction.transfer_id) continue;

    const transactionMonth = transaction.date.slice(0, 7);
    if (transactionMonth !== currentMonth && transactionMonth !== previousMonth) continue;

    const cents = Math.round(Math.abs(transaction.amount) * 100);
    const spendingCents = transaction.kind === 'refund'
      ? -cents
      : transaction.amount < 0 ? cents : 0;
    if (spendingCents === 0) continue;

    const categoryId = transaction.category_id ?? null;
    const total = totals.get(categoryId) ?? { currentCents: 0, previousCents: 0 };
    if (transactionMonth === currentMonth) total.currentCents += spendingCents;
    else total.previousCents += spendingCents;
    totals.set(categoryId, total);
  }

  const rows = Array.from(totals, ([categoryId, total]) => {
    const differenceCents = total.currentCents - total.previousCents;
    return {
      categoryId,
      categoryName: categoryId
        ? categoryNamesById.get(categoryId)?.name ?? uncategorizedName
        : uncategorizedName,
      currentAmount: total.currentCents / 100,
      previousAmount: total.previousCents / 100,
      difference: differenceCents / 100,
      percentChange: total.previousCents > 0
        ? (differenceCents / total.previousCents) * 100
        : null,
    };
  })
    .filter((row) => row.currentAmount !== 0 || row.previousAmount !== 0)
    .sort((a, b) =>
      Math.max(Math.abs(b.currentAmount), Math.abs(b.previousAmount))
      - Math.max(Math.abs(a.currentAmount), Math.abs(a.previousAmount))
      || a.categoryName.localeCompare(b.categoryName),
    );

  return { currentMonth, previousMonth, rows };
}
