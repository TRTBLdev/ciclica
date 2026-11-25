import React, { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
import Select from './Select';

export interface FilterConfig {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  defaultValue?: string; // e.g. 'Todas'
}

interface Props {
  configs: FilterConfig[];
  activeFilters: { [key: string]: string };
  onChange: (key: string, value: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

export default function FilterDropdown({
  configs,
  activeFilters,
  onChange,
  className,
  align = 'left'
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest?.('[data-ciclica-select-portal="true"]')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      if (document.querySelector('[data-ciclica-select-open="true"]')) return;
      event.preventDefault();
      setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const hasActiveFilters = configs.some(config => {
    const val = activeFilters[config.key];
    const def = config.defaultValue || 'Todas';
    return val && val !== def;
  });

  const handleClearAll = () => {
    configs.forEach(config => {
      onChange(config.key, config.defaultValue || 'Todas');
    });
  };

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer border-0 bg-transparent",
          hasActiveFilters 
            ? "text-[#a2b29f] hover:opacity-85" 
            : "text-text-dim/50 hover:text-text-main"
        )}
        title="Filtrar"
      >
        <Filter className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className={cn("absolute top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-base border border-border-line rounded-2xl shadow-lg py-2.5 px-3 z-50 animate-in fade-in zoom-in-95 duration-100 glass-matte", align === 'right' ? 'right-0' : 'left-0')}>
          <div className="flex flex-col gap-3 text-left">
            <div className="text-[9px] font-mono uppercase tracking-widest text-text-dim/60 pb-1.5 border-b border-border-line/40 font-bold">
              Filtrar por
            </div>
            
            <div className="flex flex-col gap-2.5">
              {configs.map(config => {
                const val = activeFilters[config.key] || config.defaultValue || 'Todas';
                const forceSearchable = /categor|área|area|proyect|rutin|intenci/i.test(config.label);
                return (
                  <div key={config.key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-text-dim font-mono uppercase tracking-wide">{config.label}:</span>
                    <Select
                      variant="box"
                      size="sm"
                      ariaLabel={config.label}
                      value={val}
                      onChange={nextVal => onChange(config.key, nextVal)}
                      options={config.options}
                      searchable={forceSearchable ? true : 'auto'}
                    />
                  </div>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAll}
                className="w-full py-1.5 mt-1 text-center text-[10px] font-sans font-medium text-red-500 hover:bg-red-50/15 rounded-xl transition-all bg-transparent border border-dashed border-red-500/30 cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
