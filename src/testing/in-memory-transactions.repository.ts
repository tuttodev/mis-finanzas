import type { Tag } from '@/modules/tags/domain/tag.types';
import type { TransactionsRepository } from '@/modules/transactions/data/transactions.repository';
import { TransactionKind } from '@/modules/transactions/domain/transaction-kind.enum';
import type {
  Transaction,
  TransactionDescriptionRow,
  TransactionRecord,
} from '@/modules/transactions/domain/transaction.types';

type StoredTransaction = Transaction & { planItemId: string | null; createdAt: string };

/** Keeps transactions in memory, newest first, mirroring the Supabase adapter's ordering. */
export class InMemoryTransactionsRepository implements TransactionsRepository {
  transactions: StoredTransaction[] = [];
  tagsByTransaction = new Map<string, Tag[]>();

  constructor(private readonly tags: Tag[] = []) {}

  seed(records: TransactionRecord[]): Transaction[] {
    return records.map((record) => this.store(record));
  }

  private store(record: TransactionRecord, id: string = crypto.randomUUID()): StoredTransaction {
    const transaction: StoredTransaction = {
      id,
      accountId: record.accountId,
      budgetCycleId: record.budgetCycleId ?? null,
      categoryId: record.categoryId ?? null,
      categoryName: null,
      categorySlug: null,
      date: record.date,
      description: record.description,
      amount: record.amount,
      transferId: record.transferId ?? null,
      kind: record.kind ?? TransactionKind.Regular,
      relatedTransactionId: record.relatedTransactionId ?? null,
      isPlanned: record.isPlanned ?? null,
      planItemId: record.planItemId ?? null,
      tags: [],
      createdAt: new Date().toISOString(),
    };
    this.transactions = [transaction, ...this.transactions.filter((item) => item.id !== id)]
      .sort((a, b) => b.date.localeCompare(a.date));
    return transaction;
  }

  private syncTags(transactionId: string, tagIds: string[]): Tag[] {
    const selected = this.tags.filter((tag) => tagIds.includes(tag.id));
    this.tagsByTransaction.set(transactionId, selected);
    return selected;
  }

  async listByAccount(accountId: string) {
    return this.transactions.filter((item) => item.accountId === accountId);
  }

  async listSince(fromDate: string) {
    return this.transactions.filter((item) => item.date >= fromDate);
  }

  async listByBudgetCycle(cycleId: string) {
    return this.transactions.filter((item) => item.budgetCycleId === cycleId);
  }

  async listBudgetCycleAmounts(cycleId: string) {
    return (await this.listByBudgetCycle(cycleId)).map(({ amount, kind }) => ({ amount, kind }));
  }

  async get(transactionId: string) {
    const transaction = this.transactions.find((item) => item.id === transactionId);
    if (!transaction) throw new Error(`Transaction ${transactionId} not found`);
    return { ...transaction, tags: this.tagsByTransaction.get(transactionId) ?? [] };
  }

  async getTagsByTransaction(transactionIds: string[]) {
    return new Map(transactionIds.map((id) => [id, this.tagsByTransaction.get(id) ?? []]));
  }

  async listRecentDescriptions(limit: number): Promise<TransactionDescriptionRow[]> {
    return this.transactions.slice(0, limit).map((item) => ({
      description: item.description,
      categoryId: item.categoryId,
      createdAt: item.createdAt,
      date: item.date,
    }));
  }

  async listRefundAmounts(transactionId: string, excludeRefundId?: string) {
    return this.transactions
      .filter((item) =>
        item.kind === TransactionKind.Refund &&
        item.relatedTransactionId === transactionId &&
        item.id !== excludeRefundId)
      .map((item) => item.amount);
  }

  async create(record: TransactionRecord, tagIds: string[]) {
    const transaction = this.store(record);
    return { ...transaction, tags: this.syncTags(transaction.id, tagIds) };
  }

  async createMany(records: TransactionRecord[]) {
    records.forEach((record) => this.store(record));
  }

  async update(transactionId: string, record: TransactionRecord, tagIds: string[]) {
    await this.get(transactionId);
    const transaction = this.store(record, transactionId);
    return { ...transaction, tags: this.syncTags(transactionId, tagIds) };
  }

  async getTransferId(transactionId: string) {
    return (await this.get(transactionId)).transferId;
  }

  async delete(transactionId: string) {
    this.transactions = this.transactions.filter((item) => item.id !== transactionId);
  }

  async deleteTransfer(transferId: string) {
    this.transactions = this.transactions.filter((item) => item.transferId !== transferId);
  }
}
