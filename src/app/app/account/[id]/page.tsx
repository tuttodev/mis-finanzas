'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, BadgeCent, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { TransactionRow } from '@/modules/transactions/ui/transaction-row';
import { TransactionExportDialog } from '@/modules/transactions/ui/transaction-export-dialog';
import { BalanceAdjustmentDialog } from '@/modules/accounts/ui/balance-adjustment-dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { SpendArea, type SpendPoint } from '@/shared/ui/charts/spend-area';
import { formatCurrency, formatDateGroupLabel } from '@/shared/lib/formatters';
import { deleteTransaction } from '@/modules/transactions/application/transactions.use-cases';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { AccountType } from '@/modules/accounts/domain/account-type.enum';
import { CategorySlug } from '@/modules/categories/domain/category-slug.enum';
import { TransactionPreset } from '@/modules/transactions/domain/transaction-preset.enum';
import { AppRoute, SearchParam } from '@/shared/navigation/app-route.enum';
import { appRoutes, withSearchParams } from '@/shared/navigation/app-routes';
import { transactionQueries } from '@/modules/transactions/application/transactions.queries';
import { accountQueries } from '@/modules/accounts/application/accounts.queries';

function buildBalanceHistory(
  currentBalance: number,
  transactions: Transaction[],
): SpendPoint[] {
  // Transactions come sorted newest-first; walk backwards from the current balance
  const points: SpendPoint[] = [];
  let balance = currentBalance;

  for (const tx of transactions) {
    points.push({ date: tx.date, value: balance });
    balance -= tx.amount;
  }

  return points.reverse().slice(-40);
}

type TransactionGroup = {
  key: string;
  label: string;
  transactions: Transaction[];
};

function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const groups: TransactionGroup[] = [];

  for (const tx of transactions) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.key === tx.date) {
      lastGroup.transactions.push(tx);
    } else {
      groups.push({ key: tx.date, label: formatDateGroupLabel(tx.date), transactions: [tx] });
    }
  }

  return groups;
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const accountsQuery = useQuery({
    ...accountQueries.list(),
  });

  const transactionsQuery = useQuery({
    ...transactionQueries.byAccount(id),
    enabled: Boolean(id),
  });

  const account = accountsQuery.data?.find((item) => item.id === id);

  const balanceHistory = useMemo(
    () =>
      account && transactionsQuery.data
        ? buildBalanceHistory(account.currentBalance, transactionsQuery.data)
        : [],
    [account, transactionsQuery.data],
  );

  const transactionGroups = useMemo(
    () => groupTransactionsByDate(transactionsQuery.data ?? []),
    [transactionsQuery.data],
  );
  const interestEarned = useMemo(
    () =>
      (transactionsQuery.data ?? []).reduce(
        (total, transaction) =>
          transaction.categorySlug === CategorySlug.SavingsInterest && transaction.amount > 0
            ? total + transaction.amount
            : total,
        0,
      ),
    [transactionsQuery.data],
  );

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) => deleteTransaction(transactionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Transacción eliminada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (accountsQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="No se encontró la cuenta solicitada." />
      </div>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message={transactionsQuery.error.message} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title={account.name} subtitle={`${account.type} · ${account.currency}`} backHref={AppRoute.Accounts} />

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Saldo actual
          </p>
          <p
            className={`tabular mt-1 font-display text-3xl font-bold ${
              account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
            }`}
          >
            {formatCurrency(account.currentBalance, account.currency)}
          </p>

          {account.type === AccountType.Savings && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-income/10 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium text-income">
                <BadgeCent className="h-4 w-4" />
                Intereses ganados
              </span>
              <span className="tabular text-sm font-bold text-income">
                {formatCurrency(interestEarned, account.currency)}
              </span>
            </div>
          )}

          {balanceHistory.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Evolución del saldo</p>
              <SpendArea data={balanceHistory} color="var(--income)" />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {account.type === AccountType.Savings && (
              <Button
                className="col-span-2"
                size="lg"
                nativeButton={false}
                render={
                  <Link
                    href={withSearchParams(AppRoute.NewTransaction, { [SearchParam.AccountId]: account.id, [SearchParam.Preset]: TransactionPreset.SavingsInterest })}
                  />
                }
              >
                <BadgeCent className="h-4 w-4" />
                Agregar interés
              </Button>
            )}
            <Button
              size="lg"
              variant={account.type === AccountType.Savings ? 'outline' : 'default'}
              nativeButton={false}
              render={<Link href={withSearchParams(AppRoute.NewTransaction, { [SearchParam.AccountId]: account.id })} />}
            >
              <Plus className="h-4 w-4" />
              Nueva transacción
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href={withSearchParams(AppRoute.NewTransfer, { [SearchParam.AccountId]: account.id })} />}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transferir
            </Button>
            <BalanceAdjustmentDialog account={account} />
            <TransactionExportDialog
              accountName={account.name}
              currency={account.currency}
              transactions={transactionsQuery.data ?? []}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Transacciones</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {transactionsQuery.data?.length ? (
              <div className="divide-y divide-border">
                {transactionGroups.map((group) => (
                  <div key={group.key} className="pt-3 pb-2 first:pt-2">
                    <p className="mb-1.5 rounded-lg bg-secondary/60 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-primary">
                      {group.label}
                    </p>
                    <div className="divide-y divide-border">
                      {group.transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center gap-2">
                          {transaction.transferId ? (
                            <div className="min-w-0 flex-1">
                              <TransactionRow transaction={transaction} currency={account.currency} hideDate />
                            </div>
                          ) : (
                            <Link
                              href={appRoutes.editTransaction(transaction.id)}
                              aria-label={`Editar ${transaction.description}`}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <div className="min-w-0 flex-1">
                                <TransactionRow transaction={transaction} currency={account.currency} hideDate />
                              </div>
                              <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(transaction.id)}
                            aria-label="Eliminar transacción"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3">
                <EmptyState
                  title="No hay transacciones"
                  description="Registra el primer movimiento de esta cuenta."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar transacción"
        description={
          transactionsQuery.data?.find((tx) => tx.id === deleteTarget)?.transferId
            ? 'Se eliminarán los dos movimientos de la transferencia. Esta acción no se puede deshacer.'
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
