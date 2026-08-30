'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { formatCOP } from '@/lib/formatters';
import { mergeFromPreviousPlan } from '@/services/finance';
import type { MonthlyPlanSummary, PlanItem, PlanItemKind } from '@/types/finance';
import { captureAnalytics } from '@/lib/analytics';

interface MergePreviousPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlanId: string;
  monthKey: string;
  previousPlan: MonthlyPlanSummary;
  currentItems: PlanItem[];
}

const KIND_LABEL: Record<PlanItemKind, string> = {
  income: 'Ingresos',
  deduction: 'Deducciones',
  expense: 'Partidas de gasto',
};

const KIND_ORDER: PlanItemKind[] = ['income', 'deduction', 'expense'];

function buildKey(item: PlanItem): string {
  return item.kind + '::' + item.name.trim().toLowerCase();
}

function isExisting(item: PlanItem, currentItems: PlanItem[]): boolean {
  const key = buildKey(item);
  return currentItems.some((c) => buildKey(c) === key);
}

export function MergePreviousPlanDialog({
  open,
  onOpenChange,
  targetPlanId,
  monthKey,
  previousPlan,
  currentItems,
}: MergePreviousPlanDialogProps) {
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(() => {
    const newItems = previousPlan.items.filter((i) => !isExisting(i, currentItems));
    return new Set(newItems.map((i) => i.id));
  });

  const mergeMutation = useMutation({
    mutationFn: () =>
      mergeFromPreviousPlan(targetPlanId, monthKey, Array.from(selected)),
    onSuccess: async (inserted) => {
      captureAnalytics('plan_items_merged', { item_count: inserted.length });
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
      const n = inserted.length;
      toast.success(
        n
          ? n + ' partida' + (n !== 1 ? 's' : '') + ' importada' + (n !== 1 ? 's' : '')
          : 'Nada nuevo que importar',
      );
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const newCount = Array.from(selected).filter((id) => {
    const item = previousPlan.items.find((i) => i.id === id);
    return item && !isExisting(item, currentItems);
  }).length;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <AlertDialogContent className="max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Importar del mes anterior</AlertDialogTitle>
          <AlertDialogDescription>
            Las marcadas en verde ya existen en este mes y no se duplicaran. Selecciona las que quieres agregar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[50vh] space-y-5 overflow-y-auto py-1">
          {KIND_ORDER.map((kind) => {
            const items = previousPlan.items.filter((i) => i.kind === kind);
            if (!items.length) return null;
            return (
              <div key={kind}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[kind]}
                </p>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {items.map((item) => {
                    const exists = isExisting(item, currentItems);
                    return (
                      <label
                        key={item.id}
                        className={
                          'flex items-center gap-3 px-3 py-2.5 transition-colors first:rounded-t-xl last:rounded-b-xl ' +
                          (exists ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-muted/40')
                        }
                      >
                        {exists ? (
                          <Check className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleItem(item.id)}
                            aria-label={item.name}
                            className="h-4 w-4 shrink-0 accent-primary"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {formatCOP(item.plannedAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={mergeMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <Button
            onClick={() => mergeMutation.mutate()}
            disabled={mergeMutation.isPending || newCount === 0}
          >
            <Download className="h-4 w-4" />
            {mergeMutation.isPending
              ? 'Importando...'
              : newCount === 0
                ? 'Nada seleccionado'
                : 'Importar ' + newCount + ' partida' + (newCount !== 1 ? 's' : '')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
