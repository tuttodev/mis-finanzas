'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionRow } from '@/components/finance/transaction-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { SpendArea, type SpendPoint } from '@/components/charts/spend-area';
import { formatCOP } from '@/lib/formatters';
import {
  deleteTransaction,
  fetchAccountTransactions,
  fetchAccountsOverview,
} from '@/services/finance';
import type { Transaction } from '@/types/finance';

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

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => fetchAccountTransactions(id),
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
      <PageHeader title={account.name} subtitle={account.type} backHref="/accounts" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Saldo actual</p>
          <p
            className={`tabular mt-1 font-display text-3xl font-bold ${
              account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
            }`}
          >
            {formatCOP(account.currentBalance)}
          </p>

          {balanceHistory.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Evolución del saldo</p>
              <SpendArea data={balanceHistory} color="var(--income)" />
            </div>
          )}

          <Button
            className="mt-4 w-full"
            size="lg"
            nativeButton={false}
            render={<Link href={`/transaction/new?accountId=${account.id}`} />}
          >
            <Plus className="h-4 w-4" />
            Nueva transacción
          </Button>
        </div>

        <div>
          <h2 className="mb-2 px-1 text-base font-semibold">Transacciones</h2>
          <div className="rounded-2xl border border-border bg-card px-4 py-1">
            {transactionsQuery.data?.length ? (
              <div className="divide-y divide-border">
                {transactionsQuery.data.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-2">
                    <Link
                      href={`/transaction/${transaction.id}/edit`}
                      aria-label={`Editar ${transaction.description}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0 flex-1">
                        <TransactionRow transaction={transaction} />
                      </div>
                      <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
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
        description="Esta acción no se puede deshacer."
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
