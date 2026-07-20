'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountRow } from '@/components/finance/account-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatCOP } from '@/lib/formatters';
import { fetchAccountsOverview } from '@/services/finance';

export default function AccountsPage() {
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const total =
    accountsQuery.data?.reduce((sum, account) => sum + account.currentBalance, 0) ?? 0;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Mis Cuentas" subtitle="Tus saldos y movimientos actuales" />

      {accountsQuery.isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : accountsQuery.isError ? (
        <ErrorState message={accountsQuery.error.message} />
      ) : accountsQuery.data?.length ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Patrimonio total</p>
            <p className="tabular mt-1 font-display text-3xl font-bold">
              {formatCOP(total)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-2">
            <div className="divide-y divide-border">
              {accountsQuery.data.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Sin cuentas"
          description="Aún no hay cuentas disponibles en Supabase."
        />
      )}
    </div>
  );
}
