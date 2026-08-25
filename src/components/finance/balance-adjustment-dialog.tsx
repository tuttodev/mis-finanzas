'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCOP, formatCOPInput, parseCurrencyInput, roundCurrencyAmount, todayIsoDate } from '@/lib/formatters';
import { adjustAccountBalance } from '@/services/finance';
import type { Account } from '@/types/finance';

type BalanceAdjustmentDialogProps = {
  account: Account;
  className?: string;
};

export function BalanceAdjustmentDialog({ account, className }: BalanceAdjustmentDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [description, setDescription] = useState('Ajuste de saldo');

  const targetNumber = parseCurrencyInput(targetValue, { allowZero: true });
  const difference =
    targetNumber !== null
      ? roundCurrencyAmount(targetNumber - account.currentBalance)
      : null;

  const canSubmit = targetNumber !== null && difference !== 0;

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (targetNumber === null || difference === 0) {
        throw new Error('Ingresa un nuevo saldo diferente al actual');
      }
      return adjustAccountBalance({
        account,
        targetBalance: targetNumber,
        date,
        description: description.trim() || 'Ajuste de saldo',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(
        targetNumber !== null
          ? `Saldo ajustado exitosamente a ${formatCOP(targetNumber)}`
          : 'Saldo ajustado exitosamente',
      );
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al ajustar el saldo');
    },
  });

  function handleOpen() {
    setTargetValue(
      account.currentBalance !== 0
        ? formatCOPInput(account.currentBalance)
        : '',
    );
    setDate(todayIsoDate());
    setDescription('Ajuste de saldo');
    setOpen(true);
  }

  return (
    <>
      <Button
        className={className}
        size="lg"
        variant="outline"
        onClick={handleOpen}
      >
        <Scale className="h-4 w-4" />
        Ajustar saldo
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Ajustar saldo de {account.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Escribe el saldo real actual. El sistema calculará la diferencia y creará la transacción de ajuste automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-1">
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
              <p className="text-xs font-medium text-muted-foreground">Saldo registrado en la app</p>
              <p className="tabular mt-0.5 font-display text-xl font-bold">
                {formatCOP(account.currentBalance)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-balance">Nuevo saldo real</Label>
              <CurrencyInput
                id="target-balance"
                value={targetValue}
                onValueChange={setTargetValue}
                placeholder="0"
                autoFocus
              />
            </div>

            {targetNumber !== null && difference !== null && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs transition-colors ${
                  difference === 0
                    ? 'border-border bg-secondary/30 text-muted-foreground'
                    : difference > 0
                      ? 'border-income/30 bg-income/10 text-income'
                      : 'border-expense/30 bg-expense/10 text-expense'
                }`}
              >
                {difference === 0 ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                ) : difference > 0 ? (
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold">
                    {difference === 0
                      ? 'El saldo ingresado es igual al registrado.'
                      : difference > 0
                        ? `Diferencia: +${formatCOP(difference)}`
                        : `Diferencia: -${formatCOP(Math.abs(difference))}`}
                  </p>
                  <p className="opacity-90">
                    {difference === 0
                      ? 'No se requiere ningún movimiento.'
                      : difference > 0
                        ? 'Se creará automáticamente un Ingreso por esta diferencia.'
                        : 'Se creará automáticamente un Gasto por esta diferencia.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adjust-date">Fecha del ajuste</Label>
                <Input
                  id="adjust-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adjust-desc">Descripción / Nota</Label>
                <Input
                  id="adjust-desc"
                  type="text"
                  value={description}
                  placeholder="Ajuste de saldo"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={adjustMutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSubmit || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate()}
            >
              <Scale className="h-4 w-4" />
              {adjustMutation.isPending ? 'Ajustando...' : 'Aplicar ajuste'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
