'use client';

import { useState } from 'react';
import { formatCOP, formatPercent } from '@/lib/formatters';

export type HistoryPoint = {
  label: string;
  spent: number;
  limit: number;
};

type HistoryBarsProps = {
  data: HistoryPoint[];
};

const VB_W = 340;
const VB_H = 170;
const MARGIN = { top: 14, right: 6, bottom: 22, left: 32 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

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

export function HistoryBars({ data }: HistoryBarsProps) {
  const [active, setActive] = useState<number | null>(null);

  const percentages = data.map((d) => (d.limit > 0 ? (d.spent / d.limit) * 100 : 0));
  const maxPct = Math.max(120, ...percentages);
  const groupWidth = PLOT_W / data.length;
  const barWidth = Math.min(22, groupWidth - 8);
  const yScale = (pct: number) => PLOT_H * (pct / maxPct);
  const limitY = MARGIN.top + PLOT_H - yScale(100);

  const activePoint = active !== null ? data[active] : null;
  const activePct = active !== null ? percentages[active] : 0;
  const activeCenterX =
    active !== null ? MARGIN.left + groupWidth * active + groupWidth / 2 : 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        role="img"
        aria-label="Historial de ciclos del presupuesto"
        onPointerLeave={() => setActive(null)}
      >
        <line
          x1={MARGIN.left}
          x2={VB_W - MARGIN.right}
          y1={limitY}
          y2={limitY}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={MARGIN.left - 5}
          y={limitY + 3}
          textAnchor="end"
          className="fill-[var(--muted-foreground)] text-[9px]"
        >
          100%
        </text>

        {data.map((point, index) => {
          const pct = percentages[index];
          const centerX = MARGIN.left + groupWidth * index + groupWidth / 2;
          const height = yScale(pct);
          const baseline = MARGIN.top + PLOT_H;
          const over = pct > 100;
          const dimmed = active !== null && active !== index;

          return (
            <g key={`${point.label}-${index}`} opacity={dimmed ? 0.4 : 1} className="transition-opacity">
              <path
                d={topRoundedBar(centerX - barWidth / 2, baseline - height, barWidth, height)}
                fill={over ? 'var(--expense)' : 'var(--income)'}
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
                x={MARGIN.left + groupWidth * index}
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
          <p className="tabular whitespace-nowrap text-xs text-foreground">
            Gastado: {formatCOP(activePoint.spent)}
          </p>
          <p className="tabular whitespace-nowrap text-xs text-muted-foreground">
            Límite: {formatCOP(activePoint.limit)} · {formatPercent(activePct)}
          </p>
        </div>
      )}
    </div>
  );
}
