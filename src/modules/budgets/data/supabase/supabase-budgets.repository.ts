import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { ensureData, ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { Currency } from '@/shared/domain/currency.enum';
import type { Budget, BudgetCycle, CloseBudgetCycleInput, CreateBudgetInput } from '../../domain/budget.types';
import type { BudgetsRepository } from '../budgets.repository';
import type {
  BudgetCycleDTO,
  BudgetDTO,
  CloseBudgetCycleDTO,
  InsertBudgetCycleDTO,
  InsertBudgetDTO,
  UpdateBudgetDTO,
} from './budget.dto';

function mapBudget(dto: BudgetDTO): Budget {
  return {
    id: dto.id,
    name: dto.name,
    currency: dto.currency,
    limitAmount: dto.limit_amount,
    isActive: dto.is_active,
  };
}

function mapBudgetCycle(dto: BudgetCycleDTO): BudgetCycle {
  return {
    id: dto.id,
    budgetId: dto.budget_id,
    startedAt: dto.started_at,
    endedAt: dto.ended_at ?? null,
    snapshotLimitAmount: dto.snapshot_limit_amount ?? null,
    snapshotSpentAmount: dto.snapshot_spent_amount ?? null,
  };
}

export class SupabaseBudgetsRepository implements BudgetsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listActive(): Promise<Budget[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.Budgets)
      .select('*')
      .eq('is_active', true)
      .order('name');
    return ensureData(data as BudgetDTO[] | null, error).map(mapBudget);
  }

  async get(budgetId: string): Promise<Budget> {
    const { data, error } = await this.client.from(SupabaseTable.Budgets).select('*').eq('id', budgetId).single();
    return mapBudget(ensureData(data as BudgetDTO | null, error));
  }

  async getCurrency(budgetId: string): Promise<Currency> {
    const { data, error } = await this.client
      .from(SupabaseTable.Budgets)
      .select('currency')
      .eq('id', budgetId)
      .single();
    return ensureData(data as { currency: Currency } | null, error).currency;
  }

  async create(input: Omit<CreateBudgetInput, 'startedAt'>): Promise<Budget> {
    const payload: InsertBudgetDTO = {
      name: input.name,
      currency: input.currency,
      limit_amount: input.limitAmount,
    };
    const { data, error } = await this.client.from(SupabaseTable.Budgets).insert(payload).select('*').single();
    return mapBudget(ensureData(data as BudgetDTO | null, error));
  }

  async update(budgetId: string, input: Pick<CreateBudgetInput, 'name' | 'limitAmount'>): Promise<void> {
    const payload: UpdateBudgetDTO = { name: input.name, limit_amount: input.limitAmount };
    const { error } = await this.client.from(SupabaseTable.Budgets).update(payload).eq('id', budgetId);
    ensureSuccess(error);
  }

  async deactivate(budgetId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.Budgets).update({ is_active: false }).eq('id', budgetId);
    ensureSuccess(error);
  }

  async getOpenCycle(budgetId: string): Promise<BudgetCycle | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.BudgetCycles)
      .select('*')
      .eq('budget_id', budgetId)
      .order('started_at', { ascending: false });

    const cycle = ensureData(data as BudgetCycleDTO[] | null, error).find((item) => item.ended_at == null);
    return cycle ? mapBudgetCycle(cycle) : null;
  }

  async getCycle(cycleId: string): Promise<BudgetCycle> {
    const { data, error } = await this.client
      .from(SupabaseTable.BudgetCycles)
      .select('*')
      .eq('id', cycleId)
      .single();
    return mapBudgetCycle(ensureData(data as BudgetCycleDTO | null, error));
  }

  async listClosedCycles(budgetId: string): Promise<BudgetCycle[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.BudgetCycles)
      .select('*')
      .eq('budget_id', budgetId);

    return ensureData(data as BudgetCycleDTO[] | null, error)
      .filter((cycle) => cycle.ended_at != null)
      .sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)))
      .map(mapBudgetCycle);
  }

  async openCycle(budgetId: string, startedAt: string): Promise<void> {
    const payload: InsertBudgetCycleDTO = { budget_id: budgetId, started_at: startedAt };
    const { error } = await this.client.from(SupabaseTable.BudgetCycles).insert(payload);
    ensureSuccess(error);
  }

  async closeCycle(input: CloseBudgetCycleInput): Promise<void> {
    const payload: CloseBudgetCycleDTO = {
      ended_at: input.endedAt,
      snapshot_limit_amount: input.limitAmount,
      snapshot_spent_amount: input.spentAmount,
    };
    const { error } = await this.client
      .from(SupabaseTable.BudgetCycles)
      .update(payload)
      .eq('id', input.cycleId);
    ensureSuccess(error);
  }
}
