import { RotateCcw } from 'lucide-react';

export function RefundBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-income/10 px-1.5 py-0.5 text-[11px] font-medium text-income">
      <RotateCcw className="h-3 w-3" />
      Reembolso
    </span>
  );
}
