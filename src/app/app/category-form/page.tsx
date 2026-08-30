'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { createExpenseCategory } from '@/services/finance';
import { captureAnalytics } from '@/lib/analytics';

export default function CategoryFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  const mutation = useMutation({
    mutationFn: () => createExpenseCategory({ name, transactionType }),
    onSuccess: async () => {
      captureAnalytics('category_created', { transaction_type: transactionType });
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Categoría creada');
      router.push('/app/categories');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Nueva categoría" backHref="/app/categories" />

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
              {([
                ['expense', 'Gasto'],
                ['income', 'Ingreso'],
              ] as const).map(([value, label]) => (
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
                  {label}
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
              {transactionType === 'expense' ? 'gasto' : 'ingreso'}.
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
                {transactionType === 'expense' ? 'gasto' : 'ingreso'}
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
