import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  currentValue: string;
  onChange: (val: string) => void;
  title?: string;
  className?: string;
}

export default function SortDropdown({
  options,
  currentValue,
  onChange,
  title = 'Ordenar por',
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

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-text-dim/50 hover:text-text-main transition-colors flex items-center justify-center cursor-pointer border-0 bg-transparent"
        title="Ordenar"
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-base border border-border-line rounded-2xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100 glass-matte p-1">
          <div className="px-3 pb-1.5 pt-1 text-[9px] font-mono uppercase tracking-widest text-text-dim/60 mb-1 border-b border-border-line/40">
            {title}
          </div>
          <div className="flex flex-col gap-0.5">
            {options.map(opt => {
              const isActive = currentValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-xs font-sans rounded-xl hover:bg-base-dim/40 transition-all bg-transparent border-0 cursor-pointer text-text-dim hover:text-text-main",
                    isActive && "font-semibold text-[#a2b29f] hover:text-[#a2b29f] bg-base-dim/20"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
