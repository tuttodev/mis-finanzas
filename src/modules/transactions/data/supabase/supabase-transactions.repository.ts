import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { PostgresErrorCode } from '@/infrastructure/supabase/postgres-error-code.enum';
import { ensureData, ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { CategoriesRepository } from '@/modules/categories/data/categories.repository';
import type { ExpenseCategory } from '@/modules/categories/domain/category.types';
import type { TagDTO } from '@/modules/tags/data/supabase/tag.dto';
import { mapTag } from '@/modules/tags/data/supabase/tag.mapper';
import type { Tag } from '@/modules/tags/domain/tag.types';
import { TransactionKind } from '../../domain/transaction-kind.enum';
import type {
  Transaction,
  TransactionDescriptionRow,
  TransactionRecord,
} from '../../domain/transaction.types';
import type { TransactionsRepository } from '../transactions.repository';
import type { InsertTransactionDTO, TransactionDTO, TransactionTagDTO } from './transaction.dto';

/** Keeps `.in()` filters short enough to avoid URL length limits (400 Bad Request). */
const TAG_LOOKUP_BATCH_SIZE = 50;

function mapTransaction(
  dto: TransactionDTO,
  categories: Map<string, ExpenseCategory> = new Map(),
  tags: Tag[] = [],
): Transaction {
  const categoryId = dto.category_id ?? null;
  const category = categoryId ? categories.get(categoryId) : null;

  return {
    id: dto.id,
    accountId: dto.account_id,
    budgetCycleId: dto.budget_cycle_id ?? null,
    categoryId,
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    date: dto.date,
    description: dto.description,
    amount: dto.amount,
    transferId: dto.transfer_id ?? null,
    kind: dto.kind ?? TransactionKind.Regular,
    relatedTransactionId: dto.related_transaction_id ?? null,
    isPlanned: dto.is_planned ?? null,
    tags,
  };
}

function toInsertDTO(record: TransactionRecord): InsertTransactionDTO {
  const dto: InsertTransactionDTO = {
    account_id: record.accountId,
    date: record.date,
    description: record.description,
    amount: record.amount,
  };
  if (record.budgetCycleId !== undefined) dto.budget_cycle_id = record.budgetCycleId;
  if (record.categoryId !== undefined) dto.category_id = record.categoryId;
  if (record.transferId !== undefined) dto.transfer_id = record.transferId;
  if (record.kind !== undefined) dto.kind = record.kind;
  if (record.relatedTransactionId !== undefined) dto.related_transaction_id = record.relatedTransactionId;
  if (record.isPlanned !== undefined) dto.is_planned = record.isPlanned;
  if (record.planItemId !== undefined) dto.plan_item_id = record.planItemId;
  return dto;
}

export class SupabaseTransactionsRepository implements TransactionsRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly categories: CategoriesRepository,
  ) {}

  private async categoriesById() {
    const categories = await this.categories.list();
    return new Map(categories.map((category) => [category.id, category]));
  }

  private async listWithCategories(
    query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ): Promise<Transaction[]> {
    const [result, categories] = await Promise.all([query, this.categoriesById()]);
    const transactions = ensureData(result.data as TransactionDTO[] | null, result.error);
    return transactions.map((transaction) => mapTransaction(transaction, categories));
  }

  async listByAccount(accountId: string): Promise<Transaction[]> {
    const transactions = await this.listWithCategories(
      this.client
        .from(SupabaseTable.Transactions)
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    );
    const tags = await this.getTagsByTransaction(transactions.map((transaction) => transaction.id));
    return transactions.map((transaction) => ({ ...transaction, tags: tags.get(transaction.id) ?? [] }));
  }

  listSince(fromDate: string): Promise<Transaction[]> {
    return this.listWithCategories(
      this.client
        .from(SupabaseTable.Transactions)
        .select('*')
        .gte('date', fromDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    );
  }

  listByBudgetCycle(cycleId: string): Promise<Transaction[]> {
    return this.listWithCategories(
      this.client
        .from(SupabaseTable.Transactions)
        .select('*')
        .eq('budget_cycle_id', cycleId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
    );
  }

  async listBudgetCycleAmounts(cycleId: string) {
    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .select('amount, kind')
      .eq('budget_cycle_id', cycleId);

    const rows = ensureData(data as Array<{ amount: number; kind?: TransactionKind }> | null, error);
    return rows.map((row) => ({ amount: row.amount, kind: row.kind ?? TransactionKind.Regular }));
  }

  async get(transactionId: string): Promise<Transaction> {
    const [result, categories, tags] = await Promise.all([
      this.client.from(SupabaseTable.Transactions).select('*').eq('id', transactionId).single(),
      this.categoriesById(),
      this.getTagsByTransaction([transactionId]),
    ]);
    const dto = ensureData(result.data as TransactionDTO | null, result.error);
    return mapTransaction(dto, categories, tags.get(transactionId));
  }

  async getTagsByTransaction(transactionIds: string[]): Promise<Map<string, Tag[]>> {
    const tagsByTransaction = new Map<string, Tag[]>();
    if (!transactionIds.length) return tagsByTransaction;

    const { data: tagsData, error: tagsError } = await this.client
      .from(SupabaseTable.Tags)
      .select('*')
      .order('name');
    const tagsById = new Map(
      ensureData(tagsData as TagDTO[] | null, tagsError).map((tag) => [tag.id, mapTag(tag)]),
    );

    const links: TransactionTagDTO[] = [];
    for (let i = 0; i < transactionIds.length; i += TAG_LOOKUP_BATCH_SIZE) {
      const batch = transactionIds.slice(i, i + TAG_LOOKUP_BATCH_SIZE);
      const { data, error } = await this.client
        .from(SupabaseTable.TransactionTags)
        .select('transaction_id, tag_id')
        .in('transaction_id', batch);
      links.push(...ensureData(data as TransactionTagDTO[] | null, error));
    }

    for (const link of links) {
      const tag = tagsById.get(link.tag_id);
      if (!tag) continue;
      const transactionTags = tagsByTransaction.get(link.transaction_id) ?? [];
      transactionTags.push({ id: tag.id, name: tag.name, isSystem: tag.isSystem });
      tagsByTransaction.set(link.transaction_id, transactionTags);
    }

    return tagsByTransaction;
  }

  async listRecentDescriptions(limit: number): Promise<TransactionDescriptionRow[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .select('description, category_id, created_at, date')
      .not('description', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    ensureSuccess(error);
    return (data ?? []).map((row) => ({
      description: row.description,
      categoryId: row.category_id ?? null,
      createdAt: row.created_at ?? null,
      date: row.date ?? null,
    }));
  }

  async listRefundAmounts(transactionId: string, excludeRefundId?: string): Promise<number[]> {
    let query = this.client
      .from(SupabaseTable.Transactions)
      .select('amount')
      .eq('kind', TransactionKind.Refund)
      .eq('related_transaction_id', transactionId);

    if (excludeRefundId) query = query.neq('id', excludeRefundId);

    const { data, error } = await query;
    return ensureData(data as Array<{ amount: number }> | null, error).map((row) => row.amount);
  }

  async create(record: TransactionRecord, tagIds: string[]): Promise<Transaction> {
    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .insert(toInsertDTO(record))
      .select('*')
      .single();
    const transaction = ensureData(data as TransactionDTO | null, error);
    const tags = await this.syncTags(transaction.id, tagIds);
    return mapTransaction(transaction, new Map(), tags);
  }

  async createMany(records: TransactionRecord[]): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTable.Transactions)
      .insert(records.map(toInsertDTO));
    ensureSuccess(error);
  }

  async update(transactionId: string, record: TransactionRecord, tagIds: string[]): Promise<Transaction> {
    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .update(toInsertDTO(record))
      .eq('id', transactionId)
      .select('*')
      .single();
    const transaction = ensureData(data as TransactionDTO | null, error);
    const tags = await this.syncTags(transaction.id, tagIds);
    return mapTransaction(transaction, new Map(), tags);
  }

  async getTransferId(transactionId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .select('transfer_id')
      .eq('id', transactionId)
      .single();
    ensureSuccess(error);
    return (data as { transfer_id: string | null }).transfer_id;
  }

  async delete(transactionId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Transactions).delete().eq('id', transactionId);
    this.ensureDeleted(error);
  }

  async deleteTransfer(transferId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Transactions).delete().eq('transfer_id', transferId);
    this.ensureDeleted(error);
  }

  private ensureDeleted(error: { code?: string; message: string } | null) {
    if (error?.code === PostgresErrorCode.ForeignKeyViolation) {
      throw new Error('Elimina primero los reembolsos asociados a este gasto');
    }
    ensureSuccess(error);
  }

  /** Replaces the tags of a transaction and returns the selected tags ordered by name. */
  private async syncTags(transactionId: string, tagIds: string[]): Promise<Tag[]> {
    const selectedTagIds = Array.from(new Set(tagIds));

    const { error: deleteError } = await this.client
      .from(SupabaseTable.TransactionTags)
      .delete()
      .eq('transaction_id', transactionId);
    ensureSuccess(deleteError);

    if (!selectedTagIds.length) return [];

    const { error: insertError } = await this.client.from(SupabaseTable.TransactionTags).insert(
      selectedTagIds.map((tagId) => ({ transaction_id: transactionId, tag_id: tagId })),
    );
    ensureSuccess(insertError);

    const { data, error } = await this.client
      .from(SupabaseTable.Tags)
      .select('*')
      .in('id', selectedTagIds)
      .order('name');
    return ensureData(data as TagDTO[] | null, error).map((tag) => mapTag(tag));
  }
}
