import { queryOptions } from '@tanstack/react-query';
import { QueryKey } from '@/shared/query/query-key.enum';
import {
  getRefundedAmount,
  getTransaction,
  listAccountTransactions,
  listTransactionDescriptions,
} from './transactions.use-cases';

export const transactionQueries = {
  detail: (transactionId: string) => queryOptions({
    queryKey: [QueryKey.Transaction, transactionId],
    queryFn: () => getTransaction(transactionId),
  }),
  byAccount: (accountId: string) => queryOptions({
    queryKey: [QueryKey.Transactions, accountId],
    queryFn: () => listAccountTransactions(accountId),
  }),
  descriptions: () => queryOptions({
    queryKey: [QueryKey.TransactionDescriptions],
    queryFn: listTransactionDescriptions,
  }),
  refundedAmount: (transactionId: string, excludeRefundId: string | null) => queryOptions({
    queryKey: [QueryKey.RefundedAmount, transactionId, excludeRefundId],
    queryFn: () => getRefundedAmount(transactionId, excludeRefundId ?? undefined),
  }),
};
