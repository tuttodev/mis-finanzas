'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Calendar, CreditCard, PiggyBank, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCOP,
  formatCOPInput,
  parseCurrencyInput,
  todayIsoDate,
} from '@/lib/formatters';
import {
  createRefund,
  fetchAccountsOverview,
  fetchRefundedAmount,
  updateRefund,
} from '@/services/finance';
import type { AccountType, EditableTransaction } from '@/types/finance';
import { CategoryBadge } from './category-badge';
import { captureAnalytics } from '@/lib/analytics';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

type RefundFormProps = {
  originalTransaction: EditableTransaction;
  refund?: EditableTransaction;
};

function yesterdayIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function RefundForm({ originalTransaction, refund }: RefundFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(refund);
  const [amount, setAmount] = useState(refund ? formatCOPInput(refund.amount) : '');
  const [description, setDescription] = useState(
    refund?.description ?? `Reembolso de ${originalTransaction.description}`,
  );
  const [date, setDate] = useState(refund?.date ?? todayIsoDate());
  const [selectedAccountId, setSelectedAccountId] = useState(refund?.accountId ?? '');

  const dateChips = [
    { label: 'Hoy', value: todayIsoDate() },
    { label: 'Ayer', value: yesterdayIsoDate() },
  ];

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });
  const refundedQuery = useQuery({
    queryKey: ['refunded-amount', originalTransaction.id, refund?.id ?? null],
    queryFn: () => fetchRefundedAmount(originalTransaction.id, refund?.id),
  });

  const selectedAccount = useMemo(
    () => accountsQuery.data?.find((account) => account.id === selectedAccountId) ?? null,
    [accountsQuery.data, selectedAccountId],
  );
  const alreadyRefunded = refundedQuery.data ?? 0;
  const refundableAmount = Math.max(0, Math.abs(originalTransaction.amount) - alreadyRefunded);
  const parsedAmount = parseCurrencyInput(amount);

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsedAmount) throw new Error('Ingresa un monto válido');
      if (!description.trim()) throw new Error('La descripción es obligatoria');
      if (!date) throw new Error('Selecciona una fecha');
      if (!selectedAccount) throw new Error('Selecciona la cuenta donde recibiste el dinero');
      if (refundedQuery.isLoading) throw new Error('Espera mientras validamos el gasto');
      if (refundedQuery.isError) throw new Error('No se pudo validar el valor disponible');
      if (parsedAmount > refundableAmount) {
        throw new Error(`Solo quedan ${formatCOP(refundableAmount)} por reembolsar`);
      }

      const input = {
        originalTransaction,
        account: selectedAccount,
        amount: parsedAmount,
        date,
        description: description.trim(),
      };

      return refund ? updateRefund(refund.id, input) : createRefund(input);
    },
    onSuccess: async () => {
      captureAnalytics(isEditing ? 'refund_updated' : 'refund_created');
      await queryClient.invalidateQueries();
      toast.success(isEditing ? 'Reembolso actualizado' : 'Reembolso registrado');
      router.replace(`/app/account/${selectedAccountId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={isEditing ? 'Editar reembolso' : 'Registrar reembolso'}
        subtitle="El dinero entrará a la cuenta elegida y reducirá el gasto del presupuesto."
        backHref={refund ? `/app/account/${refund.accountId}` : `/app/transaction/${originalTransaction.id}/edit`}
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-income/10 p-2.5 text-income">
              <RotateCcw className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Gasto original</p>
              <p className="truncate text-base font-semibold">{originalTransaction.description}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {originalTransaction.categoryName && (
                  <CategoryBadge name={originalTransaction.categoryName} />
                )}
                <span className="tabular text-sm font-semibold text-expense">
                  −{formatCOP(Math.abs(originalTransaction.amount))}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-secondary/60 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Ya reembolsado</p>
              <p className="tabular font-semibold">{formatCOP(alreadyRefunded)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponible</p>
              <p className="tabular font-semibold text-income">{formatCOP(refundableAmount)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <Label htmlFor="refund-amount" className="text-xs text-muted-foreground">
            Monto recibido
          </Label>
          <CurrencyInput
            id="refund-amount"
            variant="prominent"
            sign="+"
            value={amount}
            onValueChange={setAmount}
            placeholder="0,00"
            aria-label="Monto reembolsado en pesos colombianos (COP)"
            className="text-income"
          />

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="refund-description">Descripción</Label>
              <Input
                id="refund-description"
                className="mt-1 h-10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="rounded-xl bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="refund-date" className="text-sm font-semibold">Fecha de recepción</Label>
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
                  id="refund-date"
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
          <h3 className="mb-1 text-sm font-semibold">Cuenta que recibió el dinero</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            El saldo de esta cuenta aumentará por el valor del reembolso.
          </p>
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
                      <span className="block break-words text-sm font-semibold leading-snug">
                        {account.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">{account.type}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={mutation.isPending || refundableAmount <= 0}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? 'Guardando...'
            : isEditing
              ? 'Guardar cambios'
              : 'Registrar reembolso'}
        </Button>
      </div>
    </div>
  );
}
