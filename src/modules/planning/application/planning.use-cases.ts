import { repositories } from '@/infrastructure/repositories';
import { requireSession } from '@/modules/auth/application/auth.use-cases';
import { DEFAULT_CURRENCY, type Currency } from '@/shared/domain/currency.enum';
import { roundCurrencyAmount } from '@/shared/lib/formatters';
import { PlanItemType } from '../domain/plan-item-type.enum';
import {
  DEFAULT_PLAN_SECTIONS,
  normalizeName,
  PLAN_SORT_STEP,
  planItemKey,
  requireName,
  toCopiedPlanItemRecord,
  toPlanItemRecord,
} from '../domain/plan-rules';
import { summarizePlan } from '../domain/plan-summary';
import type {
  CreatePlanItemInput,
  MonthlyPlan,
  MonthlyPlanSummary,
  ParsedColillaItem,
  ParsedColillaSummary,
  PayrollDocument,
  PlanItem,
  PlanSection,
  UpdatePlanItemInput,
} from '../domain/plan.types';
import { PayrollImportMode } from '../domain/payroll';

const plans = () => repositories.plans;

async function summarize(plan: MonthlyPlan): Promise<MonthlyPlanSummary> {
  const [items, sections] = await Promise.all([plans().listItems(plan.id), plans().listSections(plan.id)]);
  return summarizePlan(plan, items, sections);
}

export async function getMonthlyPlan(
  monthKey: string,
  currency: Currency = DEFAULT_CURRENCY,
): Promise<MonthlyPlanSummary | null> {
  const plan = await plans().findByMonth(monthKey, currency);
  return plan ? summarize(plan) : null;
}

export async function getPreviousPlanSummary(
  monthKey: string,
  currency: Currency = DEFAULT_CURRENCY,
): Promise<MonthlyPlanSummary | null> {
  const plan = await plans().findPrevious(monthKey, currency);
  return plan ? summarize(plan) : null;
}

export function getPlanCurrency(planId: string): Promise<Currency> {
  return plans().getCurrency(planId);
}

export function listPlanSections(planId: string): Promise<PlanSection[]> {
  return plans().listSections(planId);
}

export function getPlanItem(itemId: string): Promise<PlanItem> {
  return plans().getItem(itemId);
}

export async function createBlankPlan(
  monthKey: string,
  currency: Currency = DEFAULT_CURRENCY,
): Promise<MonthlyPlanSummary> {
  const plan = await plans().create(monthKey, currency);
  try {
    const sections = await plans().createSections(plan.id, DEFAULT_PLAN_SECTIONS);
    return summarizePlan(plan, [], sections);
  } catch (sectionError) {
    await plans().delete(plan.id);
    throw sectionError;
  }
}

/** Creates the month's plan as a copy of the previous one, including sections, groups and tags. */
export async function duplicatePreviousPlan(
  monthKey: string,
  currency: Currency = DEFAULT_CURRENCY,
): Promise<MonthlyPlanSummary> {
  const previous = await getPreviousPlanSummary(monthKey, currency);
  if (!previous) throw new Error('No hay un plan anterior para duplicar');

  const plan = await plans().create(monthKey, currency);

  const sectionIds = new Map<string, string>();
  for (const section of previous.sections) {
    const [copied] = await plans().createSections(plan.id, [section]);
    sectionIds.set(section.id, copied.id);
  }
  if (!previous.sections.length) await plans().createSections(plan.id, DEFAULT_PLAN_SECTIONS);

  // Create group rows first, then remap the copied children's parent and section IDs.
  const groupIds = new Map<string, string>();
  for (const item of previous.items.filter((candidate) => candidate.kind === PlanItemType.Group)) {
    const group = await plans().createItem(toCopiedPlanItemRecord(item, plan.id, groupIds, sectionIds), []);
    groupIds.set(item.id, group.id);
  }

  for (const item of previous.items.filter((candidate) => candidate.kind !== PlanItemType.Group)) {
    await plans().createItem(toCopiedPlanItemRecord(item, plan.id, groupIds, sectionIds), item.tagIds);
  }

  return summarize(plan);
}

