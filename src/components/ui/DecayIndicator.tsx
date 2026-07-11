import React from 'react';
import { DecayResult } from '../../lib/decayUtils';
import { cn } from '../../lib/utils';

interface Props {
  decay: DecayResult | null;
  className?: string;
}

export default function DecayIndicator({ decay, className }: Props) {
  if (!decay) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-mono leading-none transition-colors",
        decay.colorClass,
        className
      )}
    >
      {decay.text}
    </span>
  );
}
