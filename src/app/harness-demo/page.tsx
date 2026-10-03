import { notFound } from 'next/navigation';
import { CategorySpendingComparison } from '@/components/finance/category-spending-comparison';
import { compareCategorySpending } from '@/lib/category-spending-comparison';
import type { Currency } from '@/types/finance';

export const dynamic = 'force-dynamic';

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function HarnessDemoPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  const today = new Date();
  const currentDate = dateKey(new Date(today.getFullYear(), today.getMonth(), 5));
  const previousDate = dateKey(new Date(today.getFullYear(), today.getMonth() - 1, 5));
  const accounts = new Map<string, { currency: Currency }>([
    ['demo-cop', { currency: 'COP' }],
    ['demo-usd', { currency: 'USD' }],
  ]);
  const categories = new Map([
    ['groceries', { name: 'Mercado' }],
    ['housing', { name: 'Vivienda' }],
    ['transport', { name: 'Transporte' }],
  ]);
  const transactions = [
    { account_id: 'demo-cop', category_id: 'groceries', date: previousDate, amount: -300000 },
    { account_id: 'demo-cop', category_id: 'groceries', date: currentDate, amount: -400000 },
    { account_id: 'demo-cop', category_id: 'groceries', date: currentDate, amount: 50000, kind: 'refund' as const },
    { account_id: 'demo-cop', category_id: 'housing', date: previousDate, amount: -900000 },
    { account_id: 'demo-cop', category_id: 'housing', date: currentDate, amount: -900000 },
    { account_id: 'demo-cop', category_id: 'transport', date: currentDate, amount: -120000 },
    { account_id: 'demo-usd', category_id: 'groceries', date: currentDate, amount: -999999 },
    { account_id: 'demo-cop', category_id: 'groceries', date: currentDate, amount: -999999, transfer_id: 'demo-transfer' },
  ];
  const comparison = compareCategorySpending(
    transactions, accounts, categories, 'COP', today, 'Sin categoría',
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="px-1 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Vista previa del curso</p>
        <h1 className="mt-1 text-2xl font-bold">Jireh Finanzas · datos ficticios</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo transacciones ficticias. Esta página nunca se conecta a una cuenta financiera.
        </p>
      </header>
      <CategorySpendingComparison comparison={comparison} currency="COP" />
    </main>
  );
}
