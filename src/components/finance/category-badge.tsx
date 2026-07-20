import { Tag } from 'lucide-react';

import { cn } from '@/lib/utils';

type CategoryBadgeProps = {
  name: string;
  className?: string;
};

export function CategoryBadge({ name, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary',
        className,
      )}
    >
      <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </span>
  );
}
