'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { createExpenseCategory } from '@/modules/categories/application/categories.use-cases';
import { captureAnalytics } from '@/shared/analytics/analytics';
import { TransactionType } from '@/modules/transactions/domain/transaction-type.enum';
import { TRANSACTION_TYPE_LABELS } from '@/modules/transactions/ui/transaction-type-labels';
import { AnalyticsEvent } from '@/shared/analytics/analytics-event.enum';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { QueryKey } from '@/shared/query/query-key.enum';

export default function CategoryFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.Expense);

  const mutation = useMutation({
    mutationFn: () => createExpenseCategory({ name, transactionType }),
    onSuccess: async () => {
      captureAnalytics(AnalyticsEvent.CategoryCreated, { transaction_type: transactionType });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.ExpenseCategories] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.Dashboard] });
      toast.success('Categoría creada');
      router.push(AppRoute.Categories);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Nueva categoría" backHref={AppRoute.Categories} />

      <form
        className="rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-5">
          <div>
            <Label className="mb-2">Tipo de movimiento</Label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              {[TransactionType.Expense, TransactionType.Income].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTransactionType(value)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    transactionType === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {TRANSACTION_TYPE_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="category-name">Nombre</Label>
            <Input
              id="category-name"
              className="mt-1 h-10"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mascotas"
              maxLength={60}
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Aparecerá como opción al registrar un{' '}
              {TRANSACTION_TYPE_LABELS[transactionType].toLowerCase()}.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{name.trim() || 'Tu categoría'}</p>
              <p className="text-xs text-muted-foreground">
                Categoría personalizada de{' '}
                {TRANSACTION_TYPE_LABELS[transactionType].toLowerCase()}
              </p>
            </div>
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </div>
  );
}
