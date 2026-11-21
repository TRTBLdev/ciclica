import React from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, CircleDashed, Target } from 'lucide-react';
import { AppTask } from '../types';
import { CommitmentPeriodSummary } from '../domain/commitmentProgress';
import { cn } from '../lib/utils';

interface Props {
  summaries: CommitmentPeriodSummary[];
  title: string;
  description?: string;
  collapsible?: boolean;
  onSelectAction?: (task: AppTask) => void;
  className?: string;
  titleClassName?: string;
  layout?: 'single' | 'grid';
  defaultExpandedItems?: boolean;
  variant?: 'cards' | 'pills';
  selectedCommitmentId?: string | null;
  onToggleFilter?: (commitmentId: string) => void;
}

function typeLabel(type: CommitmentPeriodSummary['targetType']): string {
  if (type === 'hours') return 'Horas';
  if (type === 'consistency') return 'Constancia';
  if (type === 'counter') return 'Contador';
  return 'Cumplimiento';
}

export default function CommitmentProgressPanel({
  summaries,
  title,
  description,
  collapsible = false,
  onSelectAction,
  className,
  titleClassName,
  layout,
  defaultExpandedItems = false,
  variant = 'cards',
  selectedCommitmentId = null,
  onToggleFilter,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [expandedCardIds, setExpandedCardIds] = React.useState<Set<string>>(() => {
    if (defaultExpandedItems) {
      return new Set(summaries.map(s => s.id));
    }
    return new Set();
  });

  const toggleCard = (id: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const panelId = React.useId();
  const titleId = `${panelId}-title`;
  const contentId = `${panelId}-content`;
  if (summaries.length === 0) return null;

  if (variant === 'pills') {
    return (
      <section aria-labelledby={titleId} className={cn('border-b border-border-line/30 pb-4', className)}>
        <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h3 id={titleId} className={cn('inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim', titleClassName)}>
            <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{title}</span>
          </h3>
          {selectedCommitmentId && onToggleFilter && (
            <button
              type="button"
              onClick={() => onToggleFilter(selectedCommitmentId)}
              className="border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline cursor-pointer"
            >
              Limpiar filtro
            </button>
          )}
        </header>

        <div id={contentId} className="flex flex-wrap items-center gap-2">
          {summaries.map(summary => {
            const isSelected = selectedCommitmentId === summary.id;
            const isSuccess = summary.tone === 'success' || summary.percent >= 100;
            const isInProgress = summary.tone === 'in-progress';
            const pillTitle = [
              summary.title,
              `${summary.percent}% de hoy (${summary.displayValue})`,
              summary.secondaryValue,
              summary.weeklyRiskLabel,
            ].filter(Boolean).join(' · ');

            return (
              <button
                key={summary.id}
                type="button"
                aria-pressed={onToggleFilter ? isSelected : undefined}
                title={pillTitle}
                onClick={() => {
                  if (onToggleFilter) {
                    onToggleFilter(summary.id);
                    return;
                  }
                  if (summary.actions[0] && onSelectAction) {
                    onSelectAction(summary.actions[0].task);
                  }
                }}
                className={cn(
                  'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/35'
                    : isSuccess
                      ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-500/60'
                      : isInProgress
                        ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                        : 'border-border-line/70 bg-base hover:border-border-line',
                )}
              >
                {isSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <CircleDashed className={cn('h-3.5 w-3.5 shrink-0', isInProgress ? 'text-primary' : 'text-text-dim')} aria-hidden="true" />
                )}
                <span className="max-w-[160px] sm:max-w-[200px] truncate text-xs font-medium text-text-main">
                  {summary.title}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[10px] font-bold tabular-nums',
                    isSuccess
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isInProgress
                        ? 'text-primary'
                        : 'text-text-dim',
                  )}
                >
                  {summary.percent}% hoy
                </span>
                {summary.weeklyRisk && summary.weeklyRiskLabel && (
                  <span
                    className={cn(
                      'shrink-0 border-l border-border-line/50 pl-1.5 font-mono text-[9px] font-medium',
                      summary.weeklyRisk === 'missed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {summary.weeklyRiskLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={titleId} className={cn('border-b border-border-line/30 pb-6', className)}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {collapsible ? (
            <button
              type="button"
              className={cn('inline-flex items-center gap-2 border-0 bg-transparent p-0 text-left text-subtitle text-text-main hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer', titleClassName)}
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setIsOpen(open => !open)}
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <Target className="h-4 w-4 text-primary" />
              <span id={titleId}>{title}</span>
            </button>
          ) : (
            <h3 id={titleId} className={cn('text-subtitle flex items-center gap-2', titleClassName)}>
              <Target className="h-4 w-4 text-primary" /> {title}
            </h3>
          )}
          {description && (!collapsible || isOpen) && <p className="mt-1 text-[10px] text-text-dim">{description}</p>}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-text-dim">
          {summaries.length} {summaries.length === 1 ? 'compromiso' : 'compromisos'}
        </span>
      </header>

      {(!collapsible || isOpen) && (
        <div
          id={contentId}
          className={cn(
            'grid gap-3',
            layout === 'single'
              ? 'grid-cols-1'
              : layout === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : onSelectAction
                  ? 'grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {summaries.map(summary => {
            const isExpanded = expandedCardIds.has(summary.id);
            const hasActions = summary.actions.length > 0;
            const actionsId = `commitment-actions-${summary.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

            return (
              <article key={summary.id} className="border-b border-border-line/35 px-1 py-3 first:border-t first:border-border-line/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-medium text-text-main" title={summary.title}>
                        {summary.title}
                      </h4>
                      {hasActions && (
                        <button
                          type="button"
                          onClick={() => toggleCard(summary.id)}
                          className="inline-flex items-center text-text-dim hover:text-primary transition-colors border-0 bg-transparent p-0.5 cursor-pointer rounded shrink-0"
                          aria-expanded={isExpanded}
                          aria-controls={actionsId}
                          aria-label={`${isExpanded ? 'Plegar' : 'Desplegar'} acciones de ${summary.title}`}
                          title={isExpanded ? 'Plegar acciones' : 'Desplegar acciones'}
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                      {typeLabel(summary.targetType)} · Trimestre
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] leading-5 tabular-nums transition-colors',
                      summary.tone === 'success' && 'font-medium text-emerald-600 dark:text-emerald-500',
                      summary.tone === 'danger' && 'font-medium text-red-600 dark:text-red-400',
                      summary.tone === 'in-progress' && 'font-medium text-primary',
                      (!summary.tone || summary.tone === 'neutral') && 'text-text-dim',
                    )}
                  >
                    {summary.displayValue}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] text-text-dim">
                  <span
                    className={cn(
                      'transition-colors',
                      summary.tone === 'success' && 'font-medium text-emerald-600 dark:text-emerald-500',
                      summary.tone === 'danger' && 'font-medium text-red-600 dark:text-red-400',
                      summary.tone === 'in-progress' && 'text-primary',
                    )}
                  >
                    {summary.percent}% {summary.period === 'week' ? 'de la semana' : 'de hoy'}
                  </span>
                  {summary.secondaryValue && <span className="tabular-nums">{summary.secondaryValue}</span>}
                </div>
                <div
                  className="mt-1.5 h-1 overflow-hidden bg-border-line/25"
                  role="progressbar"
                  aria-label={`${summary.period === 'week' ? 'Avance semanal' : 'Avance de hoy'} de ${summary.title}`}
                  aria-valuetext={`${summary.percent}% ${summary.period === 'week' ? 'de la semana' : 'de hoy'}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={summary.percent}
                >
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      summary.tone === 'success' && 'bg-emerald-600/80',
                      summary.tone === 'danger' && 'bg-red-500/80',
                      summary.tone !== 'success' && summary.tone !== 'danger' && (summary.percent >= 100 ? 'bg-emerald-600/80' : 'bg-primary/75'),
                    )}
                    style={{ width: `${summary.percent}%` }}
                  />
                </div>

                {hasActions && (
                  <ul
                    id={actionsId}
                    className={cn("mt-3 space-y-1.5 border-t border-border-line/25 pt-2", !isExpanded && "hidden")}
                    aria-label={`Acciones que aportan a ${summary.title}`}
                    aria-hidden={!isExpanded}
                  >
                    {summary.actions.map(action => {
                      const statusLabel = action.completed ? 'Hecha' : 'Pendiente';
                      const metricLabel = action.plannedHours > 0
                        ? `${action.actualHours.toFixed(1)} / ${action.plannedHours.toFixed(1)} h`
                        : statusLabel;
                      return (
                        <li key={action.task.id}>
                          {onSelectAction ? (
                            <button
                              type="button"
                              onClick={() => onSelectAction(action.task)}
                              className="group flex w-full items-center gap-2 border-0 bg-transparent p-1 text-left text-xs text-text-main transition-colors hover:bg-base-dim/25 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                              aria-label={`Ir a ${action.task.text}. Estado: ${statusLabel}`}
                              title={`Ir a ${action.task.text}`}
                            >
                              {action.completed
                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                : <CircleDashed className="h-3.5 w-3.5 shrink-0 text-text-dim" aria-hidden="true" />}
                              <span className={cn('min-w-0 flex-1 truncate', action.completed && 'text-text-dim')} title={action.task.text}>
                                {action.task.text}
                              </span>
                              <span className="shrink-0 font-mono text-[9px] text-text-dim">{metricLabel}</span>
                              <ArrowUpRight className="h-3 w-3 shrink-0 text-text-dim transition-colors group-hover:text-primary" aria-hidden="true" />
                            </button>
                          ) : (
                            <div className="flex w-full items-center gap-2 p-1 text-left text-xs text-text-main">
                              {action.completed
                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                : <CircleDashed className="h-3.5 w-3.5 shrink-0 text-text-dim" aria-hidden="true" />}
                              <span className={cn('min-w-0 flex-1 truncate', action.completed && 'text-text-dim')} title={action.task.text}>
                                {action.task.text}
                              </span>
                              <span className="shrink-0 font-mono text-[9px] text-text-dim">{metricLabel}</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
