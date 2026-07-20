import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatCOP, formatPercent, formatShortDate } from '@/lib/formatters';
import type { BudgetSnapshot } from '@/types/finance';

export function BudgetSnapshotRow({ snapshot }: { snapshot: BudgetSnapshot }) {
  const over = snapshot.percentage > 100;

  return (
    <Link
      href={`/budget-cycle/${snapshot.id}`}
      className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-secondary/50"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">
          {formatShortDate(snapshot.startedAt)} – {formatShortDate(snapshot.endedAt)}
        </span>
        <span className="tabular text-[13px] text-muted-foreground">
          Gastado {formatCOP(snapshot.spentAmount)} de {formatCOP(snapshot.limitAmount)}
        </span>
      </div>
      <span
        className={`tabular shrink-0 text-[13px] font-semibold ${
          over ? 'text-expense' : 'text-income'
        }`}
      >
        {formatPercent(snapshot.percentage)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
