'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Tag, Tags, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { formatCOPInput, parseCurrencyInput } from '@/lib/formatters';
import {
  createPlanItem,
  deletePlanItem,
  fetchExpenseCategories,
  fetchPlanItem,
  fetchTags,
  updatePlanItem,
} from '@/services/finance';
import type { PlanItemKind } from '@/types/finance';
import { captureAnalytics } from '@/lib/analytics';

function PlanItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const planId = searchParams.get('planId');
  const itemId = searchParams.get('id');
  const kindParam = searchParams.get('kind') as PlanItemKind | null;

  const itemQuery = useQuery({
    queryKey: ['plan-item', itemId],
    queryFn: () => fetchPlanItem(itemId!),
    enabled: Boolean(itemId),
  });

  const [currentKind, setCurrentKind] = useState<PlanItemKind>(kindParam ?? 'expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (itemQuery.data && loadedItemId !== itemQuery.data.id) {
    setLoadedItemId(itemQuery.data.id);
    setCurrentKind(itemQuery.data.kind);
    setName(itemQuery.data.name);
    setAmount(formatCOPInput(itemQuery.data.plannedAmount));
    setNote(itemQuery.data.note ?? '');
    setSelectedCategoryId(itemQuery.data.categoryId ?? '');
    setSelectedTagIds(itemQuery.data.tagIds);
  }

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
    enabled: currentKind === 'expense',
  });
  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    enabled: currentKind === 'expense',
  });

  const expenseCategories = categoriesQuery.data ?? [];
  const customCategories = expenseCategories.filter((category) => !category.isSystem);
  const systemCategories = expenseCategories.filter((category) => category.isSystem);
  const selectedTags = useMemo(
    () => tagsQuery.data?.filter((tag) => selectedTagIds.includes(tag.id)) ?? [],
    [selectedTagIds, tagsQuery.data],
  );
  const tagGroups = [
    { label: 'Comunes', tags: tagsQuery.data?.filter((tag) => tag.isSystem) ?? [] },
    { label: 'Personalizadas', tags: tagsQuery.data?.filter((tag) => !tag.isSystem) ?? [] },
  ].filter((group) => group.tags.length > 0);
  const parsedAmount = parseCurrencyInput(amount, { allowZero: true });

  const invalidatePlanQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plan'] }),
      queryClient.invalidateQueries({ queryKey: ['plan-previous'] }),
    ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (parsedAmount === null) throw new Error('Ingresa un monto válido');

      if (itemId) {
        await updatePlanItem(itemId, {
          name: name.trim(),
          kind: currentKind,
          plannedAmount: parsedAmount,
          note,
          categoryId: currentKind === 'expense' ? selectedCategoryId || null : null,
          tagIds: currentKind === 'expense' ? selectedTagIds : [],
        });
      } else {
        if (!planId) throw new Error('No se encontró el plan');
        await createPlanItem({
          planId,
          name: name.trim(),
          kind: currentKind,
          plannedAmount: parsedAmount,
          note,
          categoryId: currentKind === 'expense' ? selectedCategoryId || null : null,
          tagIds: currentKind === 'expense' ? selectedTagIds : [],
        });
      }
    },
    onSuccess: async () => {
      captureAnalytics(itemId ? 'plan_item_updated' : 'plan_item_created', {
        item_kind: currentKind,
        has_category: Boolean(selectedCategoryId),
        has_tags: selectedTagIds.length > 0,
      });
      await invalidatePlanQueries();
      toast.success(
        itemId
          ? 'Item actualizado'
          : currentKind === 'deduction'
            ? 'Deducción creada'
            : currentKind === 'income'
              ? 'Ingreso creado'
              : 'Partida creada',
      );
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlanItem(itemId!),
    onSuccess: async () => {
      await invalidatePlanQueries();
      toast.success('Item eliminado');
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!planId && !itemId) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="No se encontró el plan al que agregar esta partida." />
      </div>
    );
  }

  if (itemId && itemQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const isPayrollSection = currentKind === 'income' || currentKind === 'deduction';

  const pageTitle = itemId
    ? currentKind === 'income'
      ? 'Editar ingreso'
      : currentKind === 'deduction'
        ? 'Editar deducción'
        : 'Editar partida'
    : currentKind === 'income'
      ? 'Nuevo ingreso / devengo'
      : currentKind === 'deduction'
        ? 'Nueva deducción de nómina'
        : 'Nueva partida';

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title={pageTitle} backHref="/app/plan" />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-4">
          {/* Segmented switch when in payroll/income section */}
          {isPayrollSection && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Tipo de concepto</Label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setCurrentKind('income')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    currentKind === 'income'
                      ? 'bg-card text-income shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  + Ingreso / Devengo
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentKind('deduction')}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    currentKind === 'deduction'
                      ? 'bg-card text-expense shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  - Deducción de nómina
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {currentKind === 'income'
                  ? 'Suma a tus ingresos (ej. Salario base, conectividad, bonificaciones).'
                  : 'Resta de tu nómina bruta (ej. Salud, pensión, retención en la fuente).'}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              className="mt-1 h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                currentKind === 'income'
                  ? 'Salario básico, Conectividad, GLIM...'
                  : currentKind === 'deduction'
                    ? 'Aporte salud (4%), Pensión, Retefuente...'
                    : 'Arriendo, Mercado, Servicios...'
              }
              maxLength={80}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="amount">Monto en pesos colombianos</Label>
            <CurrencyInput
              id="amount"
              className="mt-1 h-10"
              value={amount}
              onValueChange={setAmount}
              placeholder="0,00"
              aria-label="Monto en pesos colombianos (COP)"
            />
          </div>
          <div>
            <Label htmlFor="note">Nota (opcional)</Label>
            <Input
              id="note"
              className="mt-1 h-10"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                currentKind === 'deduction'
                  ? 'Descuento obligatorio por ley'
                  : currentKind === 'income'
                    ? 'Cada quincena / fin de mes'
                    : "Va pa'la TC"
              }
              maxLength={120}
            />
          </div>

          {currentKind === 'expense' && (
            <>
              <div>
                <Label htmlFor="plan-category">Categoría para los gastos</Label>
                <p className="mb-2 mt-1 text-xs text-muted-foreground">
                  Se usará automáticamente al agregar un gasto desde esta partida.
                </p>
                {categoriesQuery.isLoading ? (
                  <Skeleton className="h-12 w-full rounded-xl" />
                ) : categoriesQuery.isError ? (
                  <p className="text-sm text-expense">No se pudieron cargar las categorías.</p>
                ) : (
                  <div className="relative">
                    <Tag className="pointer-events-none absolute inset-y-0 left-3 my-auto h-5 w-5 text-primary" />
                    <select
                      id="plan-category"
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

              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <Label htmlFor="plan-tags">Etiquetas para los gastos</Label>
                  <span className="text-xs text-muted-foreground">Opcional</span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  También se copiarán automáticamente a cada gasto de esta partida.
                </p>
                {tagsQuery.isError ? (
                  <p className="text-sm text-expense">No se pudieron cargar las etiquetas.</p>
                ) : (
                  <div className="relative">
                    <button
                      id="plan-tags"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isTagsOpen}
                      onClick={() => setIsTagsOpen((open) => !open)}
                      className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-input bg-input/30 px-3 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <Tags className="h-5 w-5 shrink-0 text-primary" />
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        {selectedTags.length ? (
                          selectedTags.map((tag) => (
                            <span key={tag.id} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              {tag.name}
                            </span>
                          ))
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
                                        selected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-secondary'
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>

          {itemId && (
            <Button
              className="w-full"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar partida"
        description="Este elemento se eliminará del plan de este mes."
        confirmLabel="Eliminar"
        onConfirm={() => {
          deleteMutation.mutate();
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function PlanItemFormPage() {
  return (
    <Suspense>
      <PlanItemForm />
    </Suspense>
  );
}
