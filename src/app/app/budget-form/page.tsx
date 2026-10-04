'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { CurrencyInput } from '@/shared/ui/currency-input';
import { DatePicker } from '@/shared/ui/date-picker';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { ErrorState } from '@/shared/ui/error-state';
import { formatCurrencyInput, parseCurrencyInput, todayIsoDate } from '@/shared/lib/formatters';
import { useDefaultCurrency } from '@/modules/profile/application/use-user-profile';
import { createBudget, updateBudget } from '@/modules/budgets/application/budgets.use-cases';
import { captureAnalytics } from '@/shared/analytics/analytics';
import { AnalyticsEvent } from '@/shared/analytics/analytics-event.enum';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { budgetQueries } from '@/modules/budgets/application/budgets.queries';

function BudgetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const queryClient = useQueryClient();
  const { currency: defaultCurrency, isLoading: profileLoading, isError: profileError } = useDefaultCurrency();

  const budgetsQuery = useQuery({
    ...budgetQueries.progress(),
  });

  const existingBudget = useMemo(
    () => budgetsQuery.data?.find((item) => item.budget.id === id)?.budget ?? null,
    [budgetsQuery.data, id],
  );

  const [name, setName] = useState(existingBudget?.name ?? '');
  const [limitAmount, setLimitAmount] = useState(
    existingBudget ? formatCurrencyInput(existingBudget.limitAmount, existingBudget.currency) : '',
  );
  const [startedAt, setStartedAt] = useState(todayIsoDate());
  const [loadedBudgetId, setLoadedBudgetId] = useState<string | null>(null);

  if (existingBudget && loadedBudgetId !== existingBudget.id) {
    setLoadedBudgetId(existingBudget.id);
    setName(existingBudget.name);
    setLimitAmount(formatCurrencyInput(existingBudget.limitAmount, existingBudget.currency));
  }

  const currency = existingBudget?.currency ?? defaultCurrency;
  const parsedAmount = parseCurrencyInput(limitAmount, { currency });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (!parsedAmount) throw new Error('Ingresa un límite válido');

      if (id) {
        await updateBudget(id, { name: name.trim(), limitAmount: parsedAmount, currency });
      } else {
        await createBudget({
          name: name.trim(),
          currency,
          limitAmount: parsedAmount,
          startedAt,
        });
      }
    },
    onSuccess: async () => {
      captureAnalytics(id ? AnalyticsEvent.BudgetUpdated : AnalyticsEvent.BudgetCreated);
      await queryClient.invalidateQueries();
      toast.success(id ? 'Presupuesto actualizado' : 'Presupuesto creado');
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (id && budgetsQuery.isError) {
    return <div className="mx-auto max-w-2xl p-4"><ErrorState message={budgetsQuery.error.message} /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        backHref={AppRoute.Budgets}
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
            <Label htmlFor="limit">Límite por ciclo ({currency})</Label>
            <CurrencyInput
              id="limit"
              currency={currency}
              className="mt-1 h-10"
              value={limitAmount}
              onValueChange={setLimitAmount}
              placeholder="0,00"
              aria-label={`Límite por ciclo (${currency})`}
            />
          </div>

          {!id && (
            <div>
              <Label htmlFor="startedAt">Inicio del ciclo</Label>
              <DatePicker
                id="startedAt"
                className="mt-1 h-10"
                value={startedAt}
                onChange={setStartedAt}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Los gastos cuentan para el presupuesto desde esta fecha.
              </p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={mutation.isPending || profileLoading || profileError || (Boolean(id) && budgetsQuery.isLoading)}
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
