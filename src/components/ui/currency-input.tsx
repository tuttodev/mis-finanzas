import * as React from 'react';

import { formatCOPInput } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'inputMode' | 'onChange' | 'type' | 'value'
> & {
  value: string;
  onValueChange: (value: string) => void;
  sign?: '+' | '−';
  variant?: 'default' | 'prominent';
};

function CurrencyInput({
  className,
  onValueChange,
  sign,
  value,
  variant = 'default',
  ...props
}: CurrencyInputProps) {
  const isProminent = variant === 'prominent';

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 font-semibold',
          isProminent && 'left-0 font-display text-2xl',
        )}
      >
        {sign}
        {'$'}
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onValueChange(formatCOPInput(event.target.value))}
        className={cn(
          'tabular pr-14 pl-7',
          isProminent &&
            'h-auto rounded-none border-0 bg-transparent py-0 pr-16 pl-9 font-display text-3xl font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:border-transparent focus-visible:ring-0 md:text-3xl dark:bg-transparent',
          className,
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-semibold tracking-wide text-muted-foreground',
          isProminent && 'right-0',
        )}
      >
        COP
      </span>
    </div>
  );
}

export { CurrencyInput };
