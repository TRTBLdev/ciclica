import React, { useState } from 'react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import { formatRelativeCalendarDate } from '../domain/appearance';
import { ProjectPresentation } from '../domain/projectPresentation';
import CategoryBadge from './ui/CategoryBadge';

export type ProjectCardVariant = 'strategy' | 'timeline' | 'flexible' | 'backlog';

const compactHoursFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatProjectHours(hours: number): string {
  return `${compactHoursFormatter.format(hours)} h`;
}

interface Props {
  key?: React.Key;
  project: AppTask;
  presentation: ProjectPresentation;
  config: Config | null;
  variant: ProjectCardVariant;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleProject: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children?: React.ReactNode;
  completedSection?: React.ReactNode;
  className?: string;
}

function FolderIcon({ completed = false }: { completed?: boolean }) {
  if (completed) {
    return (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="m6.7 10.1 2.05 2.05 4.55-4.55" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path d="M2.75 6.25h5l1.35-2h3.15c1.1 0 2 .9 2 2v.75h1c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4.75c-1.1 0-2-.9-2-2V6.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2.75 7h11.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function DisclosureIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d={expanded ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d={direction === 'up' ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectActions({
  project,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Pick<Props, 'project' | 'onEdit' | 'onDelete' | 'onMoveUp' | 'onMoveDown' | 'canMoveUp' | 'canMoveDown'>) {
  const [open, setOpen] = useState(false);
  if (!onEdit && !onDelete && !onMoveUp && !onMoveDown) return null;

  return (
    <nav className="relative" aria-label={`Acciones de ${project.text}`}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="Opciones del proyecto"
        className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-text-dim transition-colors hover:text-text-main"
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1" />
          <circle cx="8" cy="8" r="1" />
          <circle cx="8" cy="13" r="1" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar opciones"
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent"
            onClick={() => setOpen(false)}
          />
          <menu className="absolute right-0 top-full z-50 m-0 mt-1 w-40 list-none border border-border-line bg-base p-1">
            {onEdit && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    setOpen(false);
                  }}
                  className="w-full border-0 bg-transparent px-3 py-2 text-left text-xs text-text-main hover:bg-base-dim/40"
                >
                  Editar
                </button>
              </li>
            )}
            {onDelete && (
              <li className="border-t border-border-line/50">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (window.confirm(`¿Eliminar permanentemente el proyecto “${project.text}” y todas sus tareas?`)) onDelete();
                  }}
                  className="w-full border-0 bg-transparent px-3 py-2 text-left text-xs text-red-600 hover:bg-red-500/5"
                >
                  Eliminar
                </button>
              </li>
            )}
          </menu>
        </>
      )}
      {(onMoveUp || onMoveDown) && (
        <menu className="m-0 mt-1 flex list-none flex-col items-center p-0">
          <li>
            <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="flex h-5 w-5 items-center justify-center border-0 bg-transparent text-text-dim disabled:opacity-20" aria-label="Mover proyecto arriba">
              <ArrowIcon direction="up" />
            </button>
          </li>
          <li>
            <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="flex h-5 w-5 items-center justify-center border-0 bg-transparent text-text-dim disabled:opacity-20" aria-label="Mover proyecto abajo">
              <ArrowIcon direction="down" />
            </button>
          </li>
        </menu>
      )}
    </nav>
  );
}

function EnergySummary({ presentation }: { presentation: ProjectPresentation }) {
  if (presentation.energy.total <= 0) return <strong className="font-normal text-text-main">Sin estimación</strong>;
  return (
    <strong className="font-normal text-text-main">
      {presentation.energy.investment > 0 ? `${presentation.energy.investment.toFixed(1)} h inversión` : ''}
      {presentation.energy.investment > 0 && presentation.energy.support > 0 ? ' · ' : ''}
      {presentation.energy.support > 0 ? `${presentation.energy.support.toFixed(1)} h soporte` : ''}
    </strong>
  );
}

