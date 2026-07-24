import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Plus, Search, X } from 'lucide-react';
import {
  HistoryPeriod,
  HistorySearchSuggestion,
} from '../domain/historyPresentation';

interface Props {
  period: HistoryPeriod;
  query: string;
  selectedScope: HistorySearchSuggestion | null;
  suggestions: HistorySearchSuggestion[];
  onPeriodChange: (period: HistoryPeriod) => void;
  onQueryChange: (query: string) => void;
  onSelectScope: (suggestion: HistorySearchSuggestion) => void;
  onClearScope: () => void;
  onOpenRegistration: () => void;
}

export default function HistorySearchControls({
  period,
  query,
  selectedScope,
  suggestions,
  onPeriodChange,
  onQueryChange,
  onSelectScope,
  onClearScope,
  onOpenRegistration,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const showSuggestions = query.trim().length > 0 && !dismissed;

  useEffect(() => {
    setActiveIndex(0);
    setDismissed(false);
  }, [query]);

  const selectSuggestion = (suggestion: HistorySearchSuggestion) => {
    onSelectScope(suggestion);
    setDismissed(true);
  };

  return (
    <header className="flex flex-col gap-5 border-b border-border-line/40 pb-6">
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-border-line pb-6">
        <h2 className="text-title flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-text-main stroke-[2]" />
          Historial de sesiones
        </h2>
        <label className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 pr-6 bg-base">
          <small className="sr-only">Período del historial</small>
          <select
            value={period}
            onChange={event => onPeriodChange(event.target.value as HistoryPeriod)}
            className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 border-0"
          >
            <option value="todas">Todo el historial</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="mes">Este mes</option>
            <option value="30dias">Últimos 30 días</option>
            <option value="ciclo">Este ciclo</option>
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-main pointer-events-none" />
        </label>
      </section>

      <p className="text-sm text-text-dim max-w-3xl leading-relaxed">
        Consulta sesiones por título o limita la búsqueda a un proyecto, una rutina o un elemento.
      </p>

      <form
        role="search"
        className="relative flex flex-col gap-3"
        onSubmit={event => event.preventDefault()}
      >
        <fieldset className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 border-0 p-0 m-0">
          <legend className="sr-only">Buscar en el historial</legend>
          <label className="relative">
            <small className="sr-only">Título, proyecto, rutina o elemento</small>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
            <input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="history-search-suggestions"
              aria-activedescendant={
                showSuggestions && suggestions[activeIndex]
                  ? `history-suggestion-${activeIndex}`
                  : undefined
              }
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  setDismissed(true);
                  return;
                }
                if (!showSuggestions || suggestions.length === 0) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex(index => (index + 1) % suggestions.length);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex(index => (index - 1 + suggestions.length) % suggestions.length);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  selectSuggestion(suggestions[activeIndex]);
                }
              }}
              placeholder={selectedScope ? 'Buscar un título dentro del contexto…' : 'Buscar sesiones, proyectos o rutinas…'}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-base text-text-main border border-border-line rounded-full outline-none focus:border-[#a2b29f]"
            />
          </label>
          <button
            type="button"
            onClick={onOpenRegistration}
            className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-text-main hover:bg-base-dim/40 bg-transparent border-0 cursor-pointer"
          >
            <Plus className="inline w-3.5 h-3.5 mr-1.5" />
            Registrar sesión
          </button>
        </fieldset>

        {selectedScope && (
          <output className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-primary pl-3 py-1">
            <small className="font-mono uppercase tracking-wider text-text-dim">
              Contexto activo
            </small>
            <strong className="text-xs text-text-main">{selectedScope.text}</strong>
            <small className="font-mono uppercase tracking-wider text-primary">
              {selectedScope.type}
            </small>
            <button
              type="button"
              onClick={onClearScope}
              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main bg-transparent border-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Quitar contexto
            </button>
          </output>
        )}

        {showSuggestions && (
          <nav
            aria-label="Sugerencias del historial"
            className="absolute z-20 top-12 left-0 right-0 sm:right-40 border border-border-line/70 bg-base"
          >
            <ul id="history-search-suggestions" role="listbox" className="list-none m-0 p-0">
              {suggestions.length > 0 ? suggestions.map((suggestion, index) => (
                <li
                  id={`history-suggestion-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  key={suggestion.key}
                  className="border-b border-border-line/30 last:border-0"
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left bg-transparent border-0 cursor-pointer ${
                      index === activeIndex ? 'bg-base-dim/50' : 'hover:bg-base-dim/40'
                    }`}
                  >
                    <strong className="min-w-0 truncate text-xs text-text-main font-medium">
                      {suggestion.text}
                    </strong>
                    <small className="text-[9px] font-mono uppercase tracking-wider text-primary">
                      {suggestion.type}
                    </small>
                  </button>
                </li>
              )) : (
                <li className="px-3 py-2.5 text-xs text-text-dim">
                  No hay contextos o elementos coincidentes.
                </li>
              )}
            </ul>
          </nav>
        )}
      </form>
    </header>
  );
}
