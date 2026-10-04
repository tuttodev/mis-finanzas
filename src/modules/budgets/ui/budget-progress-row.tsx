import Link from 'next/link';
import { formatCurrency, formatPercent } from '@/shared/lib/formatters';
import type { BudgetProgress } from '@/modules/budgets/domain/budget.types';
import { appRoutes } from '@/shared/navigation/app-routes';

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
      href={appRoutes.budget(progress.budget.id)}
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
        <span className="tabular">Gastado: {formatCurrency(progress.spentAmount, progress.budget.currency)}</span>
        <span className="tabular">
          {overBudget
            ? `Excedido: ${formatCurrency(Math.abs(progress.remainingAmount), progress.budget.currency)}`
            : `Disponible: ${formatCurrency(progress.remainingAmount, progress.budget.currency)}`}
        </span>
      </div>
    </Link>
  );
}
