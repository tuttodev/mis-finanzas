import { ArrowLeftRight } from 'lucide-react';

export function TransferBadge() {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-primary">
      <ArrowLeftRight className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Transferencia</span>
    </span>
  );
}
