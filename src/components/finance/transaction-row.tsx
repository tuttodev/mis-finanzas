import { formatCOP, formatShortDate } from '@/lib/formatters';
import type { Transaction } from '@/types/finance';

type TransactionRowProps = {
  transaction: Transaction;
  onClick?: () => void;
};

export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{transaction.description}</span>
        <span className="text-[13px] text-muted-foreground">
          {formatShortDate(transaction.date)}
        </span>
      </div>
      <span
        className={`tabular shrink-0 text-[15px] font-semibold ${
          transaction.amount < 0 ? 'text-expense' : 'text-income'
        }`}
      >
        {transaction.amount >= 0 ? '+' : '−'}
        {formatCOP(Math.abs(transaction.amount))}
      </span>
    </div>
  );
}
