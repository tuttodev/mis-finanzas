'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/error-state';
import { TransactionForm } from '@/components/finance/transaction-form';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTransaction } from '@/services/finance';

export default function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const transactionQuery = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => fetchTransaction(id),
    enabled: Boolean(id),
  });

  if (transactionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (transactionQuery.isError || !transactionQuery.data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState
          message={transactionQuery.error?.message ?? 'No se pudo cargar el movimiento'}
        />
      </div>
    );
  }

  if (transactionQuery.data.transferId) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="Las transferencias no se pueden editar. Elimínala y créala de nuevo." />
      </div>
    );
  }

  return <TransactionForm transaction={transactionQuery.data} />;
}
