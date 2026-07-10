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


  return (
    <div className={cn("flex items-center gap-1.5", className)} onClick={onClick} title={title}>
      {area && !hideArea && (
        <span className={cn(
          "inline-flex items-center justify-center h-5 px-2 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full leading-none whitespace-nowrap bg-transparent border",
          getAreaTextClasses(color),
          getAreaBorderClasses(color),
          onClick && "cursor-pointer hover:opacity-80 transition-opacity"
        )}>
          {area}
        </span>
      )}
      {subCategory && (
        <span className={cn(
          "inline-flex items-center justify-center h-5 px-2 text-[9px] font-mono uppercase tracking-wider rounded-full leading-none whitespace-nowrap",
          getAreaColorClasses(color),
          onClick && "cursor-pointer hover:opacity-80 transition-opacity"
        )}>
          {subCategory}
        </span>
      )}
    </div>
  );
}
