import { AlertCircle, CheckCircle2, CircleHelp } from 'lucide-react';

type PlanningBadgeProps = {
  isPlanned: boolean | null;
};

export function PlanningBadge({ isPlanned }: PlanningBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ${
        isPlanned === true
          ? 'bg-income/10 text-income'
          : isPlanned === false
            ? 'bg-expense/10 text-expense'
            : 'bg-secondary text-secondary-foreground'
      }`}
    >
      {isPlanned === true ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : isPlanned === false ? (
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
      ) : (
        <CircleHelp className="h-3 w-3" aria-hidden="true" />
      )}
      {isPlanned === true ? 'Planeado' : isPlanned === false ? 'No planeado' : 'Sin especificar'}
    </span>
  );
}
