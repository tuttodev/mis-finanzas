'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/shared/ui/error-state';
import { TransactionForm } from '@/modules/transactions/ui/transaction-form';
import { RefundForm } from '@/modules/transactions/ui/refund-form';
import { Skeleton } from '@/shared/ui/skeleton';
import { transactionQueries } from '@/modules/transactions/application/transactions.queries';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';

export default function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const transactionQuery = useQuery({
    ...transactionQueries.detail(id),
    enabled: Boolean(id),
  });
  const relatedTransactionId = transactionQuery.data?.relatedTransactionId ?? '';
  const originalTransactionQuery = useQuery({
    ...transactionQueries.detail(relatedTransactionId),
    enabled: transactionQuery.data?.kind === TransactionKind.Refund && Boolean(relatedTransactionId),
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

  if (transactionQuery.data.kind === TransactionKind.Refund) {
    if (originalTransactionQuery.isLoading) {
      return (
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      );
    }

    if (originalTransactionQuery.isError || !originalTransactionQuery.data) {
      return (
        <div className="mx-auto max-w-2xl p-4">
          <ErrorState message="No se pudo cargar el gasto relacionado con este reembolso." />
        </div>
      );
    }

    return (
      <RefundForm
        originalTransaction={originalTransactionQuery.data}
        refund={transactionQuery.data}
      />
    );
  }

  return <TransactionForm transaction={transactionQuery.data} />;
}
