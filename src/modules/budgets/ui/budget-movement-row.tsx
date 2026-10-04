import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { formatCurrency, formatShortDate } from '@/shared/lib/formatters';
import type { BudgetMovement } from '@/modules/budgets/domain/budget.types';
import { Currency } from '@/shared/domain/currency.enum';

import { CategoryBadge } from '@/modules/categories/ui/category-badge';
import { RefundBadge } from '@/modules/transactions/ui/refund-badge';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';

export function BudgetMovementRow({
  movement,
  href,
  currency,
}: {
  movement: BudgetMovement;
  href?: string;
  currency: Currency;
}) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{movement.description}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          {movement.categoryName && <CategoryBadge name={movement.categoryName} />}
          {movement.kind === TransactionKind.Refund && <RefundBadge />}
          <span>
            {movement.accountName} · {formatShortDate(movement.date)}
          </span>
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <span
          className={`tabular text-[15px] font-semibold ${
            movement.kind === TransactionKind.Refund ? 'text-income' : 'text-expense'
          }`}
        >
          {movement.kind === TransactionKind.Refund ? '+' : '−'}
          {formatCurrency(Math.abs(movement.amount), currency)}
        </span>
        {href && <Pencil className="h-4 w-4 text-muted-foreground" />}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`Editar ${movement.description}`}
        className="flex items-center justify-between gap-3 rounded-lg py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center justify-between gap-3 py-2.5">{content}</div>;
}
