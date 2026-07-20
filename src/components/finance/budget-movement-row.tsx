import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { formatCOP, formatShortDate } from '@/lib/formatters';
import type { BudgetMovement } from '@/types/finance';

import { CategoryBadge } from './category-badge';

export function BudgetMovementRow({
  movement,
  href,
}: {
  movement: BudgetMovement;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{movement.description}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          {movement.categoryName && <CategoryBadge name={movement.categoryName} />}
          <span>
            {movement.accountName} · {formatShortDate(movement.date)}
          </span>
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-2">
        <span className="tabular text-[15px] font-semibold text-expense">
          −{formatCOP(movement.amount)}
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
