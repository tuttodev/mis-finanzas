import type { Tag } from '@/modules/tags/domain/tag.types';
import type {
  Transaction,
  TransactionDescriptionRow,
  TransactionRecord,
} from '../domain/transaction.types';

export interface TransactionsRepository {
  /** Transactions of one account, newest first, with category and tags. */
  listByAccount(accountId: string): Promise<Transaction[]>;
  /** Transactions dated on or after `fromDate` (YYYY-MM-DD), newest first, with category and without tags. */
  listSince(fromDate: string): Promise<Transaction[]>;
  /** Transactions assigned to a budget cycle, newest first, with category and without tags. */
  listByBudgetCycle(cycleId: string): Promise<Transaction[]>;
  /** Signed amount and kind of every transaction assigned to a budget cycle. */
  listBudgetCycleAmounts(cycleId: string): Promise<Array<Pick<Transaction, 'amount' | 'kind'>>>;
  get(transactionId: string): Promise<Transaction>;
  getTagsByTransaction(transactionIds: string[]): Promise<Map<string, Tag[]>>;
  listRecentDescriptions(limit: number): Promise<TransactionDescriptionRow[]>;
  /** Amounts of refunds linked to a transaction, optionally excluding one refund. */
  listRefundAmounts(transactionId: string, excludeRefundId?: string): Promise<number[]>;
  create(record: TransactionRecord, tagIds: string[]): Promise<Transaction>;
  createMany(records: TransactionRecord[]): Promise<void>;
  update(transactionId: string, record: TransactionRecord, tagIds: string[]): Promise<Transaction>;
  getTransferId(transactionId: string): Promise<string | null>;
  delete(transactionId: string): Promise<void>;
  /** Deletes both sides of a transfer. */
  deleteTransfer(transferId: string): Promise<void>;
}
