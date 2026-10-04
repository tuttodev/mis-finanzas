'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransferForm } from '@/modules/transactions/ui/transfer-form';

function NewTransferForm() {
  const searchParams = useSearchParams();
  return <TransferForm initialFromAccountId={searchParams.get('accountId') ?? ''} />;
}

export default function NewTransferPage() {
  return (
    <Suspense>
      <NewTransferForm />
    </Suspense>
  );
}
