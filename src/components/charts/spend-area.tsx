'use client';

import { useId, useMemo, useState } from 'react';
import { formatCOP, formatShortDate } from '@/lib/formatters';

export type SpendPoint = {
  date: string;
  value: number;
};

type SpendAreaProps = {
  data: SpendPoint[];
  color?: string;
};

const VB_W = 340;
const VB_H = 130;
const MARGIN = { top: 10, right: 6, bottom: 6, left: 6 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

export function SpendArea({ data, color = 'var(--primary)' }: SpendAreaProps) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const { points, linePath, areaPath } = useMemo(() => {
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;
    const coords = data.map((point, index) => ({
      ...point,
      x: MARGIN.left + (data.length > 1 ? (index / (data.length - 1)) * PLOT_W : PLOT_W / 2),
      y: MARGIN.top + PLOT_H - ((point.value - minValue) / range) * PLOT_H,
    }));

    const line = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const baseline = MARGIN.top + PLOT_H;
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline} L ${coords[0].x.toFixed(1)} ${baseline} Z`;

    return { points: coords, linePath: line, areaPath: area };
  }, [data]);

  if (!data.length) return null;

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const x = xRatio * VB_W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  };

  const activePoint = active !== null ? points[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full touch-pan-y"
        role="img"
        aria-label="Gasto diario"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4.5}
              fill={color}
              stroke="var(--card)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-1.5 shadow-lg"
          style={{
            left: `${Math.min(Math.max((activePoint.x / VB_W) * 100, 20), 80)}%`,
          }}
        >
          <p className="text-[11px] text-muted-foreground">
            {formatShortDate(activePoint.date)}
          </p>
          <p className="tabular whitespace-nowrap text-xs font-medium text-foreground">
            {formatCOP(activePoint.value)}
          </p>
        </div>
      )}
    </div>
  );
}
