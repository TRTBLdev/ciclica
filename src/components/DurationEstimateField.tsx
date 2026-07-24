import React from 'react';
import { decimalHoursToDurationParts, durationPartsToDecimalHours } from '../domain/durationEstimate';
import { cn } from '../lib/utils';

interface Props {
  value: number;
  onChange: (value: number) => void;
  idPrefix: string;
  className?: string;
}

const normalizeInteger = (value: number, maximum?: number) => {
  const integer = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return maximum === undefined ? integer : Math.min(maximum, integer);
};

export default function DurationEstimateField({ value, onChange, idPrefix, className }: Props) {
  const { hours, minutes } = decimalHoursToDurationParts(value);
  const hoursId = `${idPrefix}-hours`;
  const minutesId = `${idPrefix}-minutes`;
  const inputClass = 'h-9 w-full min-w-0 border-0 border-b border-border-line bg-transparent px-1 text-center text-xs font-medium text-text-main outline-none transition-colors focus:border-text-main';

  return (
    <fieldset className={cn('grid min-w-0 grid-cols-2 gap-2 border-0 p-0', className)}>
      <legend className="col-span-2 mb-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
        Duración estimada
      </legend>
      <label htmlFor={hoursId} className="flex min-w-0 flex-col gap-1 text-[10px] font-mono uppercase tracking-[0.1em] text-text-dim">
        Horas
        <input
          id={hoursId}
          type="number"
          min={0}
          step={1}
          value={hours}
          className={inputClass}
          onChange={event => {
            const nextHours = normalizeInteger(event.currentTarget.valueAsNumber);
            onChange(durationPartsToDecimalHours(nextHours, minutes));
          }}
        />
      </label>
      <label htmlFor={minutesId} className="flex min-w-0 flex-col gap-1 text-[10px] font-mono uppercase tracking-[0.1em] text-text-dim">
        Minutos
        <input
          id={minutesId}
          type="number"
          min={0}
          max={59}
          step={1}
          value={minutes}
          className={inputClass}
          onChange={event => {
            const nextMinutes = normalizeInteger(event.currentTarget.valueAsNumber, 59);
            onChange(durationPartsToDecimalHours(hours, nextMinutes));
          }}
        />
      </label>
    </fieldset>
  );
}
