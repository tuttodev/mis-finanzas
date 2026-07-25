import Link from 'next/link';
import { Circle, CircleCheck } from 'lucide-react';
import { formatCOP } from '@/lib/formatters';
import type { PlanItem } from '@/types/finance';

type PlanItemRowProps = {
  item: PlanItem;
  onTogglePaid: (item: PlanItem) => void;
  togglePending?: boolean;
};

export function PlanItemRow({ item, onTogglePaid, togglePending }: PlanItemRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      {item.kind === 'expense' ? (
        <button
          type="button"
          aria-label={item.isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
          onClick={() => onTogglePaid(item)}
          disabled={togglePending}
          className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
        >
          {item.isPaid ? (
            <CircleCheck className="h-5 w-5 text-income" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      ) : (
        <span className="w-7 shrink-0" />
      )}

      <Link
        href={`/plan-item-form?planId=${item.planId}&id=${item.id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-secondary/50"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="break-words text-[15px] font-medium leading-snug">{item.name}</span>
          {item.note && <span className="text-[12px] text-muted-foreground">{item.note}</span>}
        </div>
        <span
          className={`tabular shrink-0 text-[15px] font-semibold ${
            item.kind === 'income' ? 'text-income' : 'text-foreground'
          }`}
        >
          {formatCOP(item.plannedAmount)}
        </span>
      </Link>
    </div>
  );
}
