import type { Currency } from '@/shared/domain/currency.enum';
import type { PlanItemKind } from '../domain/plan-item-type.enum';
import type {
  MonthlyPlan,
  PlanItem,
  PlanItemPatch,
  PlanItemPlacement,
  PlanItemRecord,
  PlanSection,
} from '../domain/plan.types';

export interface PlansRepository {
  findByMonth(month: string, currency: Currency): Promise<MonthlyPlan | null>;
  /** The latest plan before `month` in the same currency. */
  findPrevious(month: string, currency: Currency): Promise<MonthlyPlan | null>;
  getCurrency(planId: string): Promise<Currency>;
  create(month: string, currency: Currency): Promise<MonthlyPlan>;
  delete(planId: string): Promise<void>;

  listSections(planId: string): Promise<PlanSection[]>;
  createSections(planId: string, sections: Array<Pick<PlanSection, 'name' | 'sortOrder'>>): Promise<PlanSection[]>;
  renameSection(sectionId: string, name: string): Promise<void>;
  deleteSection(sectionId: string): Promise<void>;

  /** Items of a plan in display order, with tags and the amount of linked transactions. */
  listItems(planId: string): Promise<PlanItem[]>;
  getItem(itemId: string): Promise<PlanItem>;
  getItemPlacements(planId: string, itemIds: string[]): Promise<PlanItemPlacement[]>;
  createItem(record: PlanItemRecord, tagIds: string[]): Promise<PlanItem>;
  createItems(records: PlanItemRecord[]): Promise<PlanItem[]>;
  updateItem(itemId: string, patch: PlanItemPatch, tagIds: string[]): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  deleteItemsOfKinds(planId: string, kinds: PlanItemKind[]): Promise<void>;
  setItemPaid(itemId: string, isPaid: boolean): Promise<void>;
  reorderItems(updates: Array<{ id: string; sortOrder: number }>): Promise<void>;
  /** Moves an expense or group out of any group into a section (or none). */
  moveItemToSection(itemId: string, sectionId: string | null): Promise<void>;

  renameGroup(planId: string, groupId: string, name: string, sectionId: string | null): Promise<void>;
  listGroupMemberIds(groupId: string): Promise<string[]>;
  getGroupSectionId(groupId: string): Promise<string | null>;
  /** Removes items from their group and places them in a section. */
  ungroupItems(itemIds: string[], sectionId: string | null): Promise<void>;
  /** Moves every member of a group to a section. */
  releaseGroupMembers(groupId: string, sectionId: string | null): Promise<void>;
  /** Links expense items to a group and returns how many were linked. */
  linkExpensesToGroup(planId: string, groupId: string, itemIds: string[]): Promise<number>;
  deleteGroup(groupId: string): Promise<void>;
}
