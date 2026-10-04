'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { AccountRow } from '@/modules/accounts/ui/account-row';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { formatCurrency } from '@/shared/lib/formatters';
import { CURRENCIES } from '@/shared/lib/formatters';
import { usePrivacy } from '@/shared/providers/privacy-provider';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { accountQueries } from '@/modules/accounts/application/accounts.queries';

export default function AccountsPage() {
  const accountsQuery = useQuery({
    ...accountQueries.list(),
  });

  const { hidden, toggle } = usePrivacy();

  const balancesByCurrency = CURRENCIES
    .map(({ code }) => ({
      currency: code,
      balance: accountsQuery.data
        ?.filter((account) => account.currency === code)
        .reduce((sum, account) => sum + account.currentBalance, 0) ?? 0,
    }))
    .filter(({ currency }) => accountsQuery.data?.some((account) => account.currency === currency));

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Mis Cuentas"
        subtitle="Tus saldos y movimientos actuales"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
            <Button nativeButton={false} render={<Link href={AppRoute.AccountForm} />}>
              <Plus className="h-4 w-4" />
              Nueva
            </Button>
          </div>
        }
      />

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
            <p className="text-sm text-muted-foreground">Patrimonio por moneda</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {balancesByCurrency.map(({ currency, balance }) => (
                <div key={currency}>
                  <p className="text-xs font-medium text-muted-foreground">{currency}</p>
                  <p className="tabular font-display text-2xl font-bold">
                    {hidden ? '••••••' : formatCurrency(balance, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-2">
            <div className="divide-y divide-border">
              {accountsQuery.data.map((account) => (
                <AccountRow key={account.id} account={account} hidden={hidden} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Sin cuentas"
          description="Crea tu primera cuenta para empezar a registrar movimientos."
        />
      )}
    </div>
  );
}
