import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Combobox({ value, onChange, options, placeholder = "Seleccionar...", disabled, className }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
        className="w-full flex items-center justify-between bg-transparent text-text-main text-xs font-mono border-b border-border-line px-0 py-1.5 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-left transition-colors"
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-3 h-3 text-text-dim flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-[100] top-full mt-1 left-0 w-[240px] max-w-[90vw] bg-base border border-border-line shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 rounded-none">
          <div className="p-1.5 border-b border-border-line/50 flex items-center gap-1.5 bg-base-dim/10">
            <Search className="w-3 h-3 text-text-dim ml-1" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-text-main focus:outline-none w-full font-mono py-1"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-xs text-text-dim text-center font-mono">No hay resultados</div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-sans truncate hover:bg-base-dim/30 transition-colors border-b border-border-line/30 last:border-0",
                    option.value === value ? "bg-base-dim/10 text-primary font-bold" : "text-text-main"
                  )}
                  title={option.label}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
