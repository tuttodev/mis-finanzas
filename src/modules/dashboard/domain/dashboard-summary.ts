import type { Account } from '@/modules/accounts/domain/account.types';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type { Transaction } from '@/modules/transactions/domain/transaction.types';
import { Currency } from '@/shared/domain/currency.enum';
import { toIsoDate } from '@/shared/lib/formatters';
import type { CategorySpending, DailySpend, DashboardData, MonthlyCashflow } from './dashboard.types';

/** Months shown in the cash-flow chart before the current month. */
export const DASHBOARD_MONTHS_BACK = 5;
/** Days shown in the daily-spending chart, including today. */
export const DASHBOARD_DAYS = 30;
/** Most recent transactions listed on the dashboard. */
export const DASHBOARD_RECENT_TRANSACTIONS = 8;

const UNCATEGORIZED_LABEL = 'Sin categoría';
const UNKNOWN_ACCOUNT_LABEL = 'Cuenta desconocida';
const monthLabelFormatter = new Intl.DateTimeFormat('es-CO', { month: 'short' });

/** First day of the oldest month in the cash-flow chart. */
export function dashboardRangeStart(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() - DASHBOARD_MONTHS_BACK, 1);
}

/**
 * Builds the dashboard for one currency. Transfers are neither income nor expense,
 * refunds reduce spending, and amounts in other currencies are never added.
 * `transactions` must be ordered newest first; `recentTransactions` keeps their tags.
 */
export function buildDashboardSummary(params: {
  accounts: Account[];
  transactions: Transaction[];
  recentTransactions: Transaction[];
  currency: Currency;
  now: Date;
}): Omit<DashboardData, 'categoryComparison'> {
  const { accounts, transactions, recentTransactions, currency, now } = params;
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  const balancesByCurrency = Object.values(Currency)
    .map((code) => ({
      currency: code,
      balance: accounts
        .filter((account) => account.currency === code)
        .reduce((sum, account) => sum + account.currentBalance, 0),
    }))
    .filter(({ currency: code }) => accounts.some((account) => account.currency === code));

  const cashflow: MonthlyCashflow[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = DASHBOARD_MONTHS_BACK; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthIndex.set(toIsoDate(month).slice(0, 7), cashflow.length);
    cashflow.push({
      label: monthLabelFormatter.format(month).replace('.', ''),
      income: 0,
      expense: 0,
    });
  }

  const dailySpend: DailySpend[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = DASHBOARD_DAYS - 1; i >= 0; i--) {
    const key = toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    dayIndex.set(key, dailySpend.length);
    dailySpend.push({ date: key, value: 0 });
  }

  const currentMonthKey = toIsoDate(now).slice(0, 7);
  const categoryTotals = new Map<string, number>();

  for (const tx of transactions) {
    if (accountsById.get(tx.accountId)?.currency !== currency) continue;
    if (tx.transferId) continue;

    const isRefund = tx.kind === TransactionKind.Refund;
    const monthIdx = monthIndex.get(tx.date.slice(0, 7));
    if (monthIdx !== undefined) {
      if (isRefund) cashflow[monthIdx].expense -= tx.amount;
      else if (tx.amount >= 0) cashflow[monthIdx].income += tx.amount;
      else cashflow[monthIdx].expense += Math.abs(tx.amount);
    }

    if (tx.amount < 0 || isRefund) {
      const spending = isRefund ? -tx.amount : Math.abs(tx.amount);
      const dayIdx = dayIndex.get(tx.date.slice(0, 10));
      if (dayIdx !== undefined) dailySpend[dayIdx].value += spending;

      if (tx.date.startsWith(currentMonthKey)) {
        const categoryName = tx.categoryId ? tx.categoryName ?? UNCATEGORIZED_LABEL : UNCATEGORIZED_LABEL;
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + spending);
      }
    }
  }

  cashflow.forEach((point) => {
    point.expense = Math.max(0, point.expense);
  });
  dailySpend.forEach((point) => {
    point.value = Math.max(0, point.value);
  });

  const currentMonth = cashflow[cashflow.length - 1];
  const categorySpending: CategorySpending[] = Array.from(categoryTotals, ([label, value]) => ({
    label,
    value,
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    balancesByCurrency,
    monthIncome: currentMonth.income,
    monthExpense: currentMonth.expense,
    cashflow,
    dailySpend,
    categorySpending,
    recentTransactions: recentTransactions.map((transaction) => ({
      ...transaction,
      accountName: accountsById.get(transaction.accountId)?.name ?? UNKNOWN_ACCOUNT_LABEL,
      currency: accountsById.get(transaction.accountId)?.currency ?? Currency.COP,
    })),
  };
}
