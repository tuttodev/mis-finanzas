'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { createAccount } from '@/services/finance';
import type { AccountType } from '@/types/finance';

const ACCOUNT_TYPES: Array<{
  type: AccountType;
  description: string;
  icon: typeof PiggyBank;
}> = [
  { type: 'Ahorros', description: 'Cuenta bancaria o de ahorro', icon: PiggyBank },
  { type: 'Crédito', description: 'Tarjeta o línea de crédito', icon: CreditCard },
  { type: 'Efectivo', description: 'Dinero disponible en efectivo', icon: Banknote },
];

export default function AccountFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Ahorros');

  const mutation = useMutation({
    mutationFn: () => createAccount({ name, type }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Cuenta creada');
      router.push('/accounts');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Nueva cuenta" backHref="/accounts" />

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
              autoFocus
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

          <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
