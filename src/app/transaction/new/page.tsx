'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionForm } from '@/components/finance/transaction-form';

function NewTransactionForm() {
  const searchParams = useSearchParams();
  return <TransactionForm initialAccountId={searchParams.get('accountId') ?? ''} />;
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionForm />
    </Suspense>
  );
}
