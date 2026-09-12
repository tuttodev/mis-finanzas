'use client';

import { useMemo, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const monthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
});

const buttonDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const accessibleDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
};

function parseIsoDate(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  className,
  disabled,
  placeholder = 'Seleccionar fecha',
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const todayIso = toIsoDate(today);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? today));

  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(visibleMonth);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const previousMonth = shiftMonth(visibleMonth, -1);
  const nextMonth = shiftMonth(visibleMonth, 1);
  const previousDisabled = Boolean(min && toIsoDate(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0)) < min);
  const nextDisabled = Boolean(max && toIsoDate(nextMonth) > max);

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date));
    setVisibleMonth(startOfMonth(date));
    setOpen(false);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setVisibleMonth(startOfMonth(selectedDate ?? today));
      }}
    >
      <Popover.Trigger
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-sm font-semibold outline-none transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
      >
        <CalendarDays className="size-4 text-primary" aria-hidden="true" />
        <span className={cn('min-w-0 flex-1 truncate', !selectedDate && 'text-muted-foreground')}>
          {selectedDate ? buttonDateFormatter.format(selectedDate).replace('.', '') : placeholder}
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[popup-open]/button:rotate-180" aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[70]"
        >
          <Popover.Popup
            className="w-[19rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl shadow-black/35 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <Popover.Title className="sr-only">Seleccionar fecha</Popover.Title>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVisibleMonth(previousMonth)}
                disabled={previousDisabled}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <div className="text-sm font-semibold" aria-live="polite">
                {capitalize(monthFormatter.format(visibleMonth))}
              </div>
              <button
                type="button"
                onClick={() => setVisibleMonth(nextMonth)}
                disabled={nextDisabled}
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="flex h-7 items-center justify-center text-[0.68rem] font-semibold uppercase text-muted-foreground">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Calendario">
              {calendarDays.map((date) => {
                const isoDate = toIsoDate(date);
                const isSelected = isoDate === value;
                const isToday = isoDate === todayIso;
                const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
                const isDisabled = Boolean((min && isoDate < min) || (max && isoDate > max));

                return (
                  <button
                    key={isoDate}
                    type="button"
                    role="gridcell"
                    aria-label={accessibleDateFormatter.format(date)}
                    aria-selected={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    disabled={isDisabled}
                    onClick={() => selectDate(date)}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-lg text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25',
                      isOutsideMonth && 'text-muted-foreground/45',
                      isToday && !isSelected && 'font-bold text-primary after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-primary',
                      isSelected && 'bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary/90',
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">
                {selectedDate ? accessibleDateFormatter.format(selectedDate) : 'Sin fecha seleccionada'}
              </span>
              <button
                type="button"
                onClick={() => selectDate(today)}
                disabled={Boolean((min && todayIso < min) || (max && todayIso > max))}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
              >
                Hoy
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
