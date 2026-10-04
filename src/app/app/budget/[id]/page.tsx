'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';
import { BudgetMovementRow } from '@/modules/budgets/ui/budget-movement-row';
import { BudgetSnapshotRow } from '@/modules/budgets/ui/budget-snapshot-row';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { HistoryBars } from '@/shared/ui/charts/history-bars';
import { formatCurrency, formatPercent, formatShortDate, todayIsoDate } from '@/shared/lib/formatters';
import { deactivateBudget, resetBudget } from '@/modules/budgets/application/budgets.use-cases';
import { AppRoute, SearchParam } from '@/shared/navigation/app-route.enum';
import { appRoutes, withSearchParams } from '@/shared/navigation/app-routes';
import { budgetQueries } from '@/modules/budgets/application/budgets.queries';
import { BudgetConfirmAction } from '@/modules/budgets/ui/budget-confirm-action.enum';

const cycleLabelFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
});

export default function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<BudgetConfirmAction | null>(null);
  const [restartDate, setRestartDate] = useState(todayIsoDate());

  const detailQuery = useQuery({
    ...budgetQueries.detail(id),
    enabled: Boolean(id),
  });

  const resetMutation = useMutation({
    mutationFn: (date: string) => {
      if (!detailQuery.data) throw new Error('No hay presupuesto cargado');
      return resetBudget(detailQuery.data.progress, date);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Ciclo reiniciado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deactivateBudget(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Presupuesto eliminado');
      router.replace(AppRoute.Budgets);
    },
    onError: (error: Error) => toast.error(error.message),
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
        <ErrorState
          message={detailQuery.error?.message ?? 'No se pudo cargar el presupuesto'}
        />
      </div>
    );
  }

  const detail = detailQuery.data;
  const { progress } = detail;
  const overBudget = progress.progress > 1;

  const historyData = [...detail.snapshots]
    .reverse()
    .slice(-8)
    .map((snapshot) => ({
      label: cycleLabelFormatter.format(new Date(snapshot.endedAt)).replace('.', ''),
      spent: snapshot.spentAmount,
      limit: snapshot.limitAmount,
    }));

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title={progress.budget.name} backHref={AppRoute.Budgets} />

      <div className="space-y-4">
        {/* Current cycle */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Ciclo desde {formatShortDate(progress.currentCycle.startedAt)}
            </p>
            <p
              className={`tabular text-sm font-semibold ${
                overBudget ? 'text-expense' : 'text-muted-foreground'
              }`}
            >
              {formatPercent(progress.percentage)}
            </p>
          </div>
          <p className="tabular mt-1 font-display text-3xl font-bold">
            {formatCurrency(progress.spentAmount, progress.budget.currency)}
            <span className="text-base font-medium text-muted-foreground">
              {' '}
              / {formatCurrency(progress.budget.limitAmount, progress.budget.currency)}
            </span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${overBudget ? 'bg-expense' : 'bg-income'}`}
              style={{ width: `${Math.min(progress.progress, 1) * 100}%` }}
            />
          </div>
          <p className="tabular mt-2 text-sm text-muted-foreground">
            {overBudget
              ? `Excedido por ${formatCurrency(Math.abs(progress.remainingAmount), progress.budget.currency)}`
              : `Disponible: ${formatCurrency(progress.remainingAmount, progress.budget.currency)}`}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={withSearchParams(AppRoute.BudgetForm, { [SearchParam.Id]: progress.budget.id })} />}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="secondary" onClick={() => setConfirmAction(BudgetConfirmAction.Reset)}>
              <RotateCcw className="h-4 w-4" />
              Resetear
            </Button>
            <Button variant="destructive" onClick={() => setConfirmAction(BudgetConfirmAction.Delete)}>
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>

        {/* Cycle history chart */}
        {historyData.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Ciclos anteriores</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Porcentaje gastado frente al límite de cada ciclo
            </p>
            <HistoryBars data={historyData} currency={progress.budget.currency} />
          </div>
        )}

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Movimientos del ciclo</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {detail.movements.length ? (
              <div className="divide-y divide-border">
                {detail.movements.map((movement) => (
                  <BudgetMovementRow
                    currency={progress.budget.currency}
                    key={movement.id}
                    movement={movement}
                    href={appRoutes.editTransaction(movement.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-3">
                <EmptyState
                  title="Sin movimientos"
                  description="No hay gastos asociados a este presupuesto en el ciclo actual."
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Historial</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {detail.snapshots.length ? (
              <div className="divide-y divide-border">
                {detail.snapshots.map((snapshot) => (
                  <BudgetSnapshotRow key={snapshot.id} snapshot={snapshot} currency={progress.budget.currency} />
                ))}
              </div>
            ) : (
              <div className="py-3">
                <EmptyState
                  title="Sin historial"
                  description="Aún no hay ciclos cerrados para este presupuesto."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === BudgetConfirmAction.Reset}
        title="Resetear presupuesto"
        description="Se guardará un snapshot del ciclo actual y empezará un ciclo nuevo."
        confirmLabel="Resetear"
        destructive={false}
        onConfirm={() => {
          resetMutation.mutate(restartDate);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      >
        <div className="pt-1">
          <Label htmlFor="restart-date">Inicio del nuevo ciclo</Label>
          <DatePicker
            id="restart-date"
            className="mt-1 h-10"
            value={restartDate}
            onChange={setRestartDate}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAction === BudgetConfirmAction.Delete}
        title="Eliminar presupuesto"
        description="El presupuesto se ocultará, pero conservará su historial."
        confirmLabel="Eliminar"
        onConfirm={() => {
          deleteMutation.mutate();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
