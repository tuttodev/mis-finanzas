'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/error-state';
import { RefundForm } from '@/components/finance/refund-form';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTransaction } from '@/services/finance';

export default function NewRefundPage({
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
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (transactionQuery.isError || !transactionQuery.data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState
          message={transactionQuery.error?.message ?? 'No se pudo cargar el gasto'}
        />
      </div>
    );
  }

  const transaction = transactionQuery.data;
  if (
    transaction.kind !== 'regular'
    || transaction.amount >= 0
    || !transaction.budgetCycleId
  ) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="Solo puedes reembolsar gastos asociados a un presupuesto." />
      </div>
    );
  }

  if (transaction.budgetCycleEndedAt) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="No puedes registrar reembolsos en un ciclo cerrado." />
      </div>
    );
  }

  return <RefundForm originalTransaction={transaction} />;
}
