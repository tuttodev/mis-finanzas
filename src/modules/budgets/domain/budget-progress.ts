import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import type { Budget, BudgetCycle, BudgetMovement, BudgetProgress, BudgetSnapshot } from './budget.types';

/** Spending of a cycle: expenses add their absolute amount and refunds subtract theirs. */
export function calculateSpentAmount(rows: Array<Pick<Transaction, 'amount' | 'kind'>>) {
  return rows.reduce((total, row) => {
    if (row.amount < 0) return total + Math.abs(row.amount);
    if (row.kind === TransactionKind.Refund) return total - row.amount;
    return total;
  }, 0);
}

export function calculateBudgetProgress(
  budget: Budget,
  cycle: BudgetCycle,
  spentAmount: number,
): BudgetProgress {
  const progress = budget.limitAmount > 0 ? spentAmount / budget.limitAmount : 0;

  return {
    budget,
    currentCycle: cycle,
    spentAmount,
    remainingAmount: budget.limitAmount - spentAmount,
    progress,
    percentage: progress * 100,
  };
}

/** A closed cycle with stored limit and spending becomes a snapshot; open cycles do not. */
export function toBudgetSnapshot(cycle: BudgetCycle): BudgetSnapshot | null {
  if (!cycle.endedAt || cycle.snapshotLimitAmount == null || cycle.snapshotSpentAmount == null) {
    return null;
  }

  const percentage = cycle.snapshotLimitAmount > 0
    ? (cycle.snapshotSpentAmount / cycle.snapshotLimitAmount) * 100
    : 0;

  return {
    id: cycle.id,
    budgetId: cycle.budgetId,
    startedAt: cycle.startedAt,
    endedAt: cycle.endedAt,
    limitAmount: cycle.snapshotLimitAmount,
    spentAmount: cycle.snapshotSpentAmount,
    percentage,
  };
}

/** Budget movements are expenses and refunds; income in the cycle is not shown. */
export function toBudgetMovements(
  transactions: Transaction[],
  accountNames: Map<string, string>,
): BudgetMovement[] {
  return transactions
    .filter((transaction) => transaction.amount < 0 || transaction.kind === TransactionKind.Refund)
    .map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      accountName: accountNames.get(transaction.accountId) ?? 'Cuenta desconocida',
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      categoryName: transaction.categoryName,
      kind: transaction.kind,
    }));
}
