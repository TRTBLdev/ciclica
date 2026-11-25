import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean | 'auto';
  searchPlaceholder?: string;
  emptyText?: string;
  variant?: 'box' | 'underline' | 'ghost';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  title?: string;
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
}

export interface SelectPosition {
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;
const MAX_LIST_HEIGHT = 280;

/**
 * Normalizes text for accent-, case-, and emoji-insensitive option filtering.
 */
export function normalizeSearchText(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes smart fixed-position portal coordinates with auto-flip and viewport clamping.
 */
export function computeSelectPosition(
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width'>,
  viewport: { width: number; height: number },
  menuHeightEstimate = 260,
  align: 'left' | 'right' = 'left',
  menuMinWidth = 180,
): SelectPosition {
  const effectiveMinWidth = Math.min(
    Math.max(triggerRect.width, menuMinWidth),
    Math.max(120, viewport.width - VIEWPORT_PADDING * 2),
  );

  const spaceBelow = Math.max(0, viewport.height - triggerRect.bottom - VIEWPORT_PADDING - MENU_GAP);
  const spaceAbove = Math.max(0, triggerRect.top - VIEWPORT_PADDING - MENU_GAP);

  const shouldFlip =
    spaceBelow < Math.min(menuHeightEstimate, 220) && spaceAbove > spaceBelow;
  const placement: 'bottom' | 'top' = shouldFlip ? 'top' : 'bottom';
  const availableSpace = placement === 'top' ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(120, Math.min(MAX_LIST_HEIGHT, availableSpace - 8));

  const desiredLeft =
    align === 'right' ? triggerRect.right - effectiveMinWidth : triggerRect.left;
  const maxLeft = Math.max(VIEWPORT_PADDING, viewport.width - effectiveMinWidth - VIEWPORT_PADDING);
  const left = Math.min(Math.max(VIEWPORT_PADDING, desiredLeft), maxLeft);

  const top =
    placement === 'bottom'
      ? Math.min(triggerRect.bottom + MENU_GAP, viewport.height - VIEWPORT_PADDING - 48)
      : Math.max(VIEWPORT_PADDING, triggerRect.top - MENU_GAP);

  return {
    top,
    left,
    minWidth: effectiveMinWidth,
    maxHeight,
    placement,
  };
}

const VARIANT_CLASSES: Record<NonNullable<SelectProps['variant']>, string> = {
  box: 'rounded-xl border border-border-line bg-base text-text-main hover:border-[#a2b29f]/70 focus:outline-none focus:border-[#a2b29f]',
  underline:
    'rounded-none border-0 border-b border-border-line bg-transparent px-0 text-text-main hover:border-[#a2b29f]/70 focus:outline-none focus:border-[#a2b29f]',
  ghost:
    'rounded-lg border border-transparent bg-transparent text-text-main hover:border-border-line/70 focus:outline-none focus:border-[#a2b29f]',
};

const SIZE_CLASSES: Record<
  NonNullable<SelectProps['variant']>,
  Record<NonNullable<SelectProps['size']>, string>
> = {
  box: {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-10 px-3 text-xs',
  },
  underline: {
    sm: 'h-8 text-xs',
    md: 'h-10 text-xs',
  },
  ghost: {
    sm: 'h-8 px-2 text-xs',
    md: 'h-9 px-2.5 text-xs',
  },
};

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  searchable = 'auto',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  variant = 'box',
  size = 'md',
  align = 'left',
  title,
  ariaLabel,
  className,
  menuClassName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<SelectPosition>({
    top: 0,
    left: 0,
    minWidth: 180,
    maxHeight: MAX_LIST_HEIGHT,
    placement: 'bottom',
  });

  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isSearchable =
    searchable === true || (searchable === 'auto' && options.length >= 7);

  const selectedOption = useMemo(
    () => options.find(opt => opt.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!isSearchable) return options;
    const normalizedQuery = normalizeSearchText(searchQuery);
    if (!normalizedQuery) return options;
    return options.filter(opt => {
      const normalizedLabel = normalizeSearchText(opt.label);
      const normalizedGroup = opt.group ? normalizeSearchText(opt.group) : '';
      return (
        normalizedLabel.includes(normalizedQuery) ||
        normalizedGroup.includes(normalizedQuery)
      );
    });
  }, [isSearchable, options, searchQuery]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const estimatedHeight =
      Math.min(filteredOptions.length || 1, 7) * 38 + (isSearchable ? 44 : 12);
    setPosition(
      computeSelectPosition(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        estimatedHeight,
        align,
        Math.max(180, rect.width),
      ),
    );
  }, [align, filteredOptions.length, isSearchable]);

  const closeMenu = useCallback((focusTrigger = false) => {
    setIsOpen(false);
    setSearchQuery('');
    if (focusTrigger) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setSearchQuery('');
    const selectedIdx = options.findIndex(opt => opt.value === value && !opt.disabled);
    const firstEnabledIdx = options.findIndex(opt => !opt.disabled);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : Math.max(0, firstEnabledIdx));
    setIsOpen(true);
  }, [disabled, options, value]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    if (isSearchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen, isSearchable]);

  // Keep highlighted index valid when filtering
  useEffect(() => {
    if (!isOpen) return;
    if (filteredOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    const selectedIdx = filteredOptions.findIndex(
      opt => opt.value === value && !opt.disabled,
    );
    if (selectedIdx >= 0 && !searchQuery) {
      setHighlightedIndex(selectedIdx);
    } else {
      const firstEnabled = filteredOptions.findIndex(opt => !opt.disabled);
      setHighlightedIndex(firstEnabled);
    }
  }, [filteredOptions, isOpen, searchQuery, value]);

  // Reposition on scroll/resize
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

  // Close on outside pointer down
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      closeMenu(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [closeMenu, isOpen]);

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (filteredOptions.length === 0) return;
      const total = filteredOptions.length;
      let next = highlightedIndex;
      for (let step = 0; step < total; step++) {
        next =
          next < 0
            ? direction === 1
              ? 0
              : total - 1
            : (next + direction + total) % total;
        if (!filteredOptions[next]?.disabled) {
          setHighlightedIndex(next);
          optionRefs.current[next]?.scrollIntoView?.({ block: 'nearest' });
          return;
        }
      }
    },
    [filteredOptions, highlightedIndex],
  );

  const selectOptionAt = useCallback(
    (idx: number) => {
      const opt = filteredOptions[idx];
      if (!opt || opt.disabled) return;
      onChange(opt.value);
      closeMenu(true);
    },
    [closeMenu, filteredOptions, onChange],
  );

  // Capture-phase keyboard handler while open so Escape closes Select before parent views
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveHighlight(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        moveHighlight(-1);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        if (highlightedIndex >= 0) {
          selectOptionAt(highlightedIndex);
        }
        return;
      }
      if (event.key === 'Tab') {
        closeMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [closeMenu, highlightedIndex, isOpen, moveHighlight, selectOptionAt]);

  const activeDescendantId =
    isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${baseId}-opt-${highlightedIndex}`
      : undefined;

  const groupedRenderItems = useMemo(() => {
    const items: Array<{ option: SelectOption; index: number; showGroupHeader: boolean }> = [];
    let lastGroup: string | undefined;
    filteredOptions.forEach((option, index) => {
      const showGroupHeader = Boolean(option.group && option.group !== lastGroup);
      if (option.group) lastGroup = option.group;
      items.push({ option, index, showGroupHeader });
    });
    return items;
  }, [filteredOptions]);

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        data-name={name}
        data-value={value}
        type="button"
        role="combobox"
        title={title}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        disabled={disabled}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={event => {
          if (isOpen) return;
          if (
            event.key === 'ArrowDown' ||
            event.key === 'ArrowUp' ||
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          'w-full flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[variant][size],
          className,
        )}
      >
        <em className="not-italic min-w-0 flex-1 truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </em>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 text-text-dim transition-transform duration-150',
            isOpen && 'rotate-180 text-[#a2b29f]',
          )}
          aria-hidden="true"
        />
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
            className={cn(
              'rounded-2xl border border-border-line glass-matte shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100',
              menuClassName,
            )}
          >
            {isSearchable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border-line/60 bg-base-dim/20">
                <Search className="w-3.5 h-3.5 text-text-dim shrink-0" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Filtrar opciones"
                  className="w-full bg-transparent text-base sm:text-xs text-text-main placeholder:text-text-dim/60 focus:outline-none font-sans"
                />
              </div>
            )}

            <div
              ref={el => {
                if (!el) optionRefs.current = [];
              }}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel || title || placeholder}
              style={{ maxHeight: position.maxHeight }}
              className="overflow-y-auto p-1 flex flex-col gap-0.5"
            >
              {groupedRenderItems.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs font-mono text-text-dim">
                  {emptyText}
                </div>
              ) : (
                groupedRenderItems.map(({ option, index, showGroupHeader }) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <React.Fragment key={`${option.group || ''}:${option.value}:${index}`}>
                      {showGroupHeader && (
                        <div className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-widest text-text-dim/70 select-none">
                          {option.group}
                        </div>
                      )}
                      <button
                        ref={el => {
                          optionRefs.current[index] = el;
                        }}
                        id={`${baseId}-opt-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        onMouseEnter={() => {
                          if (!option.disabled) setHighlightedIndex(index);
                        }}
                        onClick={() => selectOptionAt(index)}
                        className={cn(
                          'w-full min-h-[36px] px-3 py-1.5 rounded-xl text-left text-xs font-sans flex items-center justify-between gap-2 border-0 bg-transparent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                          isHighlighted && !isSelected && 'bg-base-dim/40 text-text-main',
                          isSelected
                            ? 'bg-[#a2b29f]/15 text-[#a2b29f] font-medium'
                            : 'text-text-main hover:bg-base-dim/40',
                        )}
                        title={option.label}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 shrink-0 text-[#a2b29f]" aria-hidden="true" />
                        )}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default Select;
