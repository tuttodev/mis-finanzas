import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { ensureData, ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import type { Currency } from '@/shared/domain/currency.enum';
import { PlanItemType, type PlanItemKind } from '../../domain/plan-item-type.enum';
import type {
  MonthlyPlan,
  PlanItem,
  PlanItemPatch,
  PlanItemPlacement,
  PlanItemRecord,
  PlanSection,
} from '../../domain/plan.types';
import type { PlansRepository } from '../plans.repository';
import type {
  InsertMonthlyPlanDTO,
  InsertPlanItemDTO,
  MonthlyPlanDTO,
  PlanItemDTO,
  PlanSectionDTO,
  UpdatePlanItemDTO,
} from './plan.dto';

function mapMonthlyPlan(dto: MonthlyPlanDTO): MonthlyPlan {
  return { id: dto.id, month: dto.month, currency: dto.currency, payday: dto.payday ?? null };
}

function mapPlanSection(dto: PlanSectionDTO): PlanSection {
  return { id: dto.id, planId: dto.plan_id, name: dto.name, sortOrder: dto.sort_order };
}

function mapPlanItem(dto: PlanItemDTO, tagIds: string[] = [], actualAmount: number | null = null): PlanItem {
  return {
    id: dto.id,
    planId: dto.plan_id,
    name: dto.name,
    kind: dto.kind,
    plannedAmount: dto.planned_amount,
    parentItemId: dto.parent_item_id ?? null,
    sectionId: dto.section_id ?? null,
    actualAmount,
    note: dto.note,
    isPaid: dto.is_paid,
    budgetId: dto.budget_id,
    categoryId: dto.category_id,
    tagIds,
    sortOrder: dto.sort_order,
  };
}

function toInsertItemDTO(record: PlanItemRecord): InsertPlanItemDTO {
  const dto: InsertPlanItemDTO = {
    plan_id: record.planId,
    name: record.name,
    kind: record.kind,
    planned_amount: record.plannedAmount,
  };
  if (record.parentItemId !== undefined) dto.parent_item_id = record.parentItemId;
  if (record.sectionId !== undefined) dto.section_id = record.sectionId;
  if (record.note !== undefined) dto.note = record.note;
  if (record.budgetId !== undefined) dto.budget_id = record.budgetId;
  if (record.categoryId !== undefined) dto.category_id = record.categoryId;
  if (record.sortOrder !== undefined) dto.sort_order = record.sortOrder;
  return dto;
}

function toUpdateItemDTO(patch: PlanItemPatch): UpdatePlanItemDTO {
  const dto: UpdatePlanItemDTO = {
    name: patch.name,
    planned_amount: patch.plannedAmount,
    note: patch.note,
  };
  if (patch.kind !== undefined) dto.kind = patch.kind;
  if (patch.sectionId !== undefined) dto.section_id = patch.sectionId;
  if (patch.parentItemId !== undefined) dto.parent_item_id = patch.parentItemId;
  if (patch.budgetId !== undefined) dto.budget_id = patch.budgetId;
  if (patch.categoryId !== undefined) dto.category_id = patch.categoryId;
  return dto;
}

export class SupabasePlansRepository implements PlansRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMonth(month: string, currency: Currency): Promise<MonthlyPlan | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.MonthlyPlans)
      .select('*')
      .eq('month', month)
      .eq('currency', currency)
      .maybeSingle();
    ensureSuccess(error);
    return data ? mapMonthlyPlan(data as MonthlyPlanDTO) : null;
  }

  async findPrevious(month: string, currency: Currency): Promise<MonthlyPlan | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.MonthlyPlans)
      .select('*')
      .lt('month', month)
      .eq('currency', currency)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();
    ensureSuccess(error);
    return data ? mapMonthlyPlan(data as MonthlyPlanDTO) : null;
  }

  async getCurrency(planId: string): Promise<Currency> {
    const { data, error } = await this.client
      .from(SupabaseTable.MonthlyPlans)
      .select('currency')
      .eq('id', planId)
      .single();
    return ensureData(data as { currency: Currency } | null, error).currency;
  }

  async create(month: string, currency: Currency): Promise<MonthlyPlan> {
    const payload: InsertMonthlyPlanDTO = { month, currency };
    const { data, error } = await this.client
      .from(SupabaseTable.MonthlyPlans)
      .insert(payload)
      .select('*')
      .single();
    return mapMonthlyPlan(ensureData(data as MonthlyPlanDTO | null, error));
  }

  async delete(planId: string): Promise<void> {
    await this.client.from(SupabaseTable.MonthlyPlans).delete().eq('id', planId);
  }

  async listSections(planId: string): Promise<PlanSection[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanSections)
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order')
      .order('created_at');
    return ensureData(data as PlanSectionDTO[] | null, error).map(mapPlanSection);
  }

  async createSections(
    planId: string,
    sections: Array<Pick<PlanSection, 'name' | 'sortOrder'>>,
  ): Promise<PlanSection[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanSections)
      .insert(sections.map((section) => ({ plan_id: planId, name: section.name, sort_order: section.sortOrder })))
      .select('*');
    return ensureData(data as PlanSectionDTO[] | null, error).map(mapPlanSection);
  }

  async renameSection(sectionId: string, name: string): Promise<void> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanSections)
      .update({ name })
      .eq('id', sectionId)
      .select('id')
      .single();
    ensureData(data as { id: string } | null, error);
  }

  async deleteSection(sectionId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.PlanSections).delete().eq('id', sectionId);
    ensureSuccess(error);
  }

  async listItems(planId: string): Promise<PlanItem[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order')
      .order('created_at');

    const items = ensureData(data as PlanItemDTO[] | null, error);
    const itemIds = items.map((item) => item.id);
    const [tagIdsByItem, actualAmountByItem] = await Promise.all([
      this.getTagIdsByItem(itemIds),
      this.getActualAmountsByItem(itemIds),
    ]);

    return items.map((item) =>
      mapPlanItem(item, tagIdsByItem.get(item.id), actualAmountByItem.get(item.id) ?? null),
    );
  }

  async getItem(itemId: string): Promise<PlanItem> {
    const { data, error } = await this.client.from(SupabaseTable.PlanItems).select('*').eq('id', itemId).single();
    const item = ensureData(data as PlanItemDTO | null, error);
    const tagIdsByItem = await this.getTagIdsByItem([itemId]);
    return mapPlanItem(item, tagIdsByItem.get(itemId));
  }

  async getItemPlacements(planId: string, itemIds: string[]): Promise<PlanItemPlacement[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .select('id, kind, parent_item_id, sort_order')
      .eq('plan_id', planId)
      .in('id', itemIds);
    ensureSuccess(error);
    return ((data ?? []) as Array<Pick<PlanItemDTO, 'id' | 'kind' | 'parent_item_id' | 'sort_order'>>).map(
      (item) => ({
        id: item.id,
        kind: item.kind,
        parentItemId: item.parent_item_id,
        sortOrder: item.sort_order,
      }),
    );
  }

  async createItem(record: PlanItemRecord, tagIds: string[]): Promise<PlanItem> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .insert(toInsertItemDTO(record))
      .select('*')
      .single();
    const item = ensureData(data as PlanItemDTO | null, error);
    const syncedTagIds = await this.syncTags(item.id, tagIds);
    return mapPlanItem(item, syncedTagIds);
  }

  async createItems(records: PlanItemRecord[]): Promise<PlanItem[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .insert(records.map(toInsertItemDTO))
      .select('*');
    return ensureData(data as PlanItemDTO[] | null, error).map((dto) => mapPlanItem(dto, []));
  }

  async updateItem(itemId: string, patch: PlanItemPatch, tagIds: string[]): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.PlanItems).update(toUpdateItemDTO(patch)).eq('id', itemId);
    ensureSuccess(error);
    await this.syncTags(itemId, tagIds);
  }

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.PlanItems).delete().eq('id', itemId);
    ensureSuccess(error);
  }

  async deleteItemsOfKinds(planId: string, kinds: PlanItemKind[]): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTable.PlanItems)
      .delete()
      .eq('plan_id', planId)
      .in('kind', kinds);
    ensureSuccess(error);
  }

  async setItemPaid(itemId: string, isPaid: boolean): Promise<void> {
    const { error } = await this.client.from(SupabaseTable.PlanItems).update({ is_paid: isPaid }).eq('id', itemId);
    ensureSuccess(error);
  }

  async reorderItems(updates: Array<{ id: string; sortOrder: number }>): Promise<void> {
    const results = await Promise.all(
      updates.map(({ id, sortOrder }) =>
        this.client.from(SupabaseTable.PlanItems).update({ sort_order: sortOrder }).eq('id', id),
      ),
    );
    ensureSuccess(results.find((result) => result.error)?.error ?? null);
  }

  async moveItemToSection(itemId: string, sectionId: string | null): Promise<void> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .update({ parent_item_id: null, section_id: sectionId })
      .eq('id', itemId)
      .in('kind', [PlanItemType.Expense, PlanItemType.Group])
      .select('id')
      .single();
    ensureData(data as { id: string } | null, error);
  }

  async renameGroup(planId: string, groupId: string, name: string, sectionId: string | null): Promise<void> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .update({ name, section_id: sectionId })
      .eq('id', groupId)
      .eq('plan_id', planId)
      .eq('kind', PlanItemType.Group)
      .select('id')
      .single();
    ensureData(data as { id: string } | null, error);
  }

  async listGroupMemberIds(groupId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .select('id')
      .eq('parent_item_id', groupId);
    ensureSuccess(error);
    return (data ?? []).map((item) => item.id as string);
  }

  async getGroupSectionId(groupId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .select('id, section_id')
      .eq('id', groupId)
      .eq('kind', PlanItemType.Group)
      .single();
    return ensureData(data as { id: string; section_id: string | null } | null, error).section_id;
  }

  async ungroupItems(itemIds: string[], sectionId: string | null): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTable.PlanItems)
      .update({ parent_item_id: null, section_id: sectionId })
      .in('id', itemIds);
    ensureSuccess(error);
  }

  async releaseGroupMembers(groupId: string, sectionId: string | null): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTable.PlanItems)
      .update({ parent_item_id: null, section_id: sectionId })
      .eq('parent_item_id', groupId);
    ensureSuccess(error);
  }

  async linkExpensesToGroup(planId: string, groupId: string, itemIds: string[]): Promise<number> {
    const { data, error } = await this.client
      .from(SupabaseTable.PlanItems)
      .update({ parent_item_id: groupId, section_id: null })
      .eq('plan_id', planId)
      .eq('kind', PlanItemType.Expense)
      .in('id', itemIds)
      .select('id');
    ensureSuccess(error);
    return data?.length ?? 0;
  }

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await this.client
      .from(SupabaseTable.PlanItems)
      .delete()
      .eq('id', groupId)
      .eq('kind', PlanItemType.Group);
    ensureSuccess(error);
  }

  private async getActualAmountsByItem(itemIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!itemIds.length) return result;

    const { data, error } = await this.client
      .from(SupabaseTable.Transactions)
      .select('plan_item_id, amount')
      .in('plan_item_id', itemIds);
    ensureSuccess(error);

    for (const row of (data ?? []) as Array<{ plan_item_id: string; amount: number }>) {
      if (!row.plan_item_id) continue;
      // Expenses are stored as negative amounts; the plan shows absolute values.
      result.set(row.plan_item_id, (result.get(row.plan_item_id) ?? 0) + Math.abs(row.amount));
    }

    return result;
  }

  private async getTagIdsByItem(itemIds: string[]): Promise<Map<string, string[]>> {
    const tagsByItem = new Map<string, string[]>();
    if (!itemIds.length) return tagsByItem;

    const { data, error } = await this.client
      .from(SupabaseTable.PlanItemTags)
      .select('plan_item_id, tag_id')
      .in('plan_item_id', itemIds);
    const links = ensureData(data as Array<{ plan_item_id: string; tag_id: string }> | null, error);

    for (const link of links) {
      const tagIds = tagsByItem.get(link.plan_item_id) ?? [];
      tagIds.push(link.tag_id);
      tagsByItem.set(link.plan_item_id, tagIds);
    }

    return tagsByItem;
  }

  /** Replaces the tags of a plan item and returns the unique tag IDs. */
  private async syncTags(itemId: string, tagIds: string[]): Promise<string[]> {
    const selectedTagIds = Array.from(new Set(tagIds));
    const { error: deleteError } = await this.client
      .from(SupabaseTable.PlanItemTags)
      .delete()
      .eq('plan_item_id', itemId);
    ensureSuccess(deleteError);

    if (!selectedTagIds.length) return selectedTagIds;

    const { error: insertError } = await this.client.from(SupabaseTable.PlanItemTags).insert(
      selectedTagIds.map((tagId) => ({ plan_item_id: itemId, tag_id: tagId })),
    );
    ensureSuccess(insertError);
    return selectedTagIds;
  }
}
