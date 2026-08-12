'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/error-state';
import { formatCOPInput, parseCurrencyInput } from '@/lib/formatters';
import { createAccount, fetchAccountsOverview, updateAccount } from '@/services/finance';
import type { Account, AccountType } from '@/types/finance';

const ACCOUNT_TYPES: Array<{
  type: AccountType;
  description: string;
  icon: typeof PiggyBank;
}> = [
  { type: 'Ahorros', description: 'Cuenta bancaria o de ahorro', icon: PiggyBank },
  { type: 'Crédito', description: 'Tarjeta o línea de crédito', icon: CreditCard },
  { type: 'Efectivo', description: 'Dinero disponible en efectivo', icon: Banknote },
];

type AccountFormProps = {
  accountId?: string;
};

export function AccountForm({ accountId }: AccountFormProps) {
  const isEditing = Boolean(accountId);
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccountsOverview,
    enabled: isEditing,
  });
  const account = accountsQuery.data?.find((item) => item.id === accountId);

  if (isEditing && accountsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (accountsQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message={accountsQuery.error.message} />
      </div>
    );
  }

  if (isEditing && !account) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <ErrorState message="No se encontró la cuenta solicitada." />
      </div>
    );
  }

  return <AccountFormFields account={account} accountId={accountId} />;
}

type AccountFormFieldsProps = {
  account?: Account;
  accountId?: string;
};

function AccountFormFields({ account, accountId }: AccountFormFieldsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = Boolean(accountId);
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'Ahorros');
  const [creditLimit, setCreditLimit] = useState(
    account?.creditLimit == null ? '' : formatCOPInput(account.creditLimit),
  );

  const mutation = useMutation({
    mutationFn: () => {
      const parsedCreditLimit = type === 'Crédito' ? parseCurrencyInput(creditLimit) : null;
      if (type === 'Crédito' && !parsedCreditLimit) {
        throw new Error('Ingresa un cupo válido para la tarjeta');
      }

      const input = { name, type, creditLimit: parsedCreditLimit };
      return isEditing
        ? updateAccount(accountId!, input)
        : createAccount(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(isEditing ? 'Cuenta actualizada' : 'Cuenta creada');
      router.push(isEditing ? `/account/${accountId}` : '/accounts');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title={isEditing ? 'Editar cuenta' : 'Nueva cuenta'}
        backHref={isEditing ? `/account/${accountId}` : '/accounts'}
      />

      <form
        className="rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="account-name">Nombre</Label>
            <Input
              id="account-name"
              className="mt-1 h-10"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cuenta de nómina"
              maxLength={80}
              autoFocus={!isEditing}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Tipo de cuenta</legend>
            <div className="mt-2 space-y-2">
              {ACCOUNT_TYPES.map((option) => {
                const active = type === option.type;
                const Icon = option.icon;

                return (
                  <button
                    key={option.type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(option.type)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary ${
                        active ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{option.type}</span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {type === 'Crédito' && (
            <div>
              <Label htmlFor="credit-limit">Cupo de la tarjeta</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Este valor se usará para calcular el cupo disponible y la deuda actual.
              </p>
              <CurrencyInput
                id="credit-limit"
                className="mt-2 h-10"
                value={creditLimit}
                onValueChange={setCreditLimit}
                placeholder="0,00"
                aria-label="Cupo de la tarjeta en pesos colombianos"
              />
            </div>
          )}

          <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
