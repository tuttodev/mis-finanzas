'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPlanSection, deletePlanSection, renamePlanSection } from '@/services/finance';
import type { PlanSection } from '@/types/finance';

type PlanSectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  monthKey: string;
  section?: PlanSection | null;
};

export function PlanSectionDialog({ open, onOpenChange, planId, monthKey, section }: PlanSectionDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(section?.name ?? '');

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['plan', monthKey] }),
    queryClient.invalidateQueries({ queryKey: ['plan-previous'] }),
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (section) await renamePlanSection(section.id, name);
      else await createPlanSection(planId, name);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(section ? 'Sección actualizada' : 'Sección creada');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlanSection(section!.id),
    onSuccess: async () => {
      await invalidate();
      toast.success('Sección eliminada. Sus partidas están en Sin sección.');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{section ? 'Editar sección' : 'Nueva sección'}</AlertDialogTitle>
          <AlertDialogDescription>
            {section
              ? 'Puedes cambiar el nombre o eliminarla. Al eliminarla, sus partidas pasan a Sin sección.'
              : 'Agrupa partidas y grupos bajo un nombre, por ejemplo Obligatorios u Opcionales.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <label htmlFor="plan-section-name" className="mb-1.5 block text-sm font-medium">Nombre</label>
          <Input
            id="plan-section-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            disabled={pending}
            placeholder="Nombre de la sección"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          {section && (
            <Button variant="ghost" className="mr-auto text-destructive" disabled={pending} onClick={() => deleteMutation.mutate()}>
              Eliminar
            </Button>
          )}
          <AlertDialogCancel disabled={pending} onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          <Button disabled={pending || !name.trim()} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar sección'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