/** Imports selected items from the previous month, preserving their groups and sections. */
export async function mergeFromPreviousPlan(
  targetPlanId: string,
  monthKey: string,
  selectedItemIds: string[],
  currency: Currency = DEFAULT_CURRENCY,
): Promise<PlanItem[]> {
  if (!selectedItemIds.length) return [];
  if (await plans().getCurrency(targetPlanId) !== currency) {
    throw new Error('La moneda del plan no coincide con la del mes anterior');
  }
  const previous = await getPreviousPlanSummary(monthKey, currency);
  if (!previous) throw new Error('No hay un plan anterior para importar');

  const existingItems = await plans().listItems(targetPlanId);
  const existingKeys = new Set(existingItems.map(planItemKey));
  const toInsert = previous.items.filter(
    (item) =>
      item.kind !== PlanItemType.Group &&
      selectedItemIds.includes(item.id) &&
      !existingKeys.has(planItemKey(item)),
  );
  if (!toInsert.length) return [];

  const sourceGroups = new Map(
    previous.items.filter((item) => item.kind === PlanItemType.Group).map((item) => [item.id, item]),
  );
  const targetSections = await plans().listSections(targetPlanId);
  const sectionIds = new Map<string, string>();
  for (const item of toInsert) {
    const sourceSectionId = item.parentItemId
      ? sourceGroups.get(item.parentItemId)?.sectionId
      : item.sectionId;
    if (!sourceSectionId || sectionIds.has(sourceSectionId)) continue;
    const sourceSection = previous.sections.find((section) => section.id === sourceSectionId);
    if (!sourceSection) continue;
    const existingSection = targetSections.find(
      (section) => normalizeName(section.name) === normalizeName(sourceSection.name),
    );
    if (existingSection) {
      sectionIds.set(sourceSectionId, existingSection.id);
      continue;
    }
    const [newSection] = await plans().createSections(targetPlanId, [sourceSection]);
    targetSections.push(newSection);
    sectionIds.set(sourceSectionId, newSection.id);
  }

  const groupIds = new Map<string, string>();
  for (const item of toInsert) {
    if (!item.parentItemId || groupIds.has(item.parentItemId)) continue;
    const originalGroup = sourceGroups.get(item.parentItemId);
    if (!originalGroup) continue;
    const existingGroup = existingItems.find(
      (candidate) =>
        candidate.kind === PlanItemType.Group &&
        normalizeName(candidate.name) === normalizeName(originalGroup.name),
    );
    if (existingGroup) {
      groupIds.set(originalGroup.id, existingGroup.id);
      continue;
    }
    const group = await plans().createItem(
      toCopiedPlanItemRecord(originalGroup, targetPlanId, groupIds, sectionIds),
      [],
    );
    groupIds.set(originalGroup.id, group.id);
  }

  const inserted: PlanItem[] = [];
  for (const item of toInsert) {
    inserted.push(
      await plans().createItem(toCopiedPlanItemRecord(item, targetPlanId, groupIds, sectionIds), item.tagIds),
    );
  }
  return inserted;
}

/** Groups are summary rows. Their displayed amount comes only from expense children. */
export async function savePlanGroup(
  planId: string,
  name: string,
  memberIds: string[],
  sectionId: string | null,
  groupId?: string,
): Promise<void> {
  const trimmedName = requireName(name, 'El nombre del grupo es obligatorio');
  const ids = Array.from(new Set(memberIds));
  if (!ids.length) throw new Error('Selecciona al menos una subpartida');

  const candidates = await plans().getItemPlacements(planId, ids);
  if (
    candidates.length !== ids.length ||
    candidates.some(
      (item) => item.kind !== PlanItemType.Expense || (item.parentItemId && item.parentItemId !== groupId),
    )
  ) {
    throw new Error('Las subpartidas deben pertenecer a este plan y estar disponibles');
  }

  let targetGroupId = groupId;
  if (groupId) {
    await plans().renameGroup(planId, groupId, trimmedName, sectionId);
    const removedIds = (await plans().listGroupMemberIds(groupId)).filter((id) => !ids.includes(id));
    if (removedIds.length) await plans().ungroupItems(removedIds, sectionId);
  } else {
    const group = await plans().createItem({
      planId,
      name: trimmedName,
      kind: PlanItemType.Group,
      plannedAmount: 0,
      sectionId,
      sortOrder: Math.min(...candidates.map((item) => item.sortOrder)),
    }, []);
    targetGroupId = group.id;
  }

  const removeNewGroup = async () => {
    if (!groupId && targetGroupId) await plans().deleteItem(targetGroupId);
  };

  let linkedCount: number;
  try {
    linkedCount = await plans().linkExpensesToGroup(planId, targetGroupId!, ids);
  } catch (error) {
    await removeNewGroup();
    throw error;
  }
  if (linkedCount !== ids.length) {
    await removeNewGroup();
    throw new Error('No se pudieron agrupar todas las partidas');
  }
}

/** Deletes a group and moves its members to the group's section. */
export async function deletePlanGroup(groupId: string): Promise<void> {
  const sectionId = await plans().getGroupSectionId(groupId);
  await plans().releaseGroupMembers(groupId, sectionId);
  await plans().deleteGroup(groupId);
}

