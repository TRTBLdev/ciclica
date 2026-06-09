import React from 'react';
import { cn } from '../../lib/utils';

interface ViewHeaderProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  titleLevel?: 1 | 2;
}

export default function ViewHeader({
  title,
  icon: Icon,
  actions,
  description,
  className,
  titleLevel = 2,
}: ViewHeaderProps) {
  const titleClassName = "text-title flex items-center gap-3";
  const titleContent = (
    <>
      <Icon className="text-text-main w-6 h-6 stroke-[2]" /> {title}
    </>
  );

  return (
    <header className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-line pb-6 gap-4 text-left", className)}>
      <div>
        {titleLevel === 1 ? (
          <h1 className={cn(titleClassName, "mb-1 leading-none")}>{titleContent}</h1>
        ) : (
          <h2 className={titleClassName}>{titleContent}</h2>
        )}
        {description && (
          <p className="text-sm text-text-dim mt-1 leading-relaxed max-w-lg">
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}
