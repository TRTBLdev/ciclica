import React from 'react';
import { cn } from '../lib/utils';

export const SECONDARY_METRIC_TYPOGRAPHY_CLASS = 'font-mono text-[10px] leading-5 text-text-dim tabular-nums';

interface DurationComparisonProps {
  key?: React.Key;
  actualHours: number;
  estimatedHours: number;
  className?: string;
}

interface ActivityDurationAverageProps {
  lastActivity?: string;
  averageHours: number | null;
  count: number;
  singularSample?: string;
  pluralSample?: string;
  averageLabel?: string;
  className?: string;
}

export function formatSummaryHours(value: number): string {
  return `${value.toFixed(2)} h`;
}

export function DurationComparison({
  actualHours,
  estimatedHours,
  className,
}: DurationComparisonProps) {
  if (actualHours <= 0 && estimatedHours <= 0) return null;
  const text = estimatedHours > 0
    ? `Real ${formatSummaryHours(actualHours)} / Est. ${formatSummaryHours(estimatedHours)}`
    : `Real ${formatSummaryHours(actualHours)} / Sin estimación`;

  return (
    <output
      className={cn(SECONDARY_METRIC_TYPOGRAPHY_CLASS, 'h-5 shrink-0 whitespace-nowrap', className)}
      aria-label={text}
    >
      {text}
    </output>
  );
}

export function ActivityDurationAverage({
  lastActivity,
  averageHours,
  count,
  singularSample = 'ciclo',
  pluralSample = 'ciclos',
  averageLabel = 'Promedio/ciclo',
  className,
}: ActivityDurationAverageProps) {
  const averageText = averageHours === null
    ? `${averageLabel}: Sin ciclos completos`
    : `${averageLabel}: ${formatSummaryHours(averageHours)} (${count} ${count === 1 ? singularSample : pluralSample})`;

  return (
    <p className={cn(SECONDARY_METRIC_TYPOGRAPHY_CLASS, 'm-0', className)}>
      <small className="text-[1em]">{lastActivity || 'Última actividad: Sin registros'} · {averageText}</small>
    </p>
  );
}
