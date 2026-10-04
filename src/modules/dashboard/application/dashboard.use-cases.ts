import { repositories } from '@/infrastructure/repositories';
import { DEFAULT_CURRENCY, type Currency } from '@/shared/domain/currency.enum';
import { toIsoDate } from '@/shared/lib/formatters';
import {
  buildDashboardSummary,
  DASHBOARD_RECENT_TRANSACTIONS,
  dashboardRangeStart,
} from '../domain/dashboard-summary';
import type { DashboardData } from '../domain/dashboard.types';

export async function getDashboard(currency: Currency = DEFAULT_CURRENCY): Promise<DashboardData> {
  const now = new Date();
  const [accounts, transactions] = await Promise.all([
    repositories.accounts.list(),
    repositories.transactions.listSince(toIsoDate(dashboardRangeStart(now))),
  ]);

  // Tags are loaded only for the listed transactions to keep the request small.
  const recent = transactions.slice(0, DASHBOARD_RECENT_TRANSACTIONS);
  const tags = await repositories.transactions.getTagsByTransaction(recent.map((transaction) => transaction.id));

  return buildDashboardSummary({
    accounts,
    transactions,
    recentTransactions: recent.map((transaction) => ({ ...transaction, tags: tags.get(transaction.id) ?? [] })),
    currency,
    now,
  });
}
