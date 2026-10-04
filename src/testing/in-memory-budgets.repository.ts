import type { BudgetsRepository } from '@/modules/budgets/data/budgets.repository';
import type {
  Budget,
  BudgetCycle,
  CloseBudgetCycleInput,
  CreateBudgetInput,
} from '@/modules/budgets/domain/budget.types';
import type { Currency } from '@/shared/domain/currency.enum';

export class InMemoryBudgetsRepository implements BudgetsRepository {
  constructor(public budgets: Budget[] = [], public cycles: BudgetCycle[] = []) {}

  private find(budgetId: string) {
    const budget = this.budgets.find((item) => item.id === budgetId);
    if (!budget) throw new Error(`Budget ${budgetId} not found`);
    return budget;
  }

  async listActive(): Promise<Budget[]> {
    return this.budgets.filter((budget) => budget.isActive);
  }

  async get(budgetId: string): Promise<Budget> {
    return this.find(budgetId);
  }

  async getCurrency(budgetId: string): Promise<Currency> {
    return this.find(budgetId).currency;
  }

  async create(input: Omit<CreateBudgetInput, 'startedAt'>): Promise<Budget> {
    const budget: Budget = { id: crypto.randomUUID(), ...input, isActive: true };
    this.budgets.push(budget);
    return budget;
  }

  async update(budgetId: string, input: Pick<CreateBudgetInput, 'name' | 'limitAmount'>): Promise<void> {
    Object.assign(this.find(budgetId), input);
  }

  async deactivate(budgetId: string): Promise<void> {
    this.find(budgetId).isActive = false;
  }

  async getOpenCycle(budgetId: string): Promise<BudgetCycle | null> {
    return this.cycles.find((cycle) => cycle.budgetId === budgetId && !cycle.endedAt) ?? null;
  }

  async getCycle(cycleId: string): Promise<BudgetCycle> {
    const cycle = this.cycles.find((item) => item.id === cycleId);
    if (!cycle) throw new Error(`Cycle ${cycleId} not found`);
    return cycle;
  }

  async listClosedCycles(budgetId: string): Promise<BudgetCycle[]> {
    return this.cycles
      .filter((cycle) => cycle.budgetId === budgetId && cycle.endedAt)
      .sort((a, b) => String(b.endedAt).localeCompare(String(a.endedAt)));
  }

  async openCycle(budgetId: string, startedAt: string): Promise<void> {
    this.cycles.push({ id: crypto.randomUUID(), budgetId, startedAt, endedAt: null });
  }

  async closeCycle(input: CloseBudgetCycleInput): Promise<void> {
    Object.assign(await this.getCycle(input.cycleId), {
      endedAt: input.endedAt,
      snapshotLimitAmount: input.limitAmount,
      snapshotSpentAmount: input.spentAmount,
    });
  }
}