export function movePlanItemToSection(itemId: string, sectionId: string | null): Promise<void> {
  return plans().moveItemToSection(itemId, sectionId);
}

export async function createPlanSection(planId: string, name: string): Promise<PlanSection> {
  const trimmedName = requireName(name);
  const existing = await plans().listSections(planId);
  const sortOrder = Math.max(0, ...existing.map((section) => section.sortOrder)) + PLAN_SORT_STEP;
  const [section] = await plans().createSections(planId, [{ name: trimmedName, sortOrder }]);
  return section;
}

export function renamePlanSection(sectionId: string, name: string): Promise<void> {
  return plans().renameSection(sectionId, requireName(name));
}

export function deletePlanSection(sectionId: string): Promise<void> {
  return plans().deleteSection(sectionId);
}

export function createPlanItem(input: CreatePlanItemInput): Promise<PlanItem> {
  requireName(input.name);
  return plans().createItem(
    toPlanItemRecord(input),
    input.kind === PlanItemType.Expense ? input.tagIds ?? [] : [],
  );
}

export function updatePlanItem(itemId: string, input: UpdatePlanItemInput): Promise<void> {
  const name = requireName(input.name);
  const isExpense = input.kind === PlanItemType.Expense;

  return plans().updateItem(itemId, {
    name,
    plannedAmount: roundCurrencyAmount(input.plannedAmount),
    note: input.note?.trim() || null,
    kind: input.kind,
    ...(input.sectionId !== undefined && {
      sectionId: isExpense ? input.sectionId : null,
      parentItemId: null,
    }),
    ...(input.budgetId !== undefined && { budgetId: input.budgetId }),
    ...(input.categoryId !== undefined && { categoryId: isExpense ? input.categoryId : null }),
  }, isExpense ? input.tagIds ?? [] : []);
}

export function reorderPlanItems(updates: Array<{ id: string; sortOrder: number }>): Promise<void> {
  return plans().reorderItems(updates);
}

export function deletePlanItem(itemId: string): Promise<void> {
  return plans().deleteItem(itemId);
}

export function setPlanItemPaid(itemId: string, isPaid: boolean): Promise<void> {
  return plans().setItemPaid(itemId, isPaid);
}

export function createPlanItemsBatch(planId: string, items: CreatePlanItemInput[]): Promise<PlanItem[]> {
  if (!items.length) return Promise.resolve([]);
  return plans().createItems(
    items.map((item, index) => toPlanItemRecord({ ...item, planId }, (index + 1) * PLAN_SORT_STEP)),
  );
}

/** Replaces the plan's income and deductions with the given payroll items. */
export async function replacePayrollPlanItems(
  planId: string,
  items: CreatePlanItemInput[],
): Promise<PlanItem[]> {
  await plans().deleteItemsOfKinds(planId, [PlanItemType.Income, PlanItemType.Deduction]);
  return createPlanItemsBatch(planId, items);
}

export async function uploadPayrollDocument(planId: string, file: File): Promise<PayrollDocument> {
  const session = await requireSession();
  return repositories.payrollDocuments.upload({ userId: session.user.id, planId, file });
}

export function listPayrollDocuments(planId: string): Promise<PayrollDocument[]> {
  return repositories.payrollDocuments.list(planId);
}

export function createPayrollDocumentSignedUrl(storagePath: string): Promise<string> {
  return repositories.payrollDocuments.createSignedUrl(storagePath);
}

export function downloadPayrollDocument(storagePath: string): Promise<Blob> {
  return repositories.payrollDocuments.download(storagePath);
}

/** Sends a payslip PDF to the server and returns the payroll concepts found in it. */
export async function parsePayslip(file: File): Promise<ParsedColillaSummary> {
  const session = await requireSession();
  const response = await repositories.payslipParser.parse(file, session.accessToken);
  return response.data!;
}

/** Stores the payslip and adds its selected concepts to the plan, replacing earlier payroll items if asked. */
export async function importPayslip(params: {
  planId: string;
  file: File;
  items: ParsedColillaItem[];
  mode: PayrollImportMode;
}): Promise<void> {
  const itemsToCreate: CreatePlanItemInput[] = params.items.map((item) => ({
    planId: params.planId,
    name: item.name.trim(),
    kind: item.kind,
    plannedAmount: item.amount,
  }));

  if (!itemsToCreate.length) {
    throw new Error('Selecciona al menos un concepto para importar');
  }

  await uploadPayrollDocument(params.planId, params.file);

  if (params.mode === PayrollImportMode.Replace) {
    await replacePayrollPlanItems(params.planId, itemsToCreate);
  } else {
    await createPlanItemsBatch(params.planId, itemsToCreate);
  }
}
