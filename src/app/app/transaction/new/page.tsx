'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionForm } from '@/modules/transactions/ui/transaction-form';
import { TransactionPreset } from '@/modules/transactions/domain/transaction-preset.enum';

function NewTransactionForm() {
  const searchParams = useSearchParams();
  const preset =
    searchParams.get('preset') === TransactionPreset.SavingsInterest ? TransactionPreset.SavingsInterest : undefined;

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
