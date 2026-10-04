import type { CategoriesRepository } from '@/modules/categories/data/categories.repository';
import type { CreateExpenseCategoryInput, ExpenseCategory } from '@/modules/categories/domain/category.types';

export class InMemoryCategoriesRepository implements CategoriesRepository {
  constructor(public categories: ExpenseCategory[] = []) {}

  async list(): Promise<ExpenseCategory[]> {
    return [...this.categories];
  }

  async create(input: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
    const category: ExpenseCategory = {
      id: crypto.randomUUID(),
      slug: input.name.toLowerCase(),
      name: input.name,
      transactionType: input.transactionType,
      isSystem: false,
      hasTransactions: false,
    };
    this.categories.push(category);
    return category;
  }

  async delete(categoryId: string): Promise<void> {
    this.categories = this.categories.filter((category) => category.id !== categoryId);
  }
}
