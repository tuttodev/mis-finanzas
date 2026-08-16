'use client';

import Link from 'next/link';
import { Circle, CircleCheck, GripVertical, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCOP } from '@/lib/formatters';
import type { PlanItem } from '@/types/finance';

type PlanItemRowProps = {
  item: PlanItem;
  onTogglePaid: (item: PlanItem) => void;
  togglePending?: boolean;
};

export function PlanItemRow({ item, onTogglePaid, togglePending }: PlanItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 py-1 ${isDragging ? 'relative z-10 bg-card' : ''}`}
    >
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        className="shrink-0 touch-none p-1 text-muted-foreground/50 hover:text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

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

      {item.kind === 'expense' && (
        <Link
          href={`/transaction/new?planItemId=${item.id}`}
          aria-label={`Agregar gasto a ${item.name}`}
          title="Agregar gasto"
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden min-[380px]:inline">Gasto</span>
        </Link>
      )}
    </div>
  );
}
