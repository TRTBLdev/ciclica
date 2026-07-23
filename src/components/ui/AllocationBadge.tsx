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
      case 'fixed':
        return <path d="M8 1.75 13 3.6v3.85c0 3.05-2.05 5.65-5 6.8-2.95-1.15-5-3.75-5-6.8V3.6L8 1.75Z" />;
      case 'growth':
        return <path d="M9.1 1.75 4.25 8h3.1l-.45 6.25L11.75 8h-3.1l.45-6.25Z" />;
      case 'mixed':
        return <><path d="M3 4.25h3.1A2.9 2.9 0 0 1 9 7.15v1.7a2.9 2.9 0 0 0 2.9 2.9H13" /><path d="m11 2.5 2 1.75L11 6M11 10l2 1.75L11 13.5" /><path d="M3 11.75h3.1c.75 0 1.45-.3 1.95-.8M8.05 5.05c.5-.5 1.2-.8 1.95-.8h3" /></>;
      default:
        return null;
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
    <small
      className={cn(
        "inline-flex items-center justify-center h-5 px-2 gap-1 text-[9px] font-mono uppercase tracking-wider rounded-full leading-none whitespace-nowrap bg-slate-500/10 text-slate-700",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      title={title}
    >
      <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {getAllocationIcon(allocation)}
      </svg>
      {getAllocationLabel(allocation)}
    </small>
  );
}
