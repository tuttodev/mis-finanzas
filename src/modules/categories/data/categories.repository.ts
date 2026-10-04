import type { CreateExpenseCategoryInput, ExpenseCategory } from '../domain/category.types';

export interface CategoriesRepository {
  /** Active categories ordered for display, flagged when transactions use them. */
  list(): Promise<ExpenseCategory[]>;
  create(input: CreateExpenseCategoryInput): Promise<ExpenseCategory>;
  delete(categoryId: string): Promise<void>;
}
