'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
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
import { createPlanItem, deletePlanItem, fetchPlanItem, updatePlanItem } from '@/services/finance';
import type { PlanItemKind } from '@/types/finance';

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

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (itemQuery.data && loadedItemId !== itemQuery.data.id) {
    setLoadedItemId(itemQuery.data.id);
    setName(itemQuery.data.name);
    setAmount(formatCOPInput(itemQuery.data.plannedAmount));
    setNote(itemQuery.data.note ?? '');
  }

  const kind: PlanItemKind = itemQuery.data?.kind ?? kindParam ?? 'expense';
  const parsedAmount = parseCurrencyInput(amount);

  const invalidatePlanQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plan'] }),
      queryClient.invalidateQueries({ queryKey: ['plan-previous'] }),
    ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (!parsedAmount) throw new Error('Ingresa un monto válido');

      if (itemId) {
        await updatePlanItem(itemId, { name: name.trim(), plannedAmount: parsedAmount, note });
      } else {
        if (!planId) throw new Error('No se encontró el plan');
        await createPlanItem({
          planId,
          name: name.trim(),
          kind,
          plannedAmount: parsedAmount,
          note,
        });
      }
    },
    onSuccess: async () => {
      await invalidatePlanQueries();
      toast.success(itemId ? 'Partida actualizada' : 'Partida creada');
      router.back();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlanItem(itemId!),
    onSuccess: async () => {
      await invalidatePlanQueries();
      toast.success('Partida eliminada');
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

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={itemId ? 'Editar partida' : kind === 'income' ? 'Nuevo ingreso' : 'Nueva partida'}
        backHref="/plan"
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
              placeholder={kind === 'income' ? 'Salario neto' : 'Arriendo'}
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
              placeholder="Va pa'la TC"
              maxLength={120}
            />
          </div>

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
              Eliminar partida
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar partida"
        description="Esta partida se eliminará del plan de este mes."
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
