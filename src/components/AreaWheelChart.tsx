import React, { useId } from 'react';
import { cn } from '../lib/utils';
import { AreaWheelDatum } from '../domain/areaWheel';

interface AreaWheelChartProps {
  title: string;
  description: string;
  scaleLabel: string;
  data: AreaWheelDatum[];
  areaColors?: Record<string, string>;
  highlightedArea?: string;
  unassignedLabel?: string;
  emptyMessage?: string;
}

const COLOR_MAP: Record<string, string> = {
  slate: '#64748b',
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  green: '#22c55e',
  teal: '#14b8a6',
  cyan: '#06b6d4',
};

const FALLBACK_COLORS = ['#3f8f68', '#c27150', '#64748b', '#b58b3d', '#6e78a8', '#7c5b8f'];

function pointAt(cx: number, cy: number, radius: number, angle: number, score = 100) {
  const scaledRadius = radius * Math.max(0, Math.min(100, score)) / 100;
  return {
    x: cx + Math.cos(angle) * scaledRadius,
    y: cy + Math.sin(angle) * scaledRadius,
  };
}

function pointsFor(data: AreaWheelDatum[], cx: number, cy: number, radius: number, score: (item: AreaWheelDatum) => number) {
  return data.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
    const point = pointAt(cx, cy, radius, angle, score(item));
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(' ');
}

function getAreaColor(area: string, index: number, areaColors?: Record<string, string>) {
  return COLOR_MAP[areaColors?.[area] || ''] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function DataLegend({ data, areaColors, highlightedArea }: Pick<AreaWheelChartProps, 'data' | 'areaColors' | 'highlightedArea'>) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1.5 p-0 sm:grid-cols-2" aria-label="Detalle de áreas">
      {data.map((item, index) => (
        <li
          key={item.area}
          className={cn(
            'flex items-start justify-between gap-3 border-b border-border-line/20 py-1 text-[10px] font-mono',
            highlightedArea === item.area && 'font-semibold text-text-main',
            !item.hasData && 'text-text-dim/70',
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getAreaColor(item.area, index, areaColors) }}
            />
            <span className="truncate" title={item.area}>{item.area}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-text-main">{item.valueLabel}</span>
            <span className="block text-[9px] text-text-dim">{item.detailLabel}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AreaWheelChart({
  title,
  description,
  scaleLabel,
  data,
  areaColors,
  highlightedArea,
  unassignedLabel,
  emptyMessage,
}: AreaWheelChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const hasData = data.some(item => item.hasData);

  return (
    <figure className="space-y-4" aria-labelledby={titleId}>
      <figcaption>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={titleId} className="text-sm font-medium text-text-main">{title}</h3>
          <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim">{scaleLabel}</span>
        </div>
        <p id={descriptionId} className="mt-1 text-xs text-text-dim">{description}</p>
      </figcaption>

      {data.length === 0 ? (
        <p className="border border-dashed border-border-line px-4 py-8 text-center text-xs text-text-dim">
          No hay áreas configuradas para construir la rueda.
        </p>
      ) : data.length < 3 ? (
        <div className="space-y-3" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-dim">
            Se muestran barras porque la rueda necesita al menos tres áreas.
          </p>
          {data.map((item, index) => (
            <div key={item.area} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getAreaColor(item.area, index, areaColors) }} />
                  {item.area}
                </span>
                <span className="shrink-0">{item.valueLabel}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border-line/20">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${item.score}%`, opacity: item.hasData ? 1 : 0.25 }}
                />
              </div>
              <p className="m-0 text-[9px] font-mono text-text-dim">{item.detailLabel}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid items-center gap-4 md:grid-cols-[minmax(240px,1fr)_minmax(220px,1fr)]">
          <div className="mx-auto w-full max-w-[360px]">
            <svg
              viewBox="0 0 420 360"
              role="img"
              aria-labelledby={`${titleId} ${descriptionId}`}
              className="h-auto w-full overflow-visible"
            >
              <title>{title}</title>
              <desc>{description}</desc>
              <g transform="translate(210 170)">
                {[25, 50, 75, 100].map(level => (
                  <polygon
                    key={level}
                    points={pointsFor(data, 0, 0, 112, () => level)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    className="text-border-line/50"
                  />
                ))}
                {data.map((item, index) => {
                  const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
                  const end = pointAt(0, 0, 112, angle);
                  const label = pointAt(0, 0, 137, angle);
                  const isHighlighted = highlightedArea === item.area;
                  return (
                    <React.Fragment key={item.area}>
                      <line x1="0" y1="0" x2={end.x} y2={end.y} stroke="currentColor" strokeWidth="0.8" className="text-border-line/50" />
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor={Math.abs(Math.cos(angle)) < 0.25 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'}
                        dominantBaseline="middle"
                        className={cn('fill-current font-mono text-[10px]', isHighlighted ? 'text-text-main font-semibold' : 'text-text-dim')}
                      >
                        {item.area}
                      </text>
                    </React.Fragment>
                  );
                })}
                {hasData && (
                  <polygon
                    points={pointsFor(data, 0, 0, 112, item => item.score)}
                    fill="var(--color-primary)"
                    fillOpacity="0.16"
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                )}
                {data.map((item, index) => {
                  const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
                  const point = pointAt(0, 0, 112, angle, item.score);
                  return (
                    <circle
                      key={item.area}
                      cx={point.x}
                      cy={point.y}
                      r={highlightedArea === item.area ? 4 : 3}
                      fill={getAreaColor(item.area, index, areaColors)}
                      stroke="var(--color-base)"
                      strokeWidth="1.5"
                    >
                      <title>{`${item.area}: ${item.valueLabel}, ${item.detailLabel}`}</title>
                    </circle>
                  );
                })}
                {!hasData && (
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className="fill-current text-[11px] font-mono text-text-dim">
                    Sin datos
                  </text>
                )}
              </g>
            </svg>
          </div>
          <DataLegend data={data} areaColors={areaColors} highlightedArea={highlightedArea} />
        </div>
      )}

      {!hasData && data.length > 0 && (
        <p className="m-0 text-center text-xs text-text-dim">
          {emptyMessage || 'No hay datos para este período.'}
        </p>
      )}

      {unassignedLabel && (
        <p className="m-0 text-[10px] font-mono text-text-dim">{unassignedLabel}</p>
      )}
    </figure>
  );
}
