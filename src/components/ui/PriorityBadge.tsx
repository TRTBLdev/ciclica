import React from 'react';
import { cn } from '../../lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export default function PriorityBadge({ priority, className, onClick, title }: PriorityBadgeProps) {
  if (!priority) return null;

  const getPriorityClasses = (p: string) => {
    switch (p.toLowerCase()) {
      case 'alta': return 'bg-red-500/10 text-red-700';
      case 'media': return 'bg-amber-500/10 text-amber-700';
      case 'baja': return 'bg-green-500/10 text-green-700';
      default: return 'bg-slate-500/10 text-slate-700';
    }
  };

  const getPriorityIcon = (p: string) => {
    switch (p.toLowerCase()) {
      case 'alta': return '🔴';
      case 'media': return '🟡';
      case 'baja': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 px-2 gap-1 text-[9px] font-mono uppercase tracking-wider rounded-full leading-none whitespace-nowrap",
        getPriorityClasses(priority),
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      title={title}
    >
      <span>{getPriorityIcon(priority)}</span>
      {priority}
    </span>
  );
}
