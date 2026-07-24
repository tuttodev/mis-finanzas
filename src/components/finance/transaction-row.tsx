import { formatCOP, formatShortDate } from '@/lib/formatters';
import type { Transaction } from '@/types/finance';

import { CategoryBadge } from './category-badge';
import { TransferBadge } from './transfer-badge';

type TransactionRowProps = {
  transaction: Transaction;
  onClick?: () => void;
  hideDate?: boolean;
};

export function TransactionRow({ transaction, onClick, hideDate }: TransactionRowProps) {
  const hasMeta = transaction.categoryName || transaction.transferId || !hideDate;

  return (
    <div
      className={`flex items-center justify-between gap-3 py-2.5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{transaction.description}</span>
        {hasMeta && (
          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
            {transaction.categoryName && <CategoryBadge name={transaction.categoryName} />}
            {transaction.transferId && <TransferBadge />}
            {!hideDate && <span>{formatShortDate(transaction.date)}</span>}
          </span>
        )}
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
