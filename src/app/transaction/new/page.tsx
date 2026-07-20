'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP, parseCurrencyInput, todayIsoDate } from '@/lib/formatters';
import {
  createTransaction,
  fetchAccountsOverview,
  fetchBudgetProgressList,
} from '@/services/finance';
import type { AccountType, TransactionType } from '@/types/finance';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

function yesterdayIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function NewTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get('accountId') ?? '';
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [type, setType] = useState<TransactionType>('Gasto');
  const [selectedAccountId, setSelectedAccountId] = useState(accountIdParam);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetProgressList,
  });

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((a) => a.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId],
  );

  const parsedAmount = parseCurrencyInput(amount);
  const isExpense = type === 'Gasto';

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsedAmount) throw new Error('Ingresa un monto válido');
      if (!description.trim()) throw new Error('La descripción es obligatoria');
      if (!selectedAccount) throw new Error('Selecciona una cuenta');

      return createTransaction({
        account: selectedAccount,
        amount: parsedAmount,
        description: description.trim(),
        type,
        date,
        budgetId: isExpense && selectedBudgetId ? selectedBudgetId : null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(isExpense ? 'Gasto registrado' : 'Ingreso registrado');
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dateChips = [
    { label: 'Hoy', value: todayIsoDate() },
    { label: 'Ayer', value: yesterdayIsoDate() },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Nueva transacción" backHref="/" />

      <div className="space-y-4">
        {/* Type segmented control */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
          {(['Gasto', 'Ingreso'] as TransactionType[]).map((item) => {
            const active = type === item;
            return (
              <button
                key={item}
                onClick={() => {
                  setType(item);
                  if (item === 'Ingreso') setSelectedBudgetId('');
                }}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? item === 'Gasto'
                      ? 'bg-expense/15 text-expense'
                      : 'bg-income/15 text-income'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Amount */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Monto
          </Label>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`shrink-0 whitespace-nowrap font-display text-2xl font-semibold ${
                isExpense ? 'text-expense' : 'text-income'
              }`}
            >
              {isExpense ? '−$' : '+$'}
            </span>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="tabular w-full bg-transparent font-display text-3xl font-bold outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          {parsedAmount !== null && (
            <p className="tabular mt-1 text-xs text-muted-foreground">
              {formatCOP(parsedAmount)}
            </p>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                className="mt-1 h-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mercado de la semana"
              />
            </div>
            <div>
              <Label htmlFor="date">Fecha</Label>
              <div className="mt-1 flex gap-2">
                {dateChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setDate(chip.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      date === chip.value
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <Input
                  id="date"
                  type="date"
                  className="h-10 flex-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account selector */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Cuenta</h3>
          {accountsQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {accountsQuery.data?.map((account) => {
                const Icon = TYPE_ICONS[account.type] ?? Banknote;
                const active = selectedAccountId === account.id;
                return (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {account.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {account.type}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget selector (expenses only) */}
        {isExpense && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold">Presupuesto</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Asigna este gasto a un presupuesto para descontarlo de su ciclo actual.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedBudgetId('')}
                className={`w-full rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                  !selectedBudgetId
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                Sin presupuesto
              </button>
              {budgetsQuery.data?.map((item) => {
                const active = selectedBudgetId === item.budget.id;
                const over = item.remainingAmount < 0;
                return (
                  <button
                    key={item.budget.id}
                    onClick={() => setSelectedBudgetId(item.budget.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <span className="text-sm font-semibold">{item.budget.name}</span>
                    <span
                      className={`tabular text-xs ${
                        over ? 'text-expense' : 'text-muted-foreground'
                      }`}
                    >
                      {over
                        ? `Excedido ${formatCOP(Math.abs(item.remainingAmount))}`
                        : `Quedan ${formatCOP(item.remainingAmount)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? 'Guardando...'
            : isExpense
              ? 'Guardar gasto'
              : 'Guardar ingreso'}
        </Button>
      </div>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionForm />
    </Suspense>
  );
}
