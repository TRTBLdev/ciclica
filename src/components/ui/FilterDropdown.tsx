import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

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
}

export default function FilterDropdown({
  configs,
  activeFilters,
  onChange,
  className
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="absolute left-0 top-full mt-2 w-56 bg-base border border-border-line rounded-2xl shadow-lg py-2.5 px-3 z-50 animate-in fade-in zoom-in-95 duration-100 glass-matte">
          <div className="flex flex-col gap-3 text-left">
            <div className="text-[9px] font-mono uppercase tracking-widest text-text-dim/60 pb-1.5 border-b border-border-line/40 font-bold">
              Filtrar por
            </div>
            
            <div className="flex flex-col gap-2.5">
              {configs.map(config => {
                const val = activeFilters[config.key] || config.defaultValue || 'Todas';
                return (
                  <div key={config.key} className="flex flex-col gap-1">
                    <span className="text-[9px] text-text-dim font-mono uppercase tracking-wide">{config.label}:</span>
                    <div className="relative w-full">
                      <select
                        className="w-full appearance-none pl-3 pr-8 py-1 text-xs bg-base text-text-main border border-border-line rounded-xl focus:outline-none cursor-pointer truncate"
                        value={val}
                        onChange={e => onChange(config.key, e.target.value)}
                      >
                        {config.options.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                    </div>
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
