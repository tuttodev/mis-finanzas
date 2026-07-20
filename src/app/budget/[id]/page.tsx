'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetMovementRow } from '@/components/finance/budget-movement-row';
import { BudgetSnapshotRow } from '@/components/finance/budget-snapshot-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { HistoryBars } from '@/components/charts/history-bars';
import { formatCOP, formatPercent, formatShortDate, todayIsoDate } from '@/lib/formatters';
import { fetchBudgetDetail, resetBudget, softDeleteBudget } from '@/services/finance';

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
  const [confirmAction, setConfirmAction] = useState<'reset' | 'delete' | null>(null);
  const [restartDate, setRestartDate] = useState(todayIsoDate());

  const detailQuery = useQuery({
    queryKey: ['budget', id],
    queryFn: () => fetchBudgetDetail(id),
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
    mutationFn: () => softDeleteBudget(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Presupuesto eliminado');
      router.replace('/budgets');
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
      <PageHeader title={progress.budget.name} backHref="/budgets" />

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
            {formatCOP(progress.spentAmount)}
            <span className="text-base font-medium text-muted-foreground">
              {' '}
              / {formatCOP(progress.budget.limitAmount)}
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
              ? `Excedido por ${formatCOP(Math.abs(progress.remainingAmount))}`
              : `Disponible: ${formatCOP(progress.remainingAmount)}`}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/budget-form?id=${progress.budget.id}`} />}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="secondary" onClick={() => setConfirmAction('reset')}>
              <RotateCcw className="h-4 w-4" />
              Resetear
            </Button>
            <Button variant="destructive" onClick={() => setConfirmAction('delete')}>
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
            <HistoryBars data={historyData} />
          </div>
        )}

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Movimientos del ciclo</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {detail.movements.length ? (
              <div className="divide-y divide-border">
                {detail.movements.map((movement) => (
                  <BudgetMovementRow key={movement.id} movement={movement} />
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
                  <BudgetSnapshotRow key={snapshot.id} snapshot={snapshot} />
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
        open={confirmAction === 'reset'}
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
          <Input
            id="restart-date"
            type="date"
            className="mt-1 h-10"
            value={restartDate}
            onChange={(e) => setRestartDate(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAction === 'delete'}
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
