import React from 'react';
import { PauseCircle } from 'lucide-react';
import { AppTask, Config, HistoryRecord } from '../types';
import { getPauseRootTasks, getDirectPauseStart } from '../domain/pause';
import { getProjectForTask } from '../domain/workTracking';
import TaskItem from './TaskItem';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  onDeleteTask: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onResumeTask: (id: string) => void;
  onNavigate?: (view: string, taskId?: string) => void;
}

const GROUPS: { title: string; types: AppTask['type'][] }[] = [
  { title: 'Proyectos y tareas', types: ['Proyecto', 'Tarea'] },
  { title: 'Rutinas y hábitos', types: ['Rutina', 'Hábito'] },
  { title: 'Pulsos', types: ['Pulso'] },
];

function pauseLabel(task: AppTask): string {
  const startedAt = getDirectPauseStart(task);
  return startedAt ? `Desde ${new Date(startedAt).toLocaleDateString('es-ES')}` : 'Pausa heredada';
}

export default function PausedView({
  config,
  tasks,
  history,
  onDeleteTask,
  onDuplicateTask,
  onUpdateTask,
  onResumeTask,
  onNavigate,
}: Props) {
  const roots = getPauseRootTasks(tasks);

  return (
    <div className="animate-in fade-in flex min-h-full flex-col bg-base px-6 pb-16 pt-8 text-left md:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-border-line/50 pb-5">
        <div>
          <h1 className="text-title flex items-center gap-3 leading-none"><PauseCircle className="h-6 w-6" /> En pausa</h1>
          <p className="mt-2 text-sm text-text-dim">Elementos detenidos temporalmente. El historial se conserva y la reanudación continúa con su calendario original.</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">{roots.length} raíces pausadas</span>
      </header>

      {roots.length === 0 ? (
        <div className="border border-dashed border-border-line/50 bg-base-dim/10 py-12 text-center text-sm text-text-dim">
          No hay elementos en pausa.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          {GROUPS.map(group => {
            const groupRoots = roots.filter(task => group.types.includes(task.type));
            return (
              <section key={group.title} aria-labelledby={`paused-${group.title}`}>
                <h2 id={`paused-${group.title}`} className="mb-4 border-b border-border-line/40 pb-2 font-sans text-[10px] uppercase tracking-widest text-text-dim">
                  {group.title} ({groupRoots.length})
                </h2>
                {groupRoots.length === 0 ? (
                  <p className="border border-dashed border-border-line/30 py-6 text-center text-xs text-text-dim/60">Sin elementos.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {groupRoots.map(task => {
                      const parentProject = getProjectForTask(task.id, tasks);
                      const parent = task.parentId ? tasks.find(candidate => candidate.id === task.parentId) : undefined;
                      const context = parentProject?.text || parent?.text;
                      return (
                        <article key={task.id} className="border border-border-line/50 bg-base-dim/10 p-2">
                          <div className="mb-1 flex items-center justify-between px-2 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                            <span>{pauseLabel(task)}</span>
                            {context && <span className="truncate pl-3" title={context}>{context}</span>}
                          </div>
                          <TaskItem
                            task={task}
                            config={config}
                            allTasks={tasks}
                            history={history}
                            onToggle={() => undefined}
                            onDelete={() => onDeleteTask(task.id)}
                            onUpdate={onUpdateTask}
                            onDeleteTask={onDeleteTask}
                            onDuplicateTask={onDuplicateTask}
                            onResumeTask={onResumeTask}
                            onNavigate={onNavigate}
                            context={task.type === 'Proyecto' ? 'project' : 'routine'}
                          />
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