export default function ProjectCard({
  project,
  presentation,
  config,
  variant,
  expanded,
  onToggleExpanded,
  onToggleProject,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  children,
  completedSection,
  className,
}: Props) {
  const isStrategy = variant === 'strategy';
  const isBacklog = variant === 'backlog';
  const closeBlocked = !project.completed && presentation.pendingCount > 0;
  const statusLabel = project.completed
    ? `Reabrir proyecto ${project.text}`
    : closeBlocked
      ? `No se puede cerrar: quedan ${presentation.pendingCount} tareas pendientes`
      : `Cerrar proyecto ${project.text}`;

  return (
    <article
      id={`task-item-${project.id}`}
      className={cn(
        'border-b border-border-line/50 py-4 text-left',
        project.completed && 'opacity-60 grayscale',
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => {
            if (!closeBlocked) onToggleProject();
          }}
          aria-disabled={closeBlocked}
          aria-label={statusLabel}
          title={statusLabel}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-0 bg-transparent text-text-main',
            closeBlocked ? 'cursor-not-allowed opacity-65' : 'cursor-pointer hover:text-primary',
          )}
        >
          <FolderIcon completed={!!project.completed} />
        </button>

        <section className="min-w-0 flex-1 text-left">
          <section className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className={cn('min-w-0 text-base font-medium text-text-main', project.completed && 'line-through')}>
              <button type="button" onClick={onToggleExpanded} aria-expanded={expanded} className="border-0 bg-transparent p-0 text-left text-inherit">
                {project.text}
              </button>
            </h3>
            {(project.category || project.subCategory) && (
              <ul className="m-0 flex list-none items-center gap-1.5 p-0" aria-label="Clasificación del proyecto">
                <li><CategoryBadge area={project.category} subCategory={project.subCategory} config={config} /></li>
              </ul>
            )}
          </section>

          {isStrategy ? (
            <>
              <ul className="mt-2 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 font-mono text-[10px] text-text-dim">
                <li>{presentation.scheduleLabel}{project.hora && presentation.scheduleLabel !== 'Sin programación' ? ` · ${project.hora}` : ''}</li>
                <li>{presentation.completedCount}/{presentation.totalCount} tareas · {presentation.progress}%</li>
                <li>
                  Últ. {presentation.lastActivityDate
                    ? formatRelativeCalendarDate(presentation.lastActivityDate)
                    : 'sin actividad'}
                </li>
                <li>{presentation.trackedHours.toFixed(1)} h reales / {presentation.totalEstimate.toFixed(1)} h estimadas</li>
                {presentation.deadline && <li>Límite {formatRelativeCalendarDate(presentation.deadline)}</li>}
              </ul>
              <progress
                max={100}
                value={presentation.progress}
                aria-label={`Progreso del proyecto: ${presentation.progress}%`}
                className="mt-3 block h-0.5 w-full max-w-xs overflow-hidden accent-emerald-600"
              />
            </>
          ) : (
            <ul className="mt-2 flex list-none flex-wrap items-center gap-x-3 gap-y-1 p-0 font-mono text-[10px] text-text-dim">
              <li>{isBacklog ? 'Sin programación' : variant === 'timeline' ? project.hora : 'Flexible'}</li>
              <li>Pendientes {presentation.pendingCount}</li>
              {presentation.openEstimate > 0 && <li>Estimación {formatProjectHours(presentation.openEstimate)}</li>}
            </ul>
          )}
        </section>

        <menu className="m-0 flex shrink-0 list-none items-start gap-1 p-0">
          <li>
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? 'Contraer proyecto' : 'Expandir proyecto'}
              className="flex h-6 w-6 items-center justify-center border-0 bg-transparent text-text-dim transition-colors hover:text-text-main"
            >
              <DisclosureIcon expanded={expanded} />
            </button>
          </li>
          <li>
            <ProjectActions
              project={project}
              onEdit={onEdit}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
            />
          </li>
        </menu>
      </header>

      {expanded && (
        <section className="ml-9 mt-4" aria-label={`Contenido de ${project.text}`}>
          {isStrategy && (
            <ul className="mb-4 flex list-none flex-wrap gap-x-8 gap-y-3 border-b border-border-line/40 p-0 pb-4 text-[10px] text-text-dim">
              <li className="flex min-w-28 flex-col gap-1">
                <small className="font-mono text-[10px] uppercase tracking-[0.12em]">Inicio</small>
                <strong className="font-normal text-text-main">{presentation.startDate ? formatRelativeCalendarDate(presentation.startDate) : 'Sin iniciar'}</strong>
              </li>
              <li className="flex min-w-32 flex-col gap-1">
                <small className="font-mono text-[10px] uppercase tracking-[0.12em]">Última actividad</small>
                <strong className="font-normal text-text-main">{presentation.lastActivityDate ? formatRelativeCalendarDate(presentation.lastActivityDate) : 'Sin actividad'}</strong>
              </li>
              <li className="flex min-w-32 flex-col gap-1">
                <small className="font-mono text-[10px] uppercase tracking-[0.12em]">Próxima aparición</small>
                <strong className="font-normal text-text-main">{presentation.nextAppearanceDate ? formatRelativeCalendarDate(presentation.nextAppearanceDate) : 'Sin programación'}</strong>
              </li>
              <li className="flex min-w-24 flex-col gap-1">
                <small className="font-mono text-[10px] uppercase tracking-[0.12em]">Estimación abierta</small>
                <strong className="font-normal text-text-main">{presentation.openEstimate.toFixed(1)} h</strong>
              </li>
              <li className="flex min-w-40 flex-col gap-1">
                <small className="font-mono text-[10px] uppercase tracking-[0.12em]">Asignación</small>
                <EnergySummary presentation={presentation} />
              </li>
            </ul>
          )}

          {presentation.pendingCount === 0 && !isStrategy ? (
            <p className="py-3 text-xs text-text-dim">Sin tareas pendientes.</p>
          ) : children}
          {completedSection}
        </section>
      )}
    </article>
  );
}
