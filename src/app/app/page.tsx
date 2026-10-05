'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/shared/providers/privacy-provider';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorState } from '@/shared/ui/error-state';
import { EmptyState } from '@/shared/ui/empty-state';
import { CashflowBars } from '@/shared/ui/charts/cashflow-bars';
import { SpendArea } from '@/shared/ui/charts/spend-area';
import { DonutChart, type DonutSlice } from '@/shared/ui/charts/donut-chart';
import { CategoryBadge } from '@/modules/categories/ui/category-badge';
import { TransferBadge } from '@/modules/transactions/ui/transfer-badge';
import { RefundBadge } from '@/modules/transactions/ui/refund-badge';
import { PlanningBadge } from '@/modules/transactions/ui/planning-badge';
import { TagBadge } from '@/modules/tags/ui/tag-badge';
import { formatCurrency, formatShortDate } from '@/shared/lib/formatters';
import { useDefaultCurrency } from '@/modules/profile/application/use-user-profile';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { appRoutes } from '@/shared/navigation/app-routes';
import { dashboardQueries } from '@/modules/dashboard/application/dashboard.queries';
import { budgetQueries } from '@/modules/budgets/application/budgets.queries';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import { CategorySpendingComparison } from '@/modules/dashboard/ui/category-spending-comparison';

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
  const { currency, isLoading: profileLoading, isError: profileError } = useDefaultCurrency();
  const dashboardQuery = useQuery({
    ...dashboardQueries.summary(currency),
    enabled: !profileLoading && !profileError,
  });

  const budgetsQuery = useQuery({
    ...budgetQueries.progress(currency),
    enabled: !profileLoading && !profileError,
  });

  const { hidden, toggle } = usePrivacy();

  if (profileLoading || dashboardQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (profileError) return <div className="mx-auto max-w-2xl p-4"><ErrorState message="No se pudo cargar la moneda del perfil" /></div>;

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
  const categorySlices: DonutSlice[] = data.categorySpending.map((item, index) => ({
    ...item,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-start justify-between px-1 pt-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const label = todayFormatter.format(new Date());
              return label.charAt(0).toUpperCase() + label.slice(1);
            })()}
          </p>
          <h1 className="text-2xl font-bold">Resumen</h1>
          <p className="mt-1 text-xs text-muted-foreground">Un paso a la vez, con fe y sabiduría.</p>
        </div>
        <button
          onClick={toggle}
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          className="mt-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </button>
      </header>

      {/* Balances remain separate by currency to avoid implying an exchange rate. */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Patrimonio por moneda</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {data.balancesByCurrency.map(({ currency, balance }) => (
            <div key={currency} className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{currency}</p>
              <p className="tabular max-w-full bg-gradient-to-r from-primary to-foreground bg-clip-text font-display text-2xl leading-tight font-bold text-transparent sm:text-3xl">
                {hidden ? '••••••' : formatCurrency(balance, currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-secondary/60 p-3">
            <p className="flex items-start gap-1 text-xs leading-4 text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-income" />
              Ingresos del mes · {currency}
            </p>
            <p className="tabular mt-1 min-w-0 font-display text-lg leading-tight font-semibold text-income">
              {hidden ? '••••••' : formatCurrency(data.monthIncome, currency)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-secondary/60 p-3">
            <p className="flex items-start gap-1 text-xs leading-4 text-muted-foreground">
              <ArrowDownRight className="h-3.5 w-3.5 text-expense" />
              Gastos del mes · {currency}
            </p>
            <p className="tabular mt-1 min-w-0 font-display text-lg leading-tight font-semibold text-expense">
              {hidden ? '••••••' : formatCurrency(data.monthExpense, currency)}
            </p>
          </div>
        </div>
      </section>

      {/* Daily spending trend */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Gasto diario</h2>
        <p className="mb-3 text-xs text-muted-foreground">Últimos 30 días · {currency}</p>
        {data.dailySpend.some((d) => d.value > 0) ? (
          <SpendArea data={data.dailySpend} currency={currency} />
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
          Ingresos y gastos de los últimos 6 meses · {currency}
        </p>
        {data.cashflow.some((m) => m.income > 0 || m.expense > 0) ? (
          <CashflowBars data={data.cashflow} currency={currency} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay movimientos para graficar.
          </p>
        )}
      </section>

      {/* Spending by category */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Gasto por categoría</h2>
        <p className="mb-3 text-xs text-muted-foreground">Mes actual · {currency}</p>
        {categorySlices.length ? (
          <DonutChart data={categorySlices} centerLabel="Total gastado" currency={currency} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay gastos categorizados este mes.
          </p>
        )}
      </section>

      {/* Spending by category, current month vs. previous month */}
      <CategorySpendingComparison comparison={data.categoryComparison} hidden={hidden} />

      {/* Spending by budget */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Gasto por presupuesto</h2>
        <p className="mb-3 text-xs text-muted-foreground">Ciclo actual de cada presupuesto</p>
        {budgetSlices.length ? (
          <DonutChart data={budgetSlices} centerLabel="Total gastado" currency={currency} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay gastos asignados a presupuestos.{' '}
            <Link href={AppRoute.Budgets} className="text-primary underline-offset-2 hover:underline">
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
            href={AppRoute.Accounts}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver cuentas
          </Link>
        </div>
        {data.recentTransactions.length ? (
          <div className="divide-y divide-border">
            {data.recentTransactions.map((tx) => (
              <Link
                key={tx.id}
                href={tx.transferId ? appRoutes.account(tx.accountId) : appRoutes.editTransaction(tx.id)}
                aria-label={
                  tx.transferId ? `Ver cuenta de ${tx.description}` : `Editar ${tx.description}`
                }
                className="flex items-center justify-between gap-3 rounded-lg py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.description}</p>
                  <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {tx.categoryName && <CategoryBadge name={tx.categoryName} />}
                    {tx.tags.map((tag) => <TagBadge key={tag.id} name={tag.name} />)}
                    {!tx.transferId && <PlanningBadge isPlanned={tx.isPlanned} />}
                    {tx.transferId && <TransferBadge />}
                    {tx.kind === TransactionKind.Refund && <RefundBadge />}
                    <span>
                      {tx.accountName} · {formatShortDate(tx.date)}
                    </span>
                  </p>
                </div>
                <span
                  className={`tabular shrink-0 text-sm font-semibold ${
                    tx.amount < 0 ? 'text-expense' : 'text-income'
                  }`}
                >
                  {hidden ? '••••••' : (
                    <>
                      {tx.amount >= 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(tx.amount), tx.currency)}
                    </>
                  )}
                </span>
              </Link>
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
