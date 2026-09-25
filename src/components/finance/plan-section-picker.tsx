'use client';

import { ArrowRightLeft } from 'lucide-react';
import type { PlanSection } from '@/types/finance';

type PlanSectionPickerProps = {
  itemName: string;
  value: string | null;
  sections: PlanSection[];
  onChange: (sectionId: string | null) => void;
  disabled?: boolean;
};

export function PlanSectionPicker({ itemName, value, sections, onChange, disabled }: PlanSectionPickerProps) {
  return (
    <div
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-within:ring-2 focus-within:ring-primary/50"
      title={`Mover ${itemName} a otra sección`}
    >
      <ArrowRightLeft aria-hidden="true" className="h-4 w-4" />
      <select
        aria-label={`Mover ${itemName} a otra sección`}
        title={`Mover ${itemName} a otra sección`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      >
        <option value="">Sin sección</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>{section.name}</option>
        ))}
      </select>
    </div>
  );
}
