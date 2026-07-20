import { formatCOP, formatShortDate } from '@/lib/formatters';
import type { BudgetMovement } from '@/types/finance';

export function BudgetMovementRow({ movement }: { movement: BudgetMovement }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{movement.description}</span>
        <span className="text-[13px] text-muted-foreground">
          {movement.accountName} · {formatShortDate(movement.date)}
        </span>
      </div>
      <span className="tabular shrink-0 text-[15px] font-semibold text-expense">
        −{formatCOP(movement.amount)}
      </span>
    </div>
  );
}
