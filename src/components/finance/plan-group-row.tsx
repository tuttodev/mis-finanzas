'use client';

import { ChevronDown, ChevronRight, GripVertical, Layers3, Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatCOP } from '@/lib/formatters';
import { getGroupPlannedAmount } from '@/lib/plan-summary';
import type { PlanItem, PlanSection } from '@/types/finance';
import { PlanItemRow } from './plan-item-row';
import { PlanSectionPicker } from './plan-section-picker';

type PlanGroupRowProps = {
  group: PlanItem;
  childrenItems: PlanItem[];
  sections: PlanSection[];
  collapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMoveSection: (item: PlanItem, sectionId: string | null) => void;
  movePending: boolean;
  onTogglePaid: (item: PlanItem) => void;
  togglePending: boolean;
};

export function PlanGroupRow({
  group,
  childrenItems,
  sections,
  collapsed,
  onToggle,
  onEdit,
  onMoveSection,
  movePending,
  onTogglePaid,
  togglePending,
}: PlanGroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const amount = getGroupPlannedAmount(childrenItems, group.id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`my-2 overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.035] ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-1.5 px-1.5 py-1.5">
        <button
          type="button"
          aria-label={`Arrastrar grupo ${group.name} para reordenar`}
          {...attributes}
          {...listeners}
          className="shrink-0 touch-none rounded-md p-1 text-muted-foreground/60 hover:bg-secondary hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`${collapsed ? 'Expandir' : 'Colapsar'} ${group.name}`}
          aria-expanded={!collapsed}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-secondary/50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers3 className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold leading-tight">{group.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                {childrenItems.length} {childrenItems.length === 1 ? 'subpartida' : 'subpartidas'}
              </span>
            </span>
            <span className="tabular shrink-0 text-sm font-semibold sm:text-[15px]">{formatCOP(amount)}</span>
          </span>
          {collapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-primary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-primary" />}
        </button>
        <PlanSectionPicker
          itemName={`grupo ${group.name}`}
          value={group.sectionId}
          sections={sections}
          onChange={(sectionId) => onMoveSection(group, sectionId)}
          disabled={movePending}
        />
        <button
          type="button"
          aria-label={`Editar grupo ${group.name}`}
          onClick={onEdit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      {!collapsed && childrenItems.length > 0 && (
        <div className="divide-y divide-border/60 border-t border-border/70 bg-card/50 px-2">
          {childrenItems.map((child) => (
            <PlanItemRow
              key={child.id}
              item={child}
              sortable={false}
              sections={sections}
              effectiveSectionId={group.sectionId}
              onMoveSection={onMoveSection}
              movePending={movePending}
              onTogglePaid={onTogglePaid}
              togglePending={togglePending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
