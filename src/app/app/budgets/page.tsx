'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { BudgetProgressRow } from '@/modules/budgets/ui/budget-progress-row';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { formatCurrency } from '@/shared/lib/formatters';
import { useDefaultCurrency } from '@/modules/profile/application/use-user-profile';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { budgetQueries } from '@/modules/budgets/application/budgets.queries';

export default function BudgetsPage() {
  const { currency, isLoading: profileLoading, isError: profileError } = useDefaultCurrency();
  const budgetsQuery = useQuery({
    ...budgetQueries.progress(currency),
    enabled: !profileLoading && !profileError,
  });

  const totals = budgetsQuery.data?.reduce(
    (acc, item) => ({
      limit: acc.limit + item.budget.limitAmount,
      spent: acc.spent + item.spentAmount,
    }),
    { limit: 0, spent: 0 },
  );

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Presupuestos"
        subtitle="Controla el gasto y revisa tus ciclos"
        action={
          <Button nativeButton={false} render={<Link href={AppRoute.BudgetForm} />}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        }
      />

      {profileError ? (
        <ErrorState message="No se pudo cargar la moneda del perfil" />
      ) : profileLoading || budgetsQuery.isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : budgetsQuery.isError ? (
        <ErrorState message={budgetsQuery.error.message} />
      ) : budgetsQuery.data?.length ? (
        <div className="space-y-3">
          {totals && totals.limit > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted-foreground">Gastado este ciclo</p>
                <p className="tabular text-xs text-muted-foreground">
                  de {formatCurrency(totals.limit, currency)}
                </p>
              </div>
              <p className="tabular mt-1 font-display text-3xl font-bold">
                {formatCurrency(totals.spent, currency)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${
                    totals.spent > totals.limit ? 'bg-expense' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(totals.spent / totals.limit, 1) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card px-4 py-2">
            <div className="divide-y divide-border">
              {budgetsQuery.data.map((item) => (
                <BudgetProgressRow key={item.budget.id} progress={item} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Sin presupuestos"
          description="Crea tu primer presupuesto para empezar a asignar gastos."
        />
      )}
    </div>
  );
}
