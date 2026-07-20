import Link from 'next/link';
import { formatCOP, formatPercent } from '@/lib/formatters';
import type { BudgetProgress } from '@/types/finance';

export function BudgetProgressRow({ progress }: { progress: BudgetProgress }) {
  const overBudget = progress.progress > 1;
  const nearLimit = !overBudget && progress.progress >= 0.85;
  const barColor = overBudget
    ? 'bg-expense'
    : nearLimit
      ? 'bg-primary'
      : 'bg-income';

  return (
    <Link
      href={`/budget/${progress.budget.id}`}
      className="flex flex-col gap-2 rounded-xl px-1 py-2.5 transition-colors hover:bg-secondary/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[15px] font-semibold">{progress.budget.name}</span>
        <span
          className={`tabular shrink-0 text-[13px] font-medium ${
            overBudget ? 'text-expense' : 'text-muted-foreground'
          }`}
        >
          {formatPercent(progress.percentage)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(progress.progress, 1) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <span className="tabular">Gastado: {formatCOP(progress.spentAmount)}</span>
        <span className="tabular">
          {overBudget
            ? `Excedido: ${formatCOP(Math.abs(progress.remainingAmount))}`
            : `Disponible: ${formatCOP(progress.remainingAmount)}`}
        </span>
      </div>
    </Link>
  );
}
