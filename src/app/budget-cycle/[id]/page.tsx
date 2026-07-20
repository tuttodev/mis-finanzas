'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetMovementRow } from '@/components/finance/budget-movement-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatCOP, formatPercent, formatShortDate } from '@/lib/formatters';
import { fetchBudgetSnapshotDetail } from '@/services/finance';

export default function BudgetCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const detailQuery = useQuery({
    queryKey: ['budget-cycle', id],
    queryFn: () => fetchBudgetSnapshotDetail(id),
    enabled: Boolean(id),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message={detailQuery.error?.message ?? 'No se pudo cargar el ciclo'} />
      </div>
    );
  }

  const { snapshot, movements } = detailQuery.data;
  const over = snapshot.percentage > 100;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Ciclo cerrado"
        subtitle={`${formatShortDate(snapshot.startedAt)} – ${formatShortDate(snapshot.endedAt)}`}
        backHref="/budgets"
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Gastado en el ciclo</p>
          <p className="tabular mt-1 font-display text-3xl font-bold">
            {formatCOP(snapshot.spentAmount)}
            <span className="text-base font-medium text-muted-foreground">
              {' '}
              / {formatCOP(snapshot.limitAmount)}
            </span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${over ? 'bg-expense' : 'bg-income'}`}
              style={{ width: `${Math.min(snapshot.percentage, 100)}%` }}
            />
          </div>
          <p
            className={`tabular mt-2 text-sm font-medium ${
              over ? 'text-expense' : 'text-muted-foreground'
            }`}
          >
            {formatPercent(snapshot.percentage)} del límite
          </p>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Movimientos</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {movements.length ? (
              <div className="divide-y divide-border">
                {movements.map((movement) => (
                  <BudgetMovementRow key={movement.id} movement={movement} />
                ))}
              </div>
            ) : (
              <div className="py-3">
                <EmptyState
                  title="Sin movimientos"
                  description="No hubo movimientos asociados a este ciclo."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
