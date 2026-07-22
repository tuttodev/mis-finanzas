'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, ChevronDown, CreditCard, PiggyBank, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP, formatCOPInput, parseCurrencyInput, todayIsoDate } from '@/lib/formatters';
import {
  createTransaction,
  fetchAccountsOverview,
  fetchBudgetProgressList,
  fetchExpenseCategories,
  updateTransaction,
} from '@/services/finance';
import type { AccountType, EditableTransaction, TransactionType } from '@/types/finance';
import { CategoryIcon } from './category-icon';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

type TransactionFormProps = {
  initialAccountId?: string;
  transaction?: EditableTransaction;
};

function yesterdayIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function TransactionForm({
  initialAccountId = '',
  transaction,
}: TransactionFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(transaction);
  const initialType: TransactionType = transaction && transaction.amount >= 0
    ? 'Ingreso'
    : 'Gasto';

  const [amount, setAmount] = useState(
    transaction ? formatCOPInput(Math.abs(transaction.amount)) : '',
  );
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [date, setDate] = useState(transaction?.date ?? todayIsoDate());
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedAccountId, setSelectedAccountId] = useState(
    transaction?.accountId ?? initialAccountId,
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState(transaction?.budgetId ?? '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    transaction?.categoryId ?? '',
  );

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetProgressList,
  });

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((account) => account.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId],
  );
  const selectedCategory = useMemo(
    () => categoriesQuery.data?.find((category) => category.id === selectedCategoryId) ?? null,
    [categoriesQuery.data, selectedCategoryId],
  );
  const customCategories =
    categoriesQuery.data?.filter((category) => !category.isSystem) ?? [];
  const systemCategories =
    categoriesQuery.data?.filter((category) => category.isSystem) ?? [];

  const parsedAmount = parseCurrencyInput(amount);
  const isExpense = type === 'Gasto';

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsedAmount) throw new Error('Ingresa un monto válido');
      if (!description.trim()) throw new Error('La descripción es obligatoria');
      if (!date) throw new Error('Selecciona una fecha');
      if (!selectedAccount) throw new Error('Selecciona una cuenta');
      if (isExpense && !selectedCategoryId) throw new Error('Selecciona una categoría');

      const input = {
        account: selectedAccount,
        amount: parsedAmount,
        description: description.trim(),
        type,
        date,
        budgetId: isExpense && selectedBudgetId ? selectedBudgetId : null,
        categoryId: isExpense ? selectedCategoryId : null,
      };

      if (transaction) {
        return updateTransaction(transaction.id, {
          ...input,
          originalBudgetCycleId: transaction.budgetCycleId,
          originalBudgetId: transaction.budgetId,
        });
      }

      return createTransaction(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(
        isEditing
          ? 'Movimiento actualizado'
          : isExpense
            ? 'Gasto registrado'
            : 'Ingreso registrado',
      );
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
      <PageHeader
        title={isEditing ? 'Editar movimiento' : 'Nueva transacción'}
        backHref={transaction ? `/account/${transaction.accountId}` : '/'}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
          {(['Gasto', 'Ingreso'] as TransactionType[]).map((item) => {
            const active = type === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setType(item);
                  if (item === 'Ingreso') {
                    setSelectedBudgetId('');
                    setSelectedCategoryId('');
                  }
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

        <div className="rounded-2xl border border-border bg-card p-5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Monto en pesos colombianos
          </Label>
          <CurrencyInput
            id="amount"
            variant="prominent"
            sign={isExpense ? '−' : '+'}
            value={amount}
            onValueChange={setAmount}
            placeholder="0,00"
            aria-label="Monto en pesos colombianos (COP)"
            className={isExpense ? 'text-expense' : 'text-income'}
          />

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                className="mt-1 h-10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mercado de la semana"
              />
            </div>
            <div>
              <Label htmlFor="date">Fecha</Label>
              <div className="mt-1 flex gap-2">
                {dateChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
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
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Cuenta</h3>
          {accountsQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : accountsQuery.isError ? (
            <p className="text-sm text-expense">No se pudieron cargar las cuentas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {accountsQuery.data?.map((account) => {
                const Icon = TYPE_ICONS[account.type] ?? Banknote;
                const active = selectedAccountId === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
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
                      <span className="block break-words text-sm font-semibold leading-snug">{account.name}</span>
                      <span className="block text-xs text-muted-foreground">{account.type}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isExpense && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Label htmlFor="category" className="mb-1">
              Categoría
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              Indica en qué gastaste para incluirlo en tu resumen mensual.
            </p>
            {categoriesQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : categoriesQuery.isError ? (
              <p className="text-sm text-expense">No se pudieron cargar las categorías.</p>
            ) : (
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                  {selectedCategory ? (
                    <CategoryIcon slug={selectedCategory.slug} className="h-5 w-5" />
                  ) : (
                    <Tag className="h-5 w-5" />
                  )}
                </span>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-input bg-input/30 pr-10 pl-11 text-sm font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecciona una categoría</option>
                  {customCategories.length > 0 && (
                    <optgroup label="Tus categorías">
                      {customCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Predeterminadas">
                    {systemCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {isExpense && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold">Presupuesto</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Asigna este gasto a un presupuesto para descontarlo de su ciclo actual.
            </p>
            {budgetsQuery.isError ? (
              <p className="text-sm text-expense">No se pudieron cargar los presupuestos.</p>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
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
                      type="button"
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
            )}
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
            : isEditing
              ? 'Guardar cambios'
              : isExpense
                ? 'Guardar gasto'
                : 'Guardar ingreso'}
        </Button>
      </div>
    </div>
  );
}
