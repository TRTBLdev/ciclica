import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { computeSelectPosition, SelectPosition } from './Select';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
  align?: 'left' | 'right';
}

export default function SortDropdown({
  options,
  currentValue,
  onChange,
  title = 'Ordenar por',
  className,
  align = 'left',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<SelectPosition>({
    top: 0,
    left: 0,
    minWidth: 192,
    maxHeight: 280,
    placement: 'bottom',
  });
  const baseId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPosition(
      computeSelectPosition(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        options.length * 38 + 44,
        align,
        192,
      ),
    );
  }, [align, options.length]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const idx = options.findIndex(opt => opt.value === currentValue);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  }, [currentValue, isOpen, options]);

  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      } else if (event.key === 'ArrowDown' && options.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex(prev => (prev + 1) % options.length);
      } else if (event.key === 'ArrowUp' && options.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
      } else if (event.key === 'Enter' && options[highlightedIndex]) {
        event.preventDefault();
        event.stopPropagation();
        onChange(options[highlightedIndex].value);
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [highlightedIndex, isOpen, onChange, options]);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? `${baseId}-listbox` : undefined}
        className="p-1.5 rounded-lg text-text-dim/50 hover:text-text-main transition-colors flex items-center justify-center cursor-pointer border-0 bg-transparent"
        title="Ordenar"
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={portalRef}
            data-ciclica-select-portal="true"
            data-ciclica-select-open="true"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              minWidth: position.minWidth,
              maxWidth: 'calc(100vw - 16px)',
              transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
              zIndex: 200,
              backgroundColor: 'var(--color-base)',
            }}
            className="rounded-2xl border border-border-line glass-matte shadow-xl py-2 p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 pb-1.5 pt-1 text-[9px] font-mono uppercase tracking-widest text-text-dim/60 mb-1 border-b border-border-line/40">
              {title}
            </div>
            <div
              id={`${baseId}-listbox`}
              role="listbox"
              aria-label={title}
              style={{ maxHeight: position.maxHeight }}
              className="flex flex-col gap-0.5 overflow-y-auto"
            >
              {options.map((opt, idx) => {
                const isActive = currentValue === opt.value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full min-h-[36px] px-3 py-1.5 text-left text-xs font-sans rounded-xl flex items-center justify-between gap-2 transition-colors bg-transparent border-0 cursor-pointer',
                      isHighlighted && !isActive && 'bg-base-dim/40 text-text-main',
                      isActive
                        ? 'font-medium text-[#a2b29f] bg-[#a2b29f]/15'
                        : 'text-text-dim hover:text-text-main hover:bg-base-dim/40',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-[#a2b29f]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
