import React, { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUpDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  label: string;
  value: string;
}

interface Props {
  filterOptions?: Option[];
  sortOptions?: Option[];
  currentFilter?: string;
  currentSort?: string;
  onFilterChange?: (val: string) => void;
  onSortChange?: (val: string) => void;
}

export default function ListControls({
  filterOptions,
  sortOptions,
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-1 z-10">
      {/* Filter Control */}
      {filterOptions && onFilterChange && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }}
            className={cn(
              "p-2 rounded-full hover:bg-base-dim/40 transition-colors flex items-center justify-center cursor-pointer border-0",
              filterOpen ? "bg-base-dim/40 text-primary" : "bg-transparent text-text-dim hover:text-text-main"
            )}
            title="Filtrar"
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-base border border-border-line rounded-lg shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-text-dim/60 mb-1 border-b border-border-line/40">
                Filtrar por Área
              </div>
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onFilterChange(opt.value); setFilterOpen(false); }}
                  className="w-full px-4 py-2 text-left text-xs font-sans hover:bg-base-dim/40 flex items-center justify-between transition-colors bg-transparent border-0 cursor-pointer text-text-main"
                >
                  {opt.label}
                  {currentFilter === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort Control */}
      {sortOptions && onSortChange && (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }}
            className={cn(
              "p-2 rounded-full hover:bg-base-dim/40 transition-colors flex items-center justify-center cursor-pointer border-0",
              sortOpen ? "bg-base-dim/40 text-primary" : "bg-transparent text-text-dim hover:text-text-main"
            )}
            title="Ordenar"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          
          {sortOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-base border border-border-line rounded-lg shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-text-dim/60 mb-1 border-b border-border-line/40">
                Ordenar por
              </div>
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                  className="w-full px-4 py-2 text-left text-xs font-sans hover:bg-base-dim/40 flex items-center justify-between transition-colors bg-transparent border-0 cursor-pointer text-text-main"
                >
                  {opt.label}
                  {currentSort === opt.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
