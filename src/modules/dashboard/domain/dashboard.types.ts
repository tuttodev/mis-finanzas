import type { TransactionWithAccount } from '@/modules/transactions/domain/transaction.types';
import type { Currency } from '@/shared/domain/currency.enum';
import type { CategorySpendingComparison } from './category-spending-comparison';

export type MonthlyCashflow = {
  label: string;
  income: number;
  expense: number;
};

export type DailySpend = {
  date: string;
  value: number;
};

export type CategorySpending = {
  label: string;
  value: number;
};

export type DashboardData = {
  balancesByCurrency: Array<{ currency: Currency; balance: number }>;
  monthIncome: number;
  monthExpense: number;
  cashflow: MonthlyCashflow[];
  dailySpend: DailySpend[];
  categorySpending: CategorySpending[];
  recentTransactions: TransactionWithAccount[];
  /** Net spending per category, current month vs. previous month. */
  categoryComparison: CategorySpendingComparison;
};
