'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionForm } from '@/components/finance/transaction-form';

function NewTransactionForm() {
  const searchParams = useSearchParams();
  const preset =
    searchParams.get('preset') === 'savings-interest' ? 'savings-interest' : undefined;

  return (
    <TransactionForm
      initialAccountId={searchParams.get('accountId') ?? ''}
      preset={preset}
      planItemId={searchParams.get('planItemId') ?? undefined}
    />
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionForm />
    </Suspense>
  );
}
