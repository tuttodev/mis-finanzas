'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP, parseCurrencyInput, todayIsoDate } from '@/lib/formatters';
import { createTransfer, fetchAccountsOverview } from '@/services/finance';
import type { Account, AccountType } from '@/types/finance';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

type TransferFormProps = {
  initialFromAccountId?: string;
};

type AccountPickerProps = {
  accounts: Account[];
  selectedId: string;
  disabledId?: string;
  onSelect: (accountId: string) => void;
};

function AccountPicker({ accounts, selectedId, disabledId, onSelect }: AccountPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {accounts.map((account) => {
        const Icon = TYPE_ICONS[account.type] ?? Banknote;
        const active = selectedId === account.id;
        const disabled = disabledId === account.id;
        return (
          <button
            key={account.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(account.id)}
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
              active
                ? 'border-primary/60 bg-primary/10'
                : 'border-border hover:border-muted-foreground/40'
            } ${disabled ? 'opacity-40' : ''}`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{account.name}</span>
              <span className="tabular block text-xs text-muted-foreground">
                {formatCOP(account.currentBalance)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function yesterdayIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function TransferForm({ initialFromAccountId = '' }: TransferFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [fromAccountId, setFromAccountId] = useState(initialFromAccountId);
  const [toAccountId, setToAccountId] = useState('');

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
  });

  const fromAccount = useMemo(
    () => accountsQuery.data?.find((account) => account.id === fromAccountId) ?? null,
    [accountsQuery.data, fromAccountId],
  );
  const toAccount = useMemo(
    () => accountsQuery.data?.find((account) => account.id === toAccountId) ?? null,
    [accountsQuery.data, toAccountId],
  );

  const parsedAmount = parseCurrencyInput(amount);

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsedAmount) throw new Error('Ingresa un monto válido');
      if (!date) throw new Error('Selecciona una fecha');
      if (!fromAccount) throw new Error('Selecciona la cuenta de origen');
      if (!toAccount) throw new Error('Selecciona la cuenta de destino');

      return createTransfer({
        fromAccount,
        toAccount,
        amount: parsedAmount,
        date,
        description:
          description.trim() || `Transferencia: ${fromAccount.name} → ${toAccount.name}`,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Transferencia registrada');
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
        title="Transferir entre cuentas"
        backHref={initialFromAccountId ? `/account/${initialFromAccountId}` : '/accounts'}
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Monto en pesos colombianos
          </Label>
          <CurrencyInput
            id="amount"
            variant="prominent"
            value={amount}
            onValueChange={setAmount}
            placeholder="0,00"
            aria-label="Monto en pesos colombianos (COP)"
          />

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                className="mt-1 h-10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Pago tarjeta de crédito"
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

        {accountsQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : accountsQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-expense">No se pudieron cargar las cuentas.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Desde</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Cuenta de la que sale el dinero.
              </p>
              <AccountPicker
                accounts={accountsQuery.data ?? []}
                selectedId={fromAccountId}
                disabledId={toAccountId}
                onSelect={setFromAccountId}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Hacia</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Cuenta a la que entra el dinero.
              </p>
              <AccountPicker
                accounts={accountsQuery.data ?? []}
                selectedId={toAccountId}
                disabledId={fromAccountId}
                onSelect={setToAccountId}
              />
            </div>
          </>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando...' : 'Transferir'}
        </Button>
      </div>
    </div>
  );
}
