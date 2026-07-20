'use client';

import { useState } from 'react';
import { formatCOP, formatCOPCompact } from '@/lib/formatters';

export type CashflowPoint = {
  label: string;
  income: number;
  expense: number;
};

type CashflowBarsProps = {
  data: CashflowPoint[];
};

const VB_W = 340;
const VB_H = 190;
const MARGIN = { top: 10, right: 6, bottom: 22, left: 40 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

const INCOME_COLOR = 'var(--income)';
const EXPENSE_COLOR = 'var(--expense)';

function topRoundedBar(x: number, y: number, width: number, height: number) {
  const r = Math.min(3, width / 2, height);
  if (height <= 0) return '';
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}

function niceCeil(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function CashflowBars({ data }: CashflowBarsProps) {
  const [active, setActive] = useState<number | null>(null);

  const maxValue = niceCeil(
    Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1),
  );
  const groupWidth = PLOT_W / data.length;
  const barWidth = Math.min(16, groupWidth / 2 - 4);
  const yScale = (value: number) => PLOT_H * (value / maxValue);

  const ticks = [0, maxValue / 2, maxValue];
  const activePoint = active !== null ? data[active] : null;
  const activeCenterX =
    active !== null ? MARGIN.left + groupWidth * active + groupWidth / 2 : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        role="img"
        aria-label="Ingresos y gastos por mes"
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((tick) => {
          const y = MARGIN.top + PLOT_H - yScale(tick);
          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={VB_W - MARGIN.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 6}
                y={y + 3}
                textAnchor="end"
                className="tabular fill-[var(--muted-foreground)] text-[9px]"
              >
                {formatCOPCompact(tick)}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const groupX = MARGIN.left + groupWidth * index;
          const centerX = groupX + groupWidth / 2;
          const incomeH = yScale(point.income);
          const expenseH = yScale(point.expense);
          const baseline = MARGIN.top + PLOT_H;
          const dimmed = active !== null && active !== index;

          return (
            <g key={point.label} opacity={dimmed ? 0.4 : 1} className="transition-opacity">
              <path
                d={topRoundedBar(centerX - barWidth - 1, baseline - incomeH, barWidth, incomeH)}
                fill={INCOME_COLOR}
              />
              <path
                d={topRoundedBar(centerX + 1, baseline - expenseH, barWidth, expenseH)}
                fill={EXPENSE_COLOR}
              />
              <text
                x={centerX}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-[var(--muted-foreground)] text-[9px]"
              >
                {point.label}
              </text>
              <rect
                x={groupX}
                y={MARGIN.top}
                width={groupWidth}
                height={PLOT_H}
                fill="transparent"
                onPointerEnter={() => setActive(index)}
                onPointerDown={() => setActive(active === index ? null : index)}
              />
            </g>
          );
        })}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
          style={{
            left: `${Math.min(Math.max((activeCenterX / VB_W) * 100, 22), 78)}%`,
          }}
        >
          <p className="text-[11px] font-medium text-muted-foreground">{activePoint.label}</p>
          <p className="tabular whitespace-nowrap text-xs text-income">
            Ingresos: {formatCOP(activePoint.income)}
          </p>
          <p className="tabular whitespace-nowrap text-xs text-expense">
            Gastos: {formatCOP(activePoint.expense)}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-income" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-expense" /> Gastos
        </span>
      </div>
    </div>
  );
}
