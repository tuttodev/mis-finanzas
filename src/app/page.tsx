'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { CashflowBars } from '@/components/charts/cashflow-bars';
import { SpendArea } from '@/components/charts/spend-area';
import { DonutChart, type DonutSlice } from '@/components/charts/donut-chart';
import { formatCOP, formatShortDate } from '@/lib/formatters';
import { fetchBudgetProgressList, fetchDashboardData } from '@/services/finance';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const todayFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export default function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetProgressList,
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState
          message={dashboardQuery.error?.message ?? 'No se pudo cargar el resumen'}
        />
      </div>
    );
  }

  const data = dashboardQuery.data;
  const budgetSlices: DonutSlice[] = (budgetsQuery.data ?? [])
    .filter((item) => item.spentAmount > 0)
    .map((item, index) => ({
      label: item.budget.name,
      value: item.spentAmount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="px-1 pt-2">
        <p className="text-sm text-muted-foreground">
          {(() => {
            const label = todayFormatter.format(new Date());
            return label.charAt(0).toUpperCase() + label.slice(1);
          })()}
        </p>
        <h1 className="text-2xl font-bold">Resumen</h1>
      </header>

      {/* Hero: total balance */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Balance total</p>
        <p className="tabular mt-1 bg-gradient-to-r from-primary to-foreground bg-clip-text font-display text-4xl font-bold text-transparent">
          {formatCOP(data.totalBalance)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-income" />
              Ingresos del mes
            </p>
            <p className="tabular mt-1 font-display text-lg font-semibold text-income">
              {formatCOP(data.monthIncome)}
            </p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowDownRight className="h-3.5 w-3.5 text-expense" />
              Gastos del mes
            </p>
            <p className="tabular mt-1 font-display text-lg font-semibold text-expense">
              {formatCOP(data.monthExpense)}
            </p>
          </div>
        </div>
      </section>

      {/* Daily spending trend */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Gasto diario</h2>
        <p className="mb-3 text-xs text-muted-foreground">Últimos 30 días</p>
        {data.dailySpend.some((d) => d.value > 0) ? (
          <SpendArea data={data.dailySpend} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin gastos registrados en los últimos 30 días.
          </p>
        )}
      </section>

      {/* Monthly cashflow */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Flujo mensual</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Ingresos y gastos de los últimos 6 meses
        </p>
        {data.cashflow.some((m) => m.income > 0 || m.expense > 0) ? (
          <CashflowBars data={data.cashflow} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay movimientos para graficar.
          </p>
        )}
      </section>

      {/* Spending by budget */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Gasto por presupuesto</h2>
        <p className="mb-3 text-xs text-muted-foreground">Ciclo actual de cada presupuesto</p>
        {budgetSlices.length ? (
          <DonutChart data={budgetSlices} centerLabel="Total gastado" />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay gastos asignados a presupuestos.{' '}
            <Link href="/budgets" className="text-primary underline-offset-2 hover:underline">
              Ver presupuestos
            </Link>
          </p>
        )}
      </section>

      {/* Recent transactions */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Movimientos recientes</h2>
          <Link
            href="/accounts"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver cuentas
          </Link>
        </div>
        {data.recentTransactions.length ? (
          <div className="divide-y divide-border">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.accountName} · {formatShortDate(tx.date)}
                  </p>
                </div>
                <span
                  className={`tabular shrink-0 text-sm font-semibold ${
                    tx.amount < 0 ? 'text-expense' : 'text-income'
                  }`}
                >
                  {tx.amount >= 0 ? '+' : '−'}
                  {formatCOP(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin movimientos"
            description="Registra tu primer gasto con el botón +."
          />
        )}
      </section>
    </div>
  );
}
