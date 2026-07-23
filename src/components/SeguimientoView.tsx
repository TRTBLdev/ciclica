import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, ProgressSnapshot } from '../types';
import { cn } from '../lib/utils';
import { formatDateOnly, getNominalDays, getRoutineCycleProgress, isRoutineConfigured, isTaskScheduledOnDate } from '../domain/recurrenceProgress';
import {
  completedHistoryForDate,
  getPulseState,
  getPulseOccurrenceCount,
  getRecentDates,
  hasPulseSafeDayConfirmation,
  getRoutineAppearanceSnapshot,
  getTaskTrackingSummary,
  normalizePulsePolarity,
  TrackingCellState,
} from '../domain/trackingProgress';
import { isAppearanceScheduledOnDate } from '../domain/appearance';
import {
  getDescendantTaskIds,
  getHistoryDateKey,
  getProjectForTask,
  getWorkDayState,
  getWorkedHoursForDate,
  WorkDayState,
} from '../domain/workTracking';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  progressSnapshots: ProgressSnapshot[];
}

interface RoutineGroup {
  routine: AppTask;
  habits: AppTask[];
}

interface GroupedTrackingItems {
  routines: RoutineGroup[];
  standaloneHabits: AppTask[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function buildRoutineGroups(tasks: AppTask[], predicate: (task: AppTask) => boolean): GroupedTrackingItems {
  const routines = tasks.filter(task => task.type === 'Rutina' && isRoutineConfigured(task));
  const eligibleHabits = tasks.filter(task => task.type === 'Hábito' && predicate(task));
  const groups = routines.map(routine => ({
    routine,
    habits: eligibleHabits.filter(habit => habit.parentId === routine.id),
  })).filter(group => predicate(group.routine) || group.habits.length > 0);
  const groupedHabitIds = new Set(groups.flatMap(group => group.habits.map(habit => habit.id)));

  return {
    routines: groups,
    standaloneHabits: eligibleHabits.filter(habit => !groupedHabitIds.has(habit.id)),
  };
}

function plannedDatesInMonth(task: AppTask, year: number, month: number) {
  const total = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= total; day += 1) {
    if (isTaskScheduledOnDate(task, new Date(year, month, day))) count += 1;
  }
  return count;
}

function formatShortDate(value?: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export default function SeguimientoView({ config, tasks, history, progressSnapshots }: Props) {
  void config;
  const today = new Date();
  const days = getRecentDates(30, today);
  const pulses = tasks.filter(task => task.type === 'Pulso');
  const trackable = tasks.filter(task => task.type === 'Hábito' || (task.type === 'Rutina' && isRoutineConfigured(task)));
  const frequent = buildRoutineGroups(trackable, task => getNominalDays(task.frecuencia, task.frecuenciaUnidad) < 7);
  const monthly = buildRoutineGroups(trackable, task => getNominalDays(task.frecuencia, task.frecuenciaUnidad) >= 7);
  const year = today.getFullYear();
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(() => new Set());
  const toggleRoutine = (section: 'frequent' | 'monthly', routineId: string) => {
    const key = `${section}:${routineId}`;
    setExpandedRoutines(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasFrequent = frequent.routines.length > 0 || frequent.standaloneHabits.length > 0;
  const hasMonthly = monthly.routines.length > 0 || monthly.standaloneHabits.length > 0;

  return (
    <main className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 text-left">
      <ProjectWorkCalendar tasks={tasks} history={history} />

      <section>
        <h2 className="text-title mb-1">Pulsos</h2>
        <p className="text-xs text-text-dim mb-5">Cada registro cuenta como una ocurrencia durante los últimos 30 días. La polaridad define qué significa cumplir la meta.</p>
        {pulses.length === 0 ? <Empty text="No hay pulsos configurados." /> : (
          <div className="space-y-4 overflow-x-auto pb-2">
            <TrackingHeader days={days} />
            {pulses.map(pulse => {
              const target = Math.max(1, pulse.targetCount || pulse.objetivo || 1);
              const isAbandoning = normalizePulsePolarity(pulse.polaridad) === 'Abandonar';
              return (
                <React.Fragment key={pulse.id}><TrackingRow
                  label={(
                    <div className="min-w-0">
                      <span className="block truncate text-xs text-text-main" title={pulse.text}>{pulse.text}</span>
                      <span className={cn('text-[9px] font-mono uppercase tracking-wider', isAbandoning ? 'text-red-600' : 'text-primary')}>
                        {isAbandoning ? 'Abandonar' : 'Reforzar'} · {isAbandoning ? 'límite' : 'meta'} {target} {pulse.unitLabel || 'veces'}
                      </span>
                    </div>
                  )}
                  days={days}
                  renderCell={date => {
                    const count = getPulseOccurrenceCount(history, pulse.id, date);
                    const safeDayConfirmed = hasPulseSafeDayConfirmation(history, pulse.id, date);
                    const state = getPulseState(pulse, count, safeDayConfirmed);
                    const status = isAbandoning
                      ? state === 'complete' ? 'logrado: día libre confirmado' : state === 'unconfirmed' ? 'sin registro' : state === 'partial' ? 'en progreso' : state === 'failed' ? 'incumplido: alcanzó el límite' : 'excedido'
                      : state === 'complete' ? 'logrado' : state === 'partial' ? 'en progreso' : state === 'exceeded' ? 'excedido' : 'sin registro';
                    return <Cell state={state} title={`${formatDateOnly(date)}: ${count}/${target} · ${status}`} value={count || undefined} />;
                  }}
                /></React.Fragment>
              );
            })}
          </div>
        )}
        <Legend labels={[
          ['complete', 'Logrado'], ['unconfirmed', 'Sin registro'], ['partial', 'En progreso'], ['failed', 'Incumplido'], ['exceeded', 'Excedido'],
        ]} />
      </section>

      <section>
        <h2 className="text-title mb-1">Ritmo frecuente</h2>
        <p className="text-xs text-text-dim mb-5">Hoy aparece primero; desplaza hacia la derecha para consultar los 29 días anteriores.</p>
        {!hasFrequent ? <Empty text="No hay elementos con ritmo menor de siete días." /> : (
          <div className="space-y-3 overflow-x-auto pb-2">
            <TrackingHeader days={days} />
            {frequent.routines.map(group => (
              <React.Fragment key={group.routine.id}><FrequentRoutineGroup
                group={group}
                days={days}
                tasks={tasks}
                history={history}
                snapshots={progressSnapshots}
                expanded={expandedRoutines.has(`frequent:${group.routine.id}`)}
                onToggle={() => toggleRoutine('frequent', group.routine.id)}
              /></React.Fragment>
            ))}
            {frequent.standaloneHabits.map(habit => (
              <React.Fragment key={habit.id}><HabitTrackingRow habit={habit} days={days} history={history} /></React.Fragment>
            ))}
          </div>
        )}
        <Legend labels={[['complete', 'Completo'], ['executed', 'Fuera de agenda'], ['partial', 'Parcial'], ['absent', 'Ausente'], ['unscheduled', 'No programado']]} />
      </section>

      <section>
        <h2 className="text-title mb-1">Resumen mensual · {year}</h2>
        <p className="text-xs text-text-dim mb-5">Cierres reales frente a apariciones nominales. Las sesiones parciales del timer no cuentan.</p>
        {!hasMonthly ? <Empty text="No hay hábitos o rutinas con frecuencia semanal o mayor." /> : (
          <div className="overflow-x-auto border border-border-line/50">
            <table className="w-full min-w-[980px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-line bg-base-dim/20">
                  <th className="sticky left-0 z-20 w-[230px] min-w-[230px] bg-base-dim px-3 py-2.5 text-left font-mono uppercase tracking-wider">Elemento</th>
                  <th className="sticky left-[230px] z-20 w-[86px] min-w-[86px] bg-base-dim px-2 py-2.5 text-center font-mono font-normal uppercase tracking-wider text-text-dim">Cumplimiento</th>
                  {MONTHS.map(month => <th key={month} className="w-[54px] min-w-[54px] px-1 py-2.5 text-center font-mono font-normal text-text-dim">{month}</th>)}
                </tr>
              </thead>
              <tbody>
                {monthly.routines.map(group => (
                  <React.Fragment key={group.routine.id}>
                    <MonthlyTaskRow
                      task={group.routine}
                      history={history}
                      snapshots={progressSnapshots}
                      year={year}
                      expandable={group.habits.length > 0}
                      expanded={expandedRoutines.has(`monthly:${group.routine.id}`)}
                      onToggle={() => toggleRoutine('monthly', group.routine.id)}
                    />
                    {expandedRoutines.has(`monthly:${group.routine.id}`) && group.habits.map(habit => (
                      <React.Fragment key={habit.id}><MonthlyTaskRow task={habit} scheduleTask={group.routine} history={history} snapshots={progressSnapshots} year={year} nested /></React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {monthly.standaloneHabits.map(habit => (
                  <React.Fragment key={habit.id}><MonthlyTaskRow task={habit} history={history} snapshots={progressSnapshots} year={year} /></React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ProjectWorkCalendar({ tasks, history }: { tasks: AppTask[]; history: HistoryRecord[] }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());
  const monthDays = Array.from(
    { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
  );
  const activeProjects = tasks
    .filter(task => task.type === 'Proyecto' && !task.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.text.localeCompare(b.text));
  const standaloneTasks = tasks
    .filter(task => task.type === 'Tarea' && !task.completed && !getProjectForTask(task.id, tasks))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.text.localeCompare(b.text));
  const monthTitle = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(month);

  const moveMonth = (offset: number) => {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(previous => {
      const next = new Set(previous);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const getCellLabel = (label: string, taskIds: string[], date: Date, planned: boolean, hours: number) => {
    const dateKey = formatDateOnly(date);
    const details = history
      .filter(record => taskIds.includes(record.taskId) && getHistoryDateKey(record) === dateKey && (record.duration || 0) > 0)
      .map(record => {
        const task = tasks.find(candidate => candidate.id === record.taskId);
        return `${task?.text || record.taskSnapshotText || 'Elemento'} ${(record.duration || 0).toFixed(2)} h`;
      });
    const status = planned && hours > 0
      ? 'programado y ejecutado'
      : planned ? 'programado, sin ejecución'
        : hours > 0 ? 'ejecutado fuera de programación'
          : 'sin programación ni ejecución';
    return `${label}, ${dateKey}: ${status}${details.length ? `. ${details.join(', ')}` : ''}`;
  };

  const renderWorkCell = (label: string, taskIds: string[], date: Date, planned: boolean) => {
    const hours = getWorkedHoursForDate(taskIds, history, date);
    const state = getWorkDayState(planned, hours);
    const cellLabel = getCellLabel(label, taskIds, date, planned, hours);
    return (
      <td key={formatDateOnly(date)} className="p-1 text-center">
        <output
          aria-label={cellLabel}
          title={cellLabel}
          className={cn(
            'mx-auto flex h-6 w-6 items-center justify-center border text-[8px] font-mono',
            workStateClassName(state),
          )}
        >
          {hours > 0 ? hours.toFixed(1) : ''}
        </output>
      </td>
    );
  };

  const hasRows = activeProjects.length > 0 || standaloneTasks.length > 0;

  return (
    <section aria-labelledby="project-work-title">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <section>
          <h2 id="project-work-title" className="text-title mb-1">Trabajo mensual</h2>
          <p className="text-xs text-text-dim">Programación y ejecución real de proyectos y tareas pendientes. Las ejecuciones de 0 h no pintan el día.</p>
        </section>
        <nav aria-label="Cambiar mes de seguimiento" className="flex items-center gap-3">
          <button type="button" onClick={() => moveMonth(-1)} className="border-0 bg-transparent px-2 py-1 text-lg text-text-dim hover:text-text-main" aria-label="Mes anterior">‹</button>
          <time dateTime={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`} className="min-w-36 text-center text-xs font-mono uppercase tracking-wider text-text-main">
            {monthTitle}
          </time>
          <button type="button" onClick={() => moveMonth(1)} className="border-0 bg-transparent px-2 py-1 text-lg text-text-dim hover:text-text-main" aria-label="Mes siguiente">›</button>
        </nav>
      </header>

      {!hasRows ? <Empty text="No hay proyectos o tareas pendientes para seguir." /> : (
        <section className="overflow-x-auto border border-border-line/50" aria-label={`Trabajo en ${monthTitle}`}>
          <table className="w-full min-w-max border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-line bg-base-dim/20">
                <th className="sticky left-0 z-20 min-w-[210px] bg-base-dim px-3 py-2.5 text-left font-mono uppercase tracking-wider">Elemento</th>
                {monthDays.map(date => (
                  <th key={formatDateOnly(date)} className="w-8 min-w-8 px-1 py-2 text-center font-normal text-text-dim">
                    <abbr title={date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} className="no-underline">
                      {date.toLocaleDateString('es-ES', { weekday: 'narrow' })}
                    </abbr>
                    <time dateTime={formatDateOnly(date)} className="block font-mono text-[9px]">{date.getDate()}</time>
                  </th>
                ))}
              </tr>
            </thead>

            {activeProjects.map(project => {
              const projectTaskIds = [
                project.id,
                ...tasks
                  .filter(task => getProjectForTask(task.id, tasks)?.id === project.id)
                  .map(task => task.id),
              ];
              const descendantIds = new Set(getDescendantTaskIds(project.id, tasks));
              const pendingTasks = tasks
                .filter(task => task.type === 'Tarea'
                  && !task.completed
                  && descendantIds.has(task.id)
                  && getProjectForTask(task.id, tasks)?.id === project.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0) || a.text.localeCompare(b.text));
              const expanded = expandedProjects.has(project.id);

              return (
                <tbody key={project.id} className="border-b border-border-line/40">
                  <tr className="bg-base-dim/10">
                    <th scope="row" className="sticky left-0 z-10 min-w-[210px] bg-base-dim px-3 py-2 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        aria-expanded={expanded}
                        className="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left text-xs text-text-main"
                      >
                        <b aria-hidden="true" className="w-3 text-primary">{expanded ? '−' : '+'}</b>
                        {project.text}
                        <small className="ml-auto font-mono text-[8px] text-text-dim">{pendingTasks.length}</small>
                      </button>
                    </th>
                    {monthDays.map(date => renderWorkCell(
                      project.text,
                      projectTaskIds,
                      date,
                      isAppearanceScheduledOnDate(project, date),
                    ))}
                  </tr>
                  {expanded && pendingTasks.map(task => {
                    const createdDate = getHistoryDateKey({ date: task.createdAt });
                    return (
                      <tr key={task.id}>
                        <th scope="row" className="sticky left-0 z-10 min-w-[210px] bg-base px-3 py-2 pl-8 text-left font-normal text-text-dim">↳ {task.text}</th>
                        {monthDays.map(date => renderWorkCell(
                          task.text,
                          [task.id],
                          date,
                          formatDateOnly(date) >= createdDate && isAppearanceScheduledOnDate(project, date),
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}

            {standaloneTasks.length > 0 && (
              <tbody>
                <tr className="border-b border-border-line/40 bg-base-dim/20">
                  <th colSpan={monthDays.length + 1} className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim">Tareas sueltas</th>
                </tr>
                {standaloneTasks.map(task => (
                  <tr key={task.id} className="border-b border-border-line/30 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 min-w-[210px] bg-base px-3 py-2 text-left font-normal text-text-main">{task.text}</th>
                    {monthDays.map(date => renderWorkCell(
                      task.text,
                      [task.id],
                      date,
                      isAppearanceScheduledOnDate(task, date),
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </section>
      )}

      <ul className="mt-4 flex flex-wrap gap-4 text-[9px] font-mono uppercase text-text-dim" aria-label="Leyenda">
        {([
          ['planned', 'Programado'],
          ['executed', 'Ejecutado fuera de agenda'],
          ['matched', 'Programado y ejecutado'],
        ] as [WorkDayState, string][]).map(([state, label]) => (
          <li key={state} className="flex items-center gap-1.5">
            <output aria-hidden="true" className={cn('h-4 w-4 border', workStateClassName(state))} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function workStateClassName(state: WorkDayState): string {
  if (state === 'planned') return 'border-primary/40 bg-primary/10 text-primary';
  if (state === 'executed') return 'border-primary bg-primary text-white';
  if (state === 'matched') return 'border-emerald-600 bg-emerald-600 text-white';
  return 'border-border-line/30 bg-transparent text-text-dim';
}

function FrequentRoutineGroup({
  group, days, tasks, history, snapshots, expanded, onToggle,
}: {
  group: RoutineGroup;
  days: Date[];
  tasks: AppTask[];
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { routine, habits } = group;
  const cycleProgress = getRoutineCycleProgress(routine, tasks, snapshots);
  const summary = getTaskTrackingSummary(routine, history, snapshots);
  const row = (
    <TrackingRow
      label={(
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            {habits.length > 0 && <span className="w-3 text-[11px] text-primary" aria-hidden="true">{expanded ? '−' : '+'}</span>}
            <span className="truncate text-xs font-semibold text-text-main" title={routine.text}>{routine.text}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 max-w-16 overflow-hidden rounded-full bg-base-dim/70">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${cycleProgress}%` }} />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary">Ciclo {cycleProgress}% · {summary.dueCount ? `${summary.compliancePercent}% cumplimiento` : 'sin hitos'}</span>
          </div>
        </div>
      )}
      days={days}
      renderCell={date => <RoutineAppearanceCell routine={routine} date={date} snapshots={snapshots} />}
    />
  );

  return (
    <div className="border-b border-border-line/35 pb-2">
      {habits.length > 0 ? (
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer hover:bg-base-dim/20 transition-colors">
          {row}
        </button>
      ) : row}
      {expanded && habits.map(habit => <React.Fragment key={habit.id}><HabitTrackingRow habit={habit} scheduleTask={routine} days={days} history={history} nested /></React.Fragment>)}
    </div>
  );
}

function RoutineAppearanceCell({ routine, date, snapshots }: { routine: AppTask; date: Date; snapshots: ProgressSnapshot[] }) {
  if (!isTaskScheduledOnDate(routine, date)) return <Cell state="unscheduled" title={`${formatDateOnly(date)}: no programado`} />;
  const snapshot = getRoutineAppearanceSnapshot(snapshots, routine.id, date);
  if (!snapshot) return <Cell state="absent" title={`${formatDateOnly(date)}: sin registro de aparición`} />;
  const target = Math.max(1, snapshot.targetPercent || 100);
  const state: TrackingCellState = snapshot.progressPercent >= target ? 'complete' : 'partial';
  return <Cell state={state} title={`${formatDateOnly(date)}: ${snapshot.progressPercent}% / meta ${target}%`} />;
}

function HabitTrackingRow({
  habit, scheduleTask, days, history, nested = false,
}: {
  habit: AppTask;
  scheduleTask?: AppTask;
  days: Date[];
  history: HistoryRecord[];
  nested?: boolean;
}) {
  return (
    <TrackingRow
      label={<span className={cn('block truncate text-xs text-text-main', nested && 'pl-5 text-text-dim')} title={habit.text}>{nested && '↳ '}{habit.text}</span>}
      days={days}
      renderCell={date => {
        const scheduled = isTaskScheduledOnDate(scheduleTask || habit, date);
        const completed = completedHistoryForDate(history, habit.id, date) > 0;
        const state: TrackingCellState = completed
          ? scheduled ? 'complete' : 'executed'
          : scheduled ? 'absent' : 'unscheduled';
        return <Cell state={state} title={`${formatDateOnly(date)}: ${completed ? scheduled ? 'completo' : 'ejecutado fuera de agenda' : scheduled ? 'ausente' : 'no programado'}`} />;
      }}
    />
  );
}

function MonthlyTaskRow({
  task, scheduleTask, history, snapshots, year, expandable = false, expanded = false, nested = false, onToggle,
}: {
  task: AppTask;
  scheduleTask?: AppTask;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  year: number;
  expandable?: boolean;
  expanded?: boolean;
  nested?: boolean;
  onToggle?: () => void;
}) {
  const summary = getTaskTrackingSummary(task, history, snapshots);
  const isRoutine = task.type === 'Rutina';
  const scheduleMeta = summary.pendingDate
    ? `Pendiente ${formatShortDate(summary.pendingDate)}`
    : `${isRoutine ? 'Avance' : 'Últ.'} ${formatShortDate(summary.lastActivityDate)} · Próx. ${formatShortDate(summary.nextDate)}`;
  const stickyBackground = isRoutine ? 'bg-base-dim/15' : 'bg-base';
  const label = (
    <>
      <span className="flex items-center gap-2 max-w-[200px]">
        {expandable && <span className="w-3 text-primary" aria-hidden="true">{expanded ? '−' : '+'}</span>}
        <span className={cn('truncate', nested && 'pl-4 text-text-dim')} title={task.text}>{nested && '↳ '}{task.text}</span>
      </span>
      <span className="text-[9px] font-mono uppercase text-text-dim">{isRoutine ? 'Rutina' : 'Hábito'}</span>
      <span className={cn('block mt-0.5 max-w-[210px] truncate text-[8px] font-mono', summary.pendingDate ? 'text-red-600' : 'text-text-dim')} title={scheduleMeta}>{scheduleMeta}</span>
    </>
  );

  return (
    <tr className={cn('border-b border-border-line/40 last:border-0', isRoutine && 'bg-base-dim/15')}>
      <th className={cn('sticky left-0 z-10 w-[230px] min-w-[230px] px-3 py-2 text-left font-normal', stickyBackground)}>
        {expandable ? <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer">{label}</button> : label}
      </th>
      <td className={cn('sticky left-[230px] z-[9] w-[86px] min-w-[86px] px-2 py-2 text-center font-mono text-primary', stickyBackground)}>{summary.dueCount ? `${summary.compliancePercent}%` : '—'}</td>
      {MONTHS.map((_, month) => <React.Fragment key={month}><MonthlyResultCell task={task} scheduleTask={scheduleTask} history={history} snapshots={snapshots} year={year} month={month} /></React.Fragment>)}
    </tr>
  );
}

function MonthlyResultCell({
  task, scheduleTask, history, snapshots, year, month,
}: {
  task: AppTask;
  scheduleTask?: AppTask;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  year: number;
  month: number;
}) {
  const expected = plannedDatesInMonth(scheduleTask || task, year, month);
  if (task.type === 'Hábito') {
    const actual = history.filter(record => record.taskId === task.id && record.isCompletion && new Date(record.date).getFullYear() === year && new Date(record.date).getMonth() === month).length;
    if (!expected && !actual) return <td className="px-2 py-3 text-center text-text-dim/30">—</td>;
    return <td className="p-0"><MonthlyCell actual={actual} expected={expected} detail={!expected && actual ? 'fuera de agenda' : undefined} /></td>;
  }
  if (!expected) return <td className="px-2 py-3 text-center text-text-dim/30">—</td>;
  const records = snapshots.filter(snapshot => snapshot.taskId === task.id
    && snapshot.kind === 'routine-appearance'
    && new Date(`${snapshot.periodStart}T00:00:00`).getFullYear() === year
    && new Date(`${snapshot.periodStart}T00:00:00`).getMonth() === month);
  const actual = records.filter(snapshot => snapshot.progressPercent >= Math.max(1, snapshot.targetPercent || 100)).length;
  const average = records.length ? Math.round(records.reduce((sum, snapshot) => sum + snapshot.progressPercent, 0) / records.length) : 0;
  return <td className="p-0"><MonthlyCell actual={actual} expected={expected} detail={records.length ? `${average}% prom.` : undefined} /></td>;
}

function TrackingHeader({ days }: { days: Date[] }) {
  return (
    <div className="grid grid-cols-[190px_repeat(30,20px)] gap-1 items-end min-w-[980px] border-b border-border-line/40 pb-2">
      <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim">Hoy → pasado</span>
      {days.map((date, index) => <span key={formatDateOnly(date)} className={cn('text-center text-[8px] font-mono text-text-dim', index === 0 && 'font-bold text-primary')} title={formatDateOnly(date)}>{date.getDate()}</span>)}
    </div>
  );
}

function TrackingRow({ label, days, renderCell }: { label: React.ReactNode; days: Date[]; renderCell: (date: Date) => React.ReactNode }) {
  return <div className="grid grid-cols-[190px_repeat(30,20px)] gap-1 items-center min-w-[980px] py-1"><div>{label}</div>{days.map(date => <React.Fragment key={formatDateOnly(date)}>{renderCell(date)}</React.Fragment>)}</div>;
}

function Cell({ state, title, value }: { state: TrackingCellState; title: string; value?: number }) {
  return <div title={title} className={cn('w-5 h-5 border flex items-center justify-center text-[8px] font-mono', state === 'complete' && 'bg-emerald-600 border-emerald-600 text-white', state === 'executed' && 'bg-primary border-primary text-white', state === 'partial' && 'bg-amber-400/60 border-amber-500/50 text-text-main', state === 'failed' && 'bg-red-500/30 border-red-500/60 text-red-800', state === 'exceeded' && 'bg-red-700 border-red-700 text-white', state === 'absent' && 'bg-red-500/10 border-red-500/30', state === 'unconfirmed' && 'bg-transparent border-border-line/60', state === 'unscheduled' && 'bg-transparent border-border-line/30')}>{value}</div>;
}

function MonthlyCell({ actual, expected, detail }: { actual: number; expected: number; detail?: string }) {
  return <div className={cn('px-1 py-2 text-center font-mono', actual >= expected ? 'text-emerald-600' : actual > 0 ? 'text-amber-600' : 'text-text-dim')}><span>{actual}/{expected}</span>{detail && <span className="block text-[8px] text-text-dim mt-0.5">{detail}</span>}</div>;
}

function Legend({ labels }: { labels: [TrackingCellState, string][] }) {
  return <div className="flex flex-wrap gap-4 mt-4">{labels.map(([state, label]) => <div key={state} className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-text-dim"><Cell state={state} title={label} /><span>{label}</span></div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-text-dim border border-dashed border-border-line px-4 py-6 text-center">{text}</p>;
}
