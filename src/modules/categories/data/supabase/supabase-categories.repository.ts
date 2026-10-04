import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { PostgresErrorCode } from '@/infrastructure/supabase/postgres-error-code.enum';
import { ensureData, ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { CreateExpenseCategoryInput, ExpenseCategory } from '../../domain/category.types';
import type { CategoriesRepository } from '../categories.repository';
import type { ExpenseCategoryDTO, InsertExpenseCategoryDTO } from './category.dto';

function mapExpenseCategory(
  dto: ExpenseCategoryDTO,
  usedCategoryIds: Set<string> = new Set(),
): ExpenseCategory {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    transactionType: dto.transaction_type,
    isSystem: dto.is_system,
    hasTransactions: usedCategoryIds.has(dto.id),
  };
}

export class SupabaseCategoriesRepository implements CategoriesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<ExpenseCategory[]> {
    const [{ data, error }, { data: txData, error: txError }] = await Promise.all([
      this.client
        .from(SupabaseTable.Categories)
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name'),
      this.client.from(SupabaseTable.Transactions).select('category_id').not('category_id', 'is', null),
    ]);

    const categories = ensureData(data as ExpenseCategoryDTO[] | null, error);
    const usedRows = ensureData(txData as { category_id: string }[] | null, txError);
    const usedCategoryIds = new Set(usedRows.map((row) => row.category_id));

    return categories.map((category) => mapExpenseCategory(category, usedCategoryIds));
  }

  async create(input: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
    const payload: InsertExpenseCategoryDTO = {
      name: input.name,
      transaction_type: input.transactionType,
    };
    const { data, error } = await this.client
      .from(SupabaseTable.Categories)
      .insert(payload)
      .select('*')
      .single();

    if (error?.code === PostgresErrorCode.UniqueViolation) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    return mapExpenseCategory(ensureData(data as ExpenseCategoryDTO | null, error));
  }

  async delete(categoryId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Categories).delete().eq('id', categoryId);

    if (error?.code === PostgresErrorCode.ForeignKeyViolation) {
      throw new Error('No puedes eliminar una categoría con transacciones asociadas');
    }
    ensureSuccess(error);
  }
}
