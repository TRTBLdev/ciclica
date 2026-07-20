import React from 'react';
import { TaskTemporalIndicator } from '../../domain/appearance';
import { cn } from '../../lib/utils';

interface Props {
  indicator: TaskTemporalIndicator;
}

export function temporalToneClassName(tone: TaskTemporalIndicator['tone']): string {
  if (tone === 'amber') return 'font-medium text-amber-700 dark:text-amber-500';
  if (tone === 'orange') return 'font-medium text-orange-500';
  if (tone === 'red') return 'font-bold text-red-600 dark:text-red-500';
  return 'text-text-dim';
}

export default function TemporalIndicator({ indicator }: Props) {
  return (
    <span
      className={cn(
        'h-5 whitespace-nowrap font-mono text-[10px] leading-5',
        temporalToneClassName(indicator.tone),
      )}
      title={indicator.title}
      aria-label={indicator.title}
    >
      {indicator.text}
    </span>
  );
}
