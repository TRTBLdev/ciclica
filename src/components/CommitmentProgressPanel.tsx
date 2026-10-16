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
}

function typeLabel(type: CommitmentPeriodSummary['targetType']): string {
  if (type === 'hours') return 'Horas';
  if (type === 'consistency') return 'Constancia';
  if (type === 'counter') return 'Contador';
  return 'Cumplimiento';
}

export default function CommitmentProgressPanel({ summaries, title, description, collapsible = false, onSelectAction, className, titleClassName }: Props) {
  const [isOpen, setIsOpen] = React.useState(true);
  const panelId = React.useId();
  const titleId = `${panelId}-title`;
  const contentId = `${panelId}-content`;
  if (summaries.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className={cn('border-b border-border-line/30 pb-6', className)}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {collapsible ? (
            <button
              type="button"
              className={cn('inline-flex items-center gap-2 border-0 bg-transparent p-0 text-left text-subtitle text-text-main hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary', titleClassName)}
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

      {(!collapsible || isOpen) && <div id={contentId} className={cn(
        'grid gap-3',
        onSelectAction ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
      )}>
        {summaries.map(summary => (
          <article key={summary.id} className="border-b border-border-line/35 px-1 py-3 first:border-t first:border-border-line/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-medium text-text-main" title={summary.title}>{summary.title}</h4>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                  {typeLabel(summary.targetType)} · Trimestre
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-text-main">{summary.displayValue}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] text-text-dim">
              <span>{summary.percent}% {summary.period === 'week' ? 'de la semana' : 'de hoy'}</span>
              {summary.secondaryValue && <span>{summary.secondaryValue}</span>}
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
                className={cn('h-full transition-all duration-300', summary.percent >= 100 ? 'bg-emerald-600/80' : 'bg-primary/75')}
                style={{ width: `${summary.percent}%` }}
              />
            </div>

            {onSelectAction && (
              <ul className="mt-3 space-y-1.5 border-t border-border-line/25 pt-2" aria-label={`Acciones que aportan a ${summary.title}`}>
                {summary.actions.map(action => {
                  const statusLabel = action.completed ? 'Hecha' : 'Pendiente';
                  const metricLabel = action.plannedHours > 0
                    ? `${action.actualHours.toFixed(1)} / ${action.plannedHours.toFixed(1)} h`
                    : statusLabel;
                  return (
                    <li key={action.task.id}>
                      <button
                        type="button"
                        onClick={() => onSelectAction(action.task)}
                        className="group flex w-full items-center gap-2 border-0 bg-transparent p-1 text-left text-xs text-text-main transition-colors hover:bg-base-dim/25 focus:outline-none focus:ring-1 focus:ring-primary"
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
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        ))}
      </div>}
    </section>
  );
}
