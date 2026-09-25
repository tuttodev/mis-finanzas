'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCOP } from '@/lib/formatters';
import { deletePlanGroup, savePlanGroup } from '@/services/finance';
import type { PlanItem } from '@/types/finance';

type PlanGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  monthKey: string;
  items: PlanItem[];
  group?: PlanItem | null;
};

export function PlanGroupDialog({ open, onOpenChange, planId, monthKey, items, group }: PlanGroupDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(group?.name ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    new Set(items.filter((item) => item.parentItemId === group?.id && item.kind === 'expense').map((item) => item.id)),
  );

  const availableItems = items.filter(
    (item) => item.kind === 'expense' && (!item.parentItemId || item.parentItemId === group?.id),
  );

  const saveMutation = useMutation({
    mutationFn: () => savePlanGroup(planId, name, Array.from(selectedIds), group?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
      await queryClient.invalidateQueries({ queryKey: ['plan-previous'] });
      toast.success(group ? 'Grupo actualizado' : 'Grupo creado');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlanGroup(group!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
      await queryClient.invalidateQueries({ queryKey: ['plan-previous'] });
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
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <AlertDialogContent className="max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{group ? 'Editar grupo' : 'Agrupar partidas'}</AlertDialogTitle>
          <AlertDialogDescription>
            El grupo muestra la suma de sus subpartidas. El sobrante cuenta cada subpartida una sola vez.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label htmlFor="plan-group-name" className="block text-sm font-medium">Nombre del grupo</label>
          <Input
            id="plan-group-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="TC NU"
            disabled={pending}
          />
          <p className="text-xs font-semibold text-muted-foreground">Subpartidas</p>
          <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border">
            {availableItems.length ? availableItems.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  disabled={pending}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatCOP(item.plannedAmount)}</span>
              </label>
            )) : <p className="p-3 text-sm text-muted-foreground">No hay partidas disponibles.</p>}
          </div>
          <p className="text-right text-sm font-semibold">
            Total: {formatCOP(availableItems.filter((item) => selectedIds.has(item.id)).reduce((sum, item) => sum + item.plannedAmount, 0))}
          </p>
        </div>

        <AlertDialogFooter>
          {group && (
            <Button variant="ghost" className="mr-auto text-destructive" disabled={pending} onClick={() => deleteMutation.mutate()}>
              Desagrupar
            </Button>
          )}
          <AlertDialogCancel disabled={pending} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          <Button disabled={pending || !name.trim() || selectedIds.size === 0} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar grupo'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
