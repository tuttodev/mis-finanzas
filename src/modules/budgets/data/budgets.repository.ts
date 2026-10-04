import type { Currency } from '@/shared/domain/currency.enum';
import type { Budget, BudgetCycle, CloseBudgetCycleInput, CreateBudgetInput } from '../domain/budget.types';

export interface BudgetsRepository {
  /** Active budgets ordered by name. */
  listActive(): Promise<Budget[]>;
  get(budgetId: string): Promise<Budget>;
  getCurrency(budgetId: string): Promise<Currency>;
  create(input: Omit<CreateBudgetInput, 'startedAt'>): Promise<Budget>;
  update(budgetId: string, input: Pick<CreateBudgetInput, 'name' | 'limitAmount'>): Promise<void>;
  deactivate(budgetId: string): Promise<void>;
  /** The cycle of a budget without an end date, if any. */
  getOpenCycle(budgetId: string): Promise<BudgetCycle | null>;
  getCycle(cycleId: string): Promise<BudgetCycle>;
  /** Closed cycles of a budget, most recently closed first. */
  listClosedCycles(budgetId: string): Promise<BudgetCycle[]>;
  openCycle(budgetId: string, startedAt: string): Promise<void>;
  closeCycle(input: CloseBudgetCycleInput): Promise<void>;
}
