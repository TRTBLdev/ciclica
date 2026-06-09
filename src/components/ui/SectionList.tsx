import React from 'react';
import { cn } from '../../lib/utils';

type SectionListVariant = 'top-border' | 'underlined-heading';

interface SectionListProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  empty?: boolean;
  emptyMessage?: string;
  headingLevel?: 3 | 4;
  variant?: SectionListVariant;
}

export default function SectionList({
  title,
  children,
  className,
  contentClassName,
  empty = false,
  emptyMessage,
  headingLevel = 3,
  variant = 'top-border',
}: SectionListProps) {
  const isUnderlined = variant === 'underlined-heading';
  const headingClassName = cn(
    isUnderlined
      ? "text-xs font-mono font-bold tracking-widest text-primary uppercase border-b border-border-line pb-3 mb-6"
      : "text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4"
  );

  return (
    <section className={cn("text-left", className)}>
      {headingLevel === 4 ? (
        <h4 className={headingClassName}>{title}</h4>
      ) : (
        <h3 className={headingClassName}>{title}</h3>
      )}
      <div className={cn(isUnderlined ? "flex flex-col gap-2" : "border-t border-border-line/40 flex flex-col", contentClassName)}>
        {empty ? <EmptyStateText message={emptyMessage || "Sin elementos."} compact={isUnderlined} /> : children}
      </div>
    </section>
  );
}

export function EmptyStateText({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <p className={cn("text-xs text-text-dim text-left font-mono italic", compact ? "pl-2" : "p-6")}>
      {message}
    </p>
  );
}
