import { repositories } from '@/infrastructure/repositories';
import type { CreateExpenseCategoryInput, ExpenseCategory } from '../domain/category.types';

export function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return repositories.categories.list();
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const name = input.name.trim();
  if (!name) throw new Error('El nombre es obligatorio');
  if (name.length > 60) throw new Error('El nombre no puede superar 60 caracteres');

  return repositories.categories.create({ ...input, name });
}

export function deleteExpenseCategory(categoryId: string): Promise<void> {
  return repositories.categories.delete(categoryId);
}
