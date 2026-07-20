'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { formatCOP, parseCurrencyInput, todayIsoDate } from '@/lib/formatters';
import { createBudget, fetchBudgetProgressList, updateBudget } from '@/services/finance';

function BudgetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetProgressList,
  });

  const existingBudget = useMemo(
    () => budgetsQuery.data?.find((item) => item.budget.id === id)?.budget ?? null,
    [budgetsQuery.data, id],
  );

  const [name, setName] = useState(existingBudget?.name ?? '');
  const [limitAmount, setLimitAmount] = useState(
    existingBudget ? String(existingBudget.limitAmount) : '',
  );
  const [startedAt, setStartedAt] = useState(todayIsoDate());
  const [loadedBudgetId, setLoadedBudgetId] = useState<string | null>(null);

  if (existingBudget && loadedBudgetId !== existingBudget.id) {
    setLoadedBudgetId(existingBudget.id);
    setName(existingBudget.name);
    setLimitAmount(String(existingBudget.limitAmount));
  }

  const parsedAmount = parseCurrencyInput(limitAmount);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (!parsedAmount) throw new Error('Ingresa un límite válido');

      if (id) {
        await updateBudget(id, { name: name.trim(), limitAmount: parsedAmount });
      } else {
        await createBudget({
          name: name.trim(),
          limitAmount: parsedAmount,
          startedAt,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(id ? 'Presupuesto actualizado' : 'Presupuesto creado');
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        backHref="/budgets"
      />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              className="mt-1 h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mercado"
            />
          </div>
          <div>
            <Label htmlFor="limit">Límite por ciclo</Label>
            <Input
              id="limit"
              type="text"
              inputMode="numeric"
              className="mt-1 h-10"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="800000"
            />
            {parsedAmount !== null && (
              <p className="tabular mt-1 text-xs text-muted-foreground">
                {formatCOP(parsedAmount)}
              </p>
            )}
          </div>

          {!id && (
            <div>
              <Label htmlFor="startedAt">Inicio del ciclo</Label>
              <Input
                id="startedAt"
                type="date"
                className="mt-1 h-10"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Los gastos cuentan para el presupuesto desde esta fecha.
              </p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetFormPage() {
  return (
    <Suspense>
      <BudgetForm />
    </Suspense>
  );
}
