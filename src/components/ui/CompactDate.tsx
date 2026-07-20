import React from 'react';
import { formatCompactCalendarDate, getCompactDateTone } from '../../domain/appearance';
import { cn } from '../../lib/utils';

interface Props {
  value?: string;
  label?: string;
  historical?: boolean;
  className?: string;
}

export default function CompactDate({ value, label, historical = false, className }: Props) {
  if (!value) return null;
  const tone = getCompactDateTone(value, new Date(), historical);
  return (
    <span
      className={cn(
        'whitespace-nowrap font-mono text-[10px]',
        tone === 'soon' && 'text-amber-700 dark:text-amber-500',
        tone === 'overdue' && 'text-red-600 dark:text-red-500',
        tone === 'neutral' && 'text-text-dim',
        className,
      )}
      title={`${label ? `${label}: ` : ''}${formatCompactCalendarDate(value, new Date(), historical)}`}
    >
      {label && <span>{label} </span>}{formatCompactCalendarDate(value, new Date(), historical)}
    </span>
  );
}
