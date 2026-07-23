import React from 'react';
import { cn, getAreaColorClasses, getAreaBorderClasses, getAreaTextClasses } from '../../lib/utils';
import { Config } from '../../types';

interface CategoryBadgeProps {
  area?: string;
  subCategory?: string;
  config?: Config | null;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  hideArea?: boolean;
}

export default function CategoryBadge({ area, subCategory, config, className, onClick, title, hideArea = false }: CategoryBadgeProps) {
  if (!area && !subCategory) return null;

  // Determine color based on area from config
  const areaConfig = area && config?.areas?.[area];
  const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');


  const content = (
    <>
      {area && !hideArea && (
        <b className={cn(
          "inline-flex items-center justify-center h-5 px-2 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full leading-none whitespace-nowrap bg-transparent border",
          getAreaTextClasses(color),
          getAreaBorderClasses(color),
          onClick && "cursor-pointer hover:opacity-80 transition-opacity"
        )}>
          {area}
        </b>
      )}
      {subCategory && (
        <em className={cn(
          "inline-flex items-center justify-center h-5 px-2 text-[9px] font-mono not-italic uppercase tracking-wider rounded-full leading-none whitespace-nowrap",
          getAreaColorClasses(color),
          onClick && "cursor-pointer hover:opacity-80 transition-opacity"
        )}>
          {subCategory}
        </em>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cn('flex items-center gap-1.5 border-0 bg-transparent p-0', className)} onClick={onClick} title={title}>
        {content}
      </button>
    );
  }

  return <small className={cn('flex items-center gap-1.5', className)} title={title}>{content}</small>;
}
