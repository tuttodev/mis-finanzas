'use client';

import { useState } from 'react';
import { formatCOP, formatPercent } from '@/lib/formatters';

export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  data: DonutSlice[];
  centerLabel: string;
};

const SIZE = 200;
const RADIUS = 80;
const STROKE = 26;
const GAP_DEGREES = 2.5;

function polarToCartesian(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  // Round to keep SSR and client output identical (trig results vary per engine)
  return {
    x: Number((SIZE / 2 + RADIUS * Math.cos(radians)).toFixed(2)),
    y: Number((SIZE / 2 + RADIUS * Math.sin(radians)).toFixed(2)),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function DonutChart({ data, centerLabel }: DonutChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) return null;

  const gap = data.length > 1 ? GAP_DEGREES : 0;
  const segments = data.map((slice, index) => {
    const previous = data.slice(0, index).reduce((sum, d) => sum + d.value, 0);
    const start = (previous / total) * 360;
    const sweep = (slice.value / total) * 360;
    return {
      ...slice,
      start: start + gap / 2,
      end: start + Math.max(sweep - gap / 2, gap === 0 ? sweep : 0.5),
    };
  });

  const active = selected !== null ? data[selected] : null;

  return (
    <div>
      <div className="mx-auto max-w-55">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="img" aria-label={centerLabel}>
          {segments.map((segment, index) => (
            <path
              key={segment.label}
              d={arcPath(segment.start, segment.end)}
              fill="none"
              stroke={segment.color}
              strokeWidth={selected === index ? STROKE + 6 : STROKE}
              opacity={selected === null || selected === index ? 1 : 0.35}
              className="cursor-pointer transition-all"
              onPointerDown={() => setSelected(selected === index ? null : index)}
            />
          ))}
          <text
            x={SIZE / 2}
            y={SIZE / 2 - 8}
            textAnchor="middle"
            className="fill-[var(--muted-foreground)] text-[11px]"
          >
            {active ? active.label : centerLabel}
          </text>
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 14}
            textAnchor="middle"
            className="tabular fill-[var(--foreground)] font-display text-[15px] font-semibold"
          >
            {formatCOP(active ? active.value : total)}
          </text>
        </svg>
      </div>

      <div className="mt-4 space-y-1.5">
        {data.map((slice, index) => (
          <button
            key={slice.label}
            onClick={() => setSelected(selected === index ? null : index)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
              selected === index ? 'bg-secondary' : 'hover:bg-secondary/50'
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              {slice.label}
            </span>
            <span className="tabular text-[13px] font-medium text-foreground">
              {formatCOP(slice.value)}
            </span>
            <span className="tabular w-12 text-right text-xs text-muted-foreground">
              {formatPercent((slice.value / total) * 100)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
