import React from 'react';
import { cn } from '../../lib/utils';

interface AllocationBadgeProps {
  allocation: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export default function AllocationBadge({ allocation, className, onClick, title }: AllocationBadgeProps) {
  if (!allocation) return null;

  const getAllocationIcon = (a: string) => {
    switch (a.toLowerCase()) {
      case 'fixed': return '🛡️';
      case 'growth': return '⚡';
      case 'mixed': return '☯️';
      default: return '';
    }
  };

  const getAllocationLabel = (a: string) => {
    switch (a.toLowerCase()) {
      case 'fixed': return 'Soporte';
      case 'growth': return 'Inversión';
      case 'mixed': return 'Mixto';
      default: return a;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 px-2 gap-1 text-[9px] font-mono uppercase tracking-wider rounded-full leading-none whitespace-nowrap bg-slate-500/10 text-slate-700",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      title={title}
    >
      <span>{getAllocationIcon(allocation)}</span>
      {getAllocationLabel(allocation)}
    </span>
  );
}
