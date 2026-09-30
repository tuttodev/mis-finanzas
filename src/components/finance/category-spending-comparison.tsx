import { formatCurrency } from '@/lib/formatters';
import type { CategorySpendingComparison as Comparison } from '@/lib/category-spending-comparison';
import type { Currency } from '@/types/finance';

type Props = {
  comparison: Comparison;
  currency: Currency;
  hidden?: boolean;
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  signDisplay: 'always',
});

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

export function CategorySpendingComparison({ comparison, currency, hidden = false }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">Category spending compared</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatMonth(comparison.currentMonth)} vs {formatMonth(comparison.previousMonth)} · {currency}
      </p>
      {comparison.rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No category spending in either month.
        </p>
      ) : (
        <div className="space-y-2">
          {comparison.rows.map((row) => (
            <div key={row.categoryId ?? 'uncategorized'} className="rounded-xl bg-secondary/60 p-3">
              <h3 className="mb-2 text-sm font-medium">{row.categoryName}</h3>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Current</dt>
                  <dd className="tabular break-words font-semibold">
                    {hidden ? '••••••' : formatCurrency(row.currentAmount, currency)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Previous</dt>
                  <dd className="tabular break-words font-semibold">
                    {hidden ? '••••••' : formatCurrency(row.previousAmount, currency)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Difference</dt>
                  <dd className={`tabular break-words font-semibold ${
                    row.difference > 0 ? 'text-expense' : row.difference < 0 ? 'text-income' : ''
                  }`}>
                    {hidden ? '••••••' : (
                      `${row.difference > 0 ? '+' : ''}${formatCurrency(row.difference, currency)}`
                    )}
                  </dd>
                </div>
              </dl>
              {!hidden && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.percentChange === null
                    ? 'Percentage unavailable when previous spending is zero or negative.'
                    : `${percentFormatter.format(row.percentChange)}% vs previous month`}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
