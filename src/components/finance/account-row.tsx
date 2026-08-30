import Link from 'next/link';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Account, AccountType } from '@/types/finance';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

export function AccountRow({ account, hidden }: { account: Account; hidden?: boolean }) {
  const Icon = TYPE_ICONS[account.type] ?? Banknote;

  return (
    <Link
      href={`/app/account/${account.id}`}
      className="flex items-start gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-secondary/50 sm:items-center"
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary sm:mt-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold leading-snug">{account.name}</span>
        <span className="text-[13px] text-muted-foreground">{account.type}</span>
        <span
          className={`tabular mt-1 text-[15px] font-semibold sm:hidden ${
            account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
          }`}
        >
          {hidden ? '••••••' : formatCurrency(account.currentBalance, account.currency)}
        </span>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
        <span
          className={`tabular text-[15px] font-semibold ${
            account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
          }`}
        >
          {hidden ? '••••••' : formatCurrency(account.currentBalance, account.currency)}
        </span>
      </div>
    </Link>
  );
}
