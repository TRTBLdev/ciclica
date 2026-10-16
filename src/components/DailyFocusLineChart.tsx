import React from 'react';
import { cn } from '../lib/utils';

export interface DailyFocusPoint {
  dateLabel: string;
  rawDate: Date;
  hours: number;
  count: number;
}

interface Props {
  data: DailyFocusPoint[];
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} h`;
}

export default function DailyFocusLineChart({ data }: Props) {
  const shellRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<{ left: number; top: number } | null>(null);
  const width = Math.max(640, data.length * 56);
  const height = 190;
  const padding = { top: 18, right: 20, bottom: 30, left: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const maxHours = Math.max(...data.map(point => point.hours), 1);
  const xFor = (index: number) => padding.left + (data.length <= 1 ? (width - padding.left - padding.right) / 2 : (index * (width - padding.left - padding.right)) / (data.length - 1));
  const yFor = (hours: number) => padding.top + chartHeight - (Math.max(0, hours) / maxHours) * chartHeight;
  const points = data.map((point, index) => `${xFor(index)},${yFor(point.hours)}`).join(' ');

  const updateTooltip = (index: number) => {
    setActiveIndex(index);
    requestAnimationFrame(() => {
      const target = shellRef.current?.querySelector<HTMLElement>(`[data-focus-point="${index}"]`);
      const shell = shellRef.current;
      if (!target || !shell) return;
      const targetRect = target.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const tooltipWidth = 150;
      const left = Math.max(8, Math.min(shellRect.width - tooltipWidth - 8, targetRect.left - shellRect.left + targetRect.width / 2 - tooltipWidth / 2));
      const top = Math.max(4, targetRect.top - shellRect.top - 54);
      setTooltipPosition({ left, top });
    });
  };

  React.useEffect(() => {
    if (activeIndex === null) return;
    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveIndex(null);
        setTooltipPosition(null);
      }
    };
    window.addEventListener('keydown', clearOnEscape);
    return () => window.removeEventListener('keydown', clearOnEscape);
  }, [activeIndex]);

  return (
    <div ref={shellRef} className="relative" onPointerLeave={() => setActiveIndex(null)}>
      <div className="overflow-x-auto no-scrollbar" aria-label="Desplazamiento horizontal del enfoque diario">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Horas de enfoque registradas por día"
          className="block min-w-full overflow-visible"
        >
          <line x1={padding.left} x2={width - padding.right} y1={padding.top + chartHeight} y2={padding.top + chartHeight} stroke="var(--color-border-line)" strokeOpacity="0.55" strokeWidth="0.8" />
          <polyline points={points} fill="none" stroke="var(--color-primary)" strokeOpacity="0.82" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((point, index) => {
            const x = xFor(index);
            const y = yFor(point.hours);
            const isActive = activeIndex === index;
            return (
              <g key={`${point.dateLabel}-${index}`}>
                <line x1={x} x2={x} y1={y} y2={padding.top + chartHeight} stroke="var(--color-border-line)" strokeOpacity={isActive ? 0.45 : 0.18} strokeWidth="0.7" strokeDasharray="2 4" />
                <circle
                  data-focus-point={index}
                  cx={x}
                  cy={y}
                  r={isActive ? 4 : 2.8}
                  fill="var(--color-base)"
                  stroke="var(--color-primary)"
                  strokeWidth={isActive ? 1.8 : 1.2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.dateLabel}: ${formatHours(point.hours)}, ${point.count} registros`}
                  onPointerEnter={() => updateTooltip(index)}
                  onFocus={() => updateTooltip(index)}
                  onClick={() => updateTooltip(index)}
                  onBlur={() => { setActiveIndex(null); setTooltipPosition(null); }}
                  className="cursor-pointer outline-none focus-visible:stroke-text-main"
                />
                <text x={x} y={height - 8} textAnchor="middle" className="fill-current text-[9px] font-mono text-text-dim">{point.dateLabel}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {activeIndex !== null && tooltipPosition && data[activeIndex] && (
        <div
          role="status"
          className={cn('pointer-events-none absolute z-20 w-[150px] border border-border-line bg-base px-2 py-1.5 text-center font-mono text-[10px] text-text-main shadow-sm')}
          style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
        >
          <strong className="block font-medium">{data[activeIndex].dateLabel}</strong>
          <span>{formatHours(data[activeIndex].hours)} · {data[activeIndex].count} registros</span>
        </div>
      )}
    </div>
  );
}
