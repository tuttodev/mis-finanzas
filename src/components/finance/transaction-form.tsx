'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Calendar, Check, ChevronDown, CreditCard, Loader2, PiggyBank, Plus, RotateCcw, Tag, Tags, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP, formatCOPInput, parseCurrencyInput, todayIsoDate } from '@/lib/formatters';
import {
  createExpenseCategory,
  createTransaction,
  fetchAccountsOverview,
  fetchBudgetProgressList,
  fetchExpenseCategories,
  fetchPlanItem,
  fetchTags,
  fetchTransactionDescriptions,
  setPlanItemPaid,
  updateTransaction,
} from '@/services/finance';
import type { AccountType, EditableTransaction, TransactionDescriptionSuggestion, TransactionType } from '@/types/finance';
import { CategoryIcon } from './category-icon';
import { DescriptionAutocomplete } from './description-autocomplete';
import { TagBadge } from './tag-badge';
import { captureAnalytics } from '@/lib/analytics';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

type TransactionFormProps = {
  initialAccountId?: string;
  transaction?: EditableTransaction;
  preset?: 'savings-interest';
  planItemId?: string;
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
  preset,
  planItemId,
}: TransactionFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(transaction);
  const isSavingsInterest = preset === 'savings-interest' && !isEditing;
  const initialType: TransactionType =
    isSavingsInterest || (transaction && transaction.amount >= 0) ? 'Ingreso' : 'Gasto';

  const [amount, setAmount] = useState(
    transaction ? formatCOPInput(Math.abs(transaction.amount)) : '',
  );
  const [description, setDescription] = useState(
    transaction?.description ?? (isSavingsInterest ? 'Interes ahorros' : ''),
  );
  const [date, setDate] = useState(transaction?.date ?? todayIsoDate());
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedAccountId, setSelectedAccountId] = useState(
    transaction?.accountId ?? initialAccountId,
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState(transaction?.budgetId ?? '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    transaction?.categoryId ?? '',
  );
  const [isPlanned, setIsPlanned] = useState<boolean | null>(transaction?.isPlanned ?? null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    transaction?.tags.map((tag) => tag.id) ?? [],
  );
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadedPlanItemId, setLoadedPlanItemId] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetProgressList,
    enabled: !isSavingsInterest,
  });

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
  });

  const descriptionsQuery = useQuery({
    queryKey: ['transaction-descriptions'],
    queryFn: fetchTransactionDescriptions,
  });

  const planItemQuery = useQuery({
    queryKey: ['plan-item', planItemId],
    queryFn: () => fetchPlanItem(planItemId!),
    enabled: Boolean(planItemId) && !isEditing,
  });
  const isPlanItemLoading = Boolean(planItemId) && planItemQuery.isLoading;

  if (
    !isEditing &&
    planItemId &&
    planItemQuery.data &&
    loadedPlanItemId !== planItemQuery.data.id
  ) {
    setLoadedPlanItemId(planItemQuery.data.id);
    setAmount(formatCOPInput(planItemQuery.data.plannedAmount));
    setDescription(planItemQuery.data.name);
    setSelectedBudgetId(planItemQuery.data.budgetId ?? '');
    setSelectedCategoryId(planItemQuery.data.categoryId ?? '');
    setSelectedTagIds(planItemQuery.data.tagIds);
    setIsPlanned(true);
  }

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((account) => account.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId],
  );
  const selectedCurrency = selectedAccount?.currency ?? 'COP';
  const originalTransactionCurrency = transaction
    ? accountsQuery.data?.find((account) => account.id === transaction.accountId)?.currency
    : null;
  const presetCategoryId =
    categoriesQuery.data?.find((category) => category.slug === 'savings-interest')?.id ?? '';
  const effectiveCategoryId =
    selectedCategoryId || (isSavingsInterest ? presetCategoryId : '');
  const selectedCategory = useMemo(
    () => categoriesQuery.data?.find((category) => category.id === effectiveCategoryId) ?? null,
    [categoriesQuery.data, effectiveCategoryId],
  );
  const availableCategories =
    categoriesQuery.data?.filter((category) =>
      category.transactionType === (type === 'Gasto' ? 'expense' : 'income'),
    ) ?? [];
  const categoriesMap = useMemo(
    () => new Map(categoriesQuery.data?.map((cat) => [cat.id, cat]) ?? []),
    [categoriesQuery.data],
  );

  const handleSelectSuggestion = (suggestion: TransactionDescriptionSuggestion) => {
    if (suggestion.categoryId) {
      const suggestedCategory = categoriesMap.get(suggestion.categoryId);
      const expectedType = type === 'Gasto' ? 'expense' : 'income';
      if (suggestedCategory && suggestedCategory.transactionType === expectedType) {
        if (!selectedCategoryId) {
          setSelectedCategoryId(suggestion.categoryId);
        }
      }
    }
  };

  const customCategories =
    availableCategories.filter((category) => !category.isSystem);
  const systemCategories =
    availableCategories.filter((category) => category.isSystem);
  const selectedTags = useMemo(
    () => tagsQuery.data?.filter((tag) => selectedTagIds.includes(tag.id)) ?? [],
    [selectedTagIds, tagsQuery.data],
  );
  const tagGroups = [
    { label: 'Comunes', tags: tagsQuery.data?.filter((tag) => tag.isSystem) ?? [] },
    { label: 'Personalizadas', tags: tagsQuery.data?.filter((tag) => !tag.isSystem) ?? [] },
  ].filter((group) => group.tags.length > 0);

  const parsedAmount = parseCurrencyInput(amount);
  const isExpense = type === 'Gasto';

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsedAmount) throw new Error('Ingresa un monto válido');
      if (!description.trim()) throw new Error('La descripción es obligatoria');
      if (!date) throw new Error('Selecciona una fecha');
      if (!selectedAccount) throw new Error('Selecciona una cuenta');
      if (isSavingsInterest && selectedAccount.type !== 'Ahorros') {
        throw new Error('Los intereses solo se pueden registrar en una cuenta de ahorros');
      }
      if (isExpense && !effectiveCategoryId) throw new Error('Selecciona una categoría');
      if (isSavingsInterest && !effectiveCategoryId) {
        throw new Error('No se encontró la categoría de intereses');
      }

      const input = {
        account: selectedAccount,
        amount: parsedAmount,
        description: description.trim(),
        type,
        date,
        budgetId: isExpense && selectedCurrency === 'COP' && selectedBudgetId ? selectedBudgetId : null,
        categoryId: effectiveCategoryId || null,
        isPlanned,
        tagIds: selectedTagIds,
        planItemId: isExpense && selectedCurrency === 'COP' && planItemId ? planItemId : null,
      };

      if (transaction) {
        return updateTransaction(transaction.id, {
          ...input,
          originalBudgetCycleId: transaction.budgetCycleId,
          originalBudgetId: transaction.budgetId,
        });
      }

      return createTransaction(input).then(async (createdTransaction) => {
        if (planItemId && input.type === 'Gasto') {
          await setPlanItemPaid(planItemId, true);
        }
        return createdTransaction;
      });
    },
    onSuccess: async () => {
      captureAnalytics(isEditing ? 'transaction_updated' : 'transaction_created', {
        type: type === 'Gasto' ? 'expense' : 'income',
        has_category: Boolean(effectiveCategoryId),
        has_tags: selectedTagIds.length > 0,
        is_planned: Boolean(isPlanned),
        currency: selectedCurrency,
      });
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

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createExpenseCategory({
        name: newCategoryName,
        transactionType: isExpense ? 'expense' : 'income',
      }),
    onSuccess: async (createdCategory) => {
      captureAnalytics('category_created', {
        transaction_type: isExpense ? 'expense' : 'income',
      });
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setSelectedCategoryId(createdCategory.id);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      setIsCategoryOpen(false);
      toast.success('Categoría creada');
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
        title={
          isEditing ? 'Editar movimiento' : isSavingsInterest ? 'Agregar interés' : 'Nueva transacción'
        }
        subtitle={
          isSavingsInterest
            ? 'Registra el rendimiento diario de tus ahorros'
            : planItemId
              ? 'Gasto creado desde tu partida del plan'
              : undefined
        }
        backHref={
          transaction
            ? `/app/account/${transaction.accountId}`
            : isSavingsInterest && initialAccountId
              ? `/app/account/${initialAccountId}`
              : '/app'
        }
      />

      <div className="space-y-4">
        {!isSavingsInterest && (
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1">
            {(['Gasto', 'Ingreso'] as TransactionType[]).map((item) => {
              const active = type === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setType(item);
                    setSelectedCategoryId('');
                    if (item === 'Ingreso') {
                      setSelectedBudgetId('');
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
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Monto en {selectedCurrency === 'USD' ? 'dólares estadounidenses' : 'pesos colombianos'}
          </Label>
          <CurrencyInput
            id="amount"
            variant="prominent"
            sign={isExpense ? '−' : '+'}
            currency={selectedCurrency}
            value={amount}
            onValueChange={setAmount}
            placeholder="0,00"
            aria-label={`Monto en ${selectedCurrency}`}
            className={isExpense ? 'text-expense' : 'text-income'}
          />

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <div className="mt-1">
                <DescriptionAutocomplete
                  id="description"
                  className="h-10"
                  value={description}
                  onChange={setDescription}
                  onSelectSuggestion={handleSelectSuggestion}
                  suggestions={descriptionsQuery.data ?? []}
                  categoriesMap={categoriesMap}
                  placeholder="Mercado de la semana"
                  disabled={isSavingsInterest}
                />
              </div>
            </div>
            <div className="rounded-xl bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="date" className="text-sm font-semibold">Fecha</Label>
              </div>
              <div className="mt-2 flex gap-2">
                {dateChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setDate(chip.value)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      date === chip.value
                        ? 'border-primary bg-primary/15 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
                <Input
                  id="date"
                  type="date"
                  className="h-11 flex-1 font-semibold"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">
            {isSavingsInterest ? 'Cuenta de ahorros' : 'Cuenta'}
          </h3>
          {accountsQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : accountsQuery.isError ? (
            <p className="text-sm text-expense">No se pudieron cargar las cuentas.</p>
          ) : (
            <div className={isSavingsInterest ? '' : 'grid grid-cols-2 gap-2'}>
              {accountsQuery.data
                ?.filter(
                  (account) =>
                    (!isSavingsInterest || account.id === initialAccountId)
                    && (!originalTransactionCurrency || account.currency === originalTransactionCurrency),
                )
                .map((account) => {
                  const Icon = TYPE_ICONS[account.type] ?? Banknote;
                  const active = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        if (!isSavingsInterest) {
                          setSelectedAccountId(account.id);
                          if (account.currency !== 'COP') setSelectedBudgetId('');
                        }
                      }}
                      disabled={isSavingsInterest}
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
                        <span className="block break-words text-sm font-semibold leading-snug">
                          {account.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {account.type} · {account.currency}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {(isExpense || effectiveCategoryId || availableCategories.length > 0) && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <Label htmlFor="category" className="mb-1">
              Categoría
            </Label>
            <p className="mb-3 text-xs text-muted-foreground">
              {isExpense
                ? 'Indica en qué gastaste para incluirlo en tu resumen mensual.'
                : 'La categoría permite identificar y sumar tus ingresos por tipo.'}
            </p>
            {categoriesQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : categoriesQuery.isError ? (
              <p className="text-sm text-expense">No se pudieron cargar las categorías.</p>
            ) : (
              <div className="relative">
                <button
                  id="category"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isCategoryOpen}
                  onClick={() => {
                    setIsCategoryOpen((open) => !open);
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="flex h-12 w-full items-center gap-2 rounded-xl border border-input bg-input/30 px-3 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="shrink-0 text-primary">
                    {selectedCategory ? (
                      <CategoryIcon slug={selectedCategory.slug} className="h-5 w-5" />
                    ) : (
                      <Tag className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {selectedCategory
                      ? selectedCategory.name
                      : isExpense
                        ? 'Selecciona una categoría'
                        : 'Sin categoría'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>

                {isCategoryOpen && (
                  <div className="absolute top-[calc(100%+0.5rem)] z-20 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
                    {isCreatingCategory ? (
                      <div className="p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Nueva categoría de {isExpense ? 'gasto' : 'ingreso'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCategory(false);
                              setNewCategoryName('');
                            }}
                            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(event) => setNewCategoryName(event.target.value)}
                          placeholder="Nombre de la categoría"
                          maxLength={60}
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && newCategoryName.trim()) {
                              createCategoryMutation.mutate();
                            }
                          }}
                          className="h-10 w-full rounded-lg border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                        <button
                          type="button"
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          onClick={() => createCategoryMutation.mutate()}
                          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {createCategoryMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {createCategoryMutation.isPending ? 'Creando...' : 'Crear categoría'}
                        </button>
                      </div>
                    ) : (
                      <>
                        {customCategories.length > 0 && (
                          <div>
                            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Tus categorías
                            </p>
                            {customCategories.map((category) => {
                              const selected = effectiveCategoryId === category.id;
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    setSelectedCategoryId(category.id);
                                    setIsCategoryOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                    selected
                                      ? 'bg-primary/10 font-semibold text-primary'
                                      : 'hover:bg-secondary'
                                  }`}
                                >
                                  <CategoryIcon slug={category.slug} className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{category.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div>
                          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Predeterminadas
                          </p>
                          {systemCategories.map((category) => {
                            const selected = effectiveCategoryId === category.id;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedCategoryId(category.id);
                                  setIsCategoryOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                  selected
                                    ? 'bg-primary/10 font-semibold text-primary'
                                    : 'hover:bg-secondary'
                                }`}
                              >
                                <CategoryIcon slug={category.slug} className="h-4 w-4 shrink-0" />
                                <span className="truncate">{category.name}</span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsCreatingCategory(true)}
                          className="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-border px-3 pt-3 text-sm font-semibold text-primary hover:underline"
                        >
                          <Plus className="h-4 w-4" />
                          Crear nueva categoría
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-semibold">Planificación</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Indica si este movimiento estaba contemplado en tu plan o presupuesto.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Planeado', value: true },
              { label: 'No planeado', value: false },
              { label: 'Sin especificar', value: null },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={isPlanned === option.value}
                onClick={() => setIsPlanned(option.value)}
                className={`rounded-xl border p-3 text-sm font-semibold transition-colors ${
                  isPlanned === option.value
                    ? option.value === true
                      ? 'border-income/60 bg-income/10 text-income'
                      : option.value === false
                        ? 'border-expense/60 bg-expense/10 text-expense'
                        : 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center justify-between gap-3">
            <Label htmlFor="tags">Etiquetas</Label>
            <Link
              href="/app/tag-form"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setIsTagsOpen(false)}
            >
              Crear nueva
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Puedes seleccionar varias etiquetas para este movimiento.
          </p>
          {tagsQuery.isError ? (
            <p className="text-sm text-expense">No se pudieron cargar las etiquetas.</p>
          ) : (
            <div className="relative">
              <button
                id="tags"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isTagsOpen}
                onClick={() => setIsTagsOpen((open) => !open)}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-input bg-input/30 px-3 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Tags className="h-5 w-5 shrink-0 text-primary" />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {selectedTags.length ? (
                    selectedTags.map((tag) => <span key={tag.id} className="max-w-full"><TagBadge name={tag.name} /></span>)
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin etiquetas</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>

              {isTagsOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] z-20 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
                  {tagsQuery.isLoading ? (
                    <Skeleton className="h-10 w-full rounded-lg" />
                  ) : tagGroups.length ? (
                    <div className="space-y-1" role="listbox" aria-label="Etiquetas disponibles" aria-multiselectable="true">
                      {tagGroups.map((group) => (
                        <div key={group.label}>
                          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </p>
                          {group.tags.map((tag) => {
                            const selected = selectedTagIds.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedTagIds((current) =>
                                    selected
                                      ? current.filter((id) => id !== tag.id)
                                      : [...current, tag.id],
                                  );
                                }}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                  selected
                                    ? 'bg-primary/10 font-semibold text-primary'
                                    : 'hover:bg-secondary'
                                }`}
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border">
                                  {selected && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <span className="truncate">{tag.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      Aún no tienes etiquetas creadas.
                    </p>
                  )}
                  <Link
                    href="/app/tag-form"
                    onClick={() => setIsTagsOpen(false)}
                    className="mt-2 flex items-center gap-2 rounded-lg border-t border-border px-3 pt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    <Tag className="h-4 w-4" />
                    Crear nueva etiqueta
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {isExpense && selectedCurrency === 'COP' && (
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
          disabled={mutation.isPending || isPlanItemLoading}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? 'Guardando...'
            : isPlanItemLoading
              ? 'Cargando partida...'
              : isEditing
                ? 'Guardar cambios'
                : isSavingsInterest
                  ? 'Agregar interés'
                  : isExpense
                    ? 'Guardar gasto'
                    : 'Guardar ingreso'}
        </Button>

        {transaction
          && transaction.kind === 'regular'
          && transaction.amount < 0
          && transaction.budgetCycleId
          && !transaction.budgetCycleEndedAt && (
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/app/transaction/${transaction.id}/refund`} />}
            >
              <RotateCcw className="h-4 w-4" />
              Registrar reembolso
            </Button>
          )}
      </div>
    </div>
  );
}
