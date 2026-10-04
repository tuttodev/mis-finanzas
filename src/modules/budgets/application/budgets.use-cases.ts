import { repositories } from '@/infrastructure/repositories';
import type { Currency } from '@/shared/domain/currency.enum';
import { roundCurrencyAmount } from '@/shared/lib/formatters';
import {
  calculateBudgetProgress,
  calculateSpentAmount,
  toBudgetMovements,
  toBudgetSnapshot,
} from '../domain/budget-progress';
import type {
  Budget,
  BudgetDetail,
  BudgetMovement,
  BudgetProgress,
  BudgetSnapshot,
  BudgetSnapshotDetail,
  CreateBudgetInput,
} from '../domain/budget.types';

/** Converts a YYYY-MM-DD date input into the start of that local day as an ISO timestamp. */
function dateInputToIso(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

async function getCycleSpentAmount(cycleId: string) {
  return calculateSpentAmount(await repositories.transactions.listBudgetCycleAmounts(cycleId));
}

export async function listBudgetOptions(currency?: Currency): Promise<Budget[]> {
  const budgets = await repositories.budgets.listActive();
  return budgets.filter((budget) => !currency || budget.currency === currency);
}

export async function listBudgetProgress(currency?: Currency): Promise<BudgetProgress[]> {
  const budgets = await listBudgetOptions(currency);

  const progress = await Promise.all(
    budgets.map(async (budget) => {
      const cycle = await repositories.budgets.getOpenCycle(budget.id);
      if (!cycle) return null;
      return calculateBudgetProgress(budget, cycle, await getCycleSpentAmount(cycle.id));
    }),
  );

  return progress.filter((item): item is BudgetProgress => item !== null);
}

export async function listBudgetMovements(cycleId: string): Promise<BudgetMovement[]> {
  const [transactions, accounts] = await Promise.all([
    repositories.transactions.listByBudgetCycle(cycleId),
    repositories.accounts.list(),
  ]);
  return toBudgetMovements(transactions, new Map(accounts.map((account) => [account.id, account.name])));
}

export async function getBudgetDetail(budgetId: string): Promise<BudgetDetail> {
  const budget = await repositories.budgets.get(budgetId);
  const openCycle = await repositories.budgets.getOpenCycle(budgetId);

  if (!openCycle) {
    throw new Error('No se encontró un ciclo activo para el presupuesto');
  }

  const [spentAmount, movements, closedCycles] = await Promise.all([
    getCycleSpentAmount(openCycle.id),
    listBudgetMovements(openCycle.id),
    repositories.budgets.listClosedCycles(budgetId),
  ]);

  return {
    progress: calculateBudgetProgress(budget, openCycle, spentAmount),
    movements,
    snapshots: closedCycles
      .map(toBudgetSnapshot)
      .filter((snapshot): snapshot is BudgetSnapshot => snapshot !== null),
  };
}

export async function getBudgetSnapshotDetail(cycleId: string): Promise<BudgetSnapshotDetail> {
  const cycle = await repositories.budgets.getCycle(cycleId);
  const snapshot = toBudgetSnapshot(cycle);

  if (!snapshot) {
    throw new Error('No se encontró un snapshot válido para este ciclo');
  }

  const [movements, currency] = await Promise.all([
    listBudgetMovements(cycleId),
    repositories.budgets.getCurrency(cycle.budgetId),
  ]);
  return { snapshot, movements, currency };
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const budget = await repositories.budgets.create({
    name: input.name,
    currency: input.currency,
    limitAmount: roundCurrencyAmount(input.limitAmount),
  });

  await repositories.budgets.openCycle(
    budget.id,
    input.startedAt ? dateInputToIso(input.startedAt) : new Date().toISOString(),
  );

  return budget;
}

export function updateBudget(budgetId: string, input: CreateBudgetInput): Promise<void> {
  return repositories.budgets.update(budgetId, {
    name: input.name,
    limitAmount: roundCurrencyAmount(input.limitAmount),
  });
}

export function deactivateBudget(budgetId: string): Promise<void> {
  return repositories.budgets.deactivate(budgetId);
}

/** Closes the current cycle with a snapshot of its limit and spending, then opens a new one. */
export async function resetBudget(progress: BudgetProgress, restartDate?: string): Promise<void> {
  const endedAt = new Date().toISOString();

  await repositories.budgets.closeCycle({
    cycleId: progress.currentCycle.id,
    endedAt,
    limitAmount: roundCurrencyAmount(progress.budget.limitAmount),
    spentAmount: roundCurrencyAmount(progress.spentAmount),
  });

  await repositories.budgets.openCycle(
    progress.budget.id,
    restartDate ? dateInputToIso(restartDate) : endedAt,
  );
}
