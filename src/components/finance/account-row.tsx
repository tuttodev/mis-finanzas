import Link from 'next/link';
import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { formatCOP } from '@/lib/formatters';
import type { Account, AccountType } from '@/types/finance';

const TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  Ahorros: PiggyBank,
  Crédito: CreditCard,
  Efectivo: Banknote,
};

export function AccountRow({ account }: { account: Account }) {
  const Icon = TYPE_ICONS[account.type] ?? Banknote;

  return (
    <Link
      href={`/account/${account.id}`}
      className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-secondary/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{account.name}</span>
        <span className="text-[13px] text-muted-foreground">{account.type}</span>
      </div>
      <span
        className={`tabular shrink-0 text-[15px] font-semibold ${
          account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
        }`}
      >
        {formatCOP(account.currentBalance)}
      </span>
    </Link>
  );
}
