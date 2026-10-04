'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { formatCurrency } from '@/shared/lib/formatters';
import { deletePlanGroup, savePlanGroup } from '@/modules/planning/application/planning.use-cases';
import type { PlanItem, PlanSection } from '@/modules/planning/domain/plan.types';
import { Currency, DEFAULT_CURRENCY } from '@/shared/domain/currency.enum';
import { PlanItemType } from '@/modules/planning/domain/plan-item-type.enum';
import { QueryKey } from '@/shared/query/query-key.enum';

type PlanGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  currency?: Currency;
  monthKey: string;
  items: PlanItem[];
  sections: PlanSection[];
  initialSectionId?: string | null;
  group?: PlanItem | null;
};

export function PlanGroupDialog({ open, onOpenChange, planId, monthKey, items, sections, initialSectionId, group, currency = DEFAULT_CURRENCY }: PlanGroupDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(group?.name ?? '');
  const [sectionId, setSectionId] = useState(group?.sectionId ?? initialSectionId ?? '');
  const [search, setSearch] = useState('');
  const [showAllSections, setShowAllSections] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(items.filter((item) => item.parentItemId === group?.id && item.kind === PlanItemType.Expense).map((item) => item.id)),
  );

  const availableItems = items.filter(
    (item) => item.kind === PlanItemType.Expense && (!item.parentItemId || item.parentItemId === group?.id),
  );
  const selectedItems = availableItems.filter((item) => selectedIds.has(item.id));
  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const visibleItems = availableItems.filter(
    (item) =>
      (showAllSections || (item.sectionId ?? '') === sectionId || selectedIds.has(item.id)) &&
      item.name.toLocaleLowerCase('es').includes(normalizedSearch),
  );
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.plannedAmount, 0);

  const saveMutation = useMutation({
    mutationFn: () => savePlanGroup(planId, name, Array.from(selectedIds), sectionId || null, group?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.Plan, monthKey] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.PlanPrevious] });
      toast.success(group ? 'Grupo actualizado' : 'Grupo creado');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlanGroup(group!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.Plan, monthKey] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.PlanPrevious] });
      toast.success('Partidas desagrupadas');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && !pending && onOpenChange(false)}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] min-w-0 max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto data-[size=default]:max-w-xl data-[size=default]:sm:max-w-xl">
        <AlertDialogHeader className="min-w-0">
          <AlertDialogTitle>{group ? 'Editar grupo' : 'Agrupar partidas'}</AlertDialogTitle>
          <AlertDialogDescription className="min-w-0 max-w-full">
            Selecciona las subpartidas del grupo. Su suma se cuenta una sola vez en el plan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="plan-group-name" className="mb-1.5 block text-sm font-medium">Nombre del grupo</label>
              <Input
                id="plan-group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="TC NU"
                disabled={pending}
                className="h-10"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="plan-group-section" className="mb-1.5 block text-sm font-medium">Sección</label>
              <select
                id="plan-group-section"
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                disabled={pending}
                className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Sin sección</option>
                {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="text-sm font-semibold">Subpartidas</p>
              <button
                type="button"
                onClick={() => setShowAllSections((current) => !current)}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {showAllSections ? 'Solo esta sección' : 'Ver todas las secciones'}
              </button>
            </div>
            <div className="relative min-w-0">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar subpartidas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar partida"
                className="h-9 pl-9"
              />
            </div>
            <div role="group" aria-label="Partidas disponibles" className="max-h-[min(38dvh,22rem)] min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-border">
              {visibleItems.length ? visibleItems.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <label key={item.id} className={`flex min-w-0 cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/40 ${selected ? 'bg-primary/5' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleItem(item.id)}
                      disabled={pending}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm" title={item.name}>{item.name}</span>
                    <span className="tabular shrink-0 whitespace-nowrap text-xs text-muted-foreground">{formatCurrency(item.plannedAmount, currency)}</span>
                  </label>
                );
              }) : (
                <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                  {normalizedSearch ? 'No hay partidas que coincidan.' : 'No hay partidas disponibles en esta sección.'}
                </p>
              )}
            </div>
            <div className="flex min-w-0 items-baseline justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">{selectedIds.size} seleccionadas · Total del grupo</span>
              <span className="tabular min-w-0 text-right text-base font-bold text-foreground">{formatCurrency(selectedTotal, currency)}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="min-w-0 flex-wrap">
          {group && (
            <Button variant="ghost" className="sm:mr-auto text-destructive" disabled={pending} onClick={() => deleteMutation.mutate()}>
              Desagrupar
            </Button>
          )}
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button disabled={pending || !name.trim() || selectedIds.size === 0} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar grupo'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
