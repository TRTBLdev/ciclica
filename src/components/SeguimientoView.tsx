import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, ProgressSnapshot } from '../types';
import { cn } from '../lib/utils';
import { DateRange, formatDateOnly, getNominalDays, isRoutineConfigured, isTaskScheduledOnDate } from '../domain/recurrenceProgress';
import {
  getPulseState,
  getPulseOccurrenceCount,
  getRecentDates,
  hasPulseSafeDayConfirmation,
  getTaskTrackingSummary,
  normalizePulsePolarity,
  TrackingCellState,
} from '../domain/trackingProgress';
import { getAppearanceFrequency, getAppearanceMode, getAppearanceUnit, getStandaloneQuotaCount, isAppearanceScheduledOnDate } from '../domain/appearance';
import {
  getHabitResultsInRange,
  getRoutineCycleProgress,
  getSnapshotResolvedAt,
  getSnapshotResultStatus,
  hasPositiveActivityOnDate,
} from '../domain/occurrenceResults';
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
  const routines = tasks.filter(task => task.type === 'Rutina' && isRoutineConfigured(task) && predicate(task));
  const habits = tasks.filter(task => task.type === 'Hábito');
  const groups = routines.map(routine => ({
    routine,
    habits: habits.filter(habit => habit.parentId === routine.id),
  }));
  const groupedHabitIds = new Set(groups.flatMap(group => group.habits.map(habit => habit.id)));

  return {
    routines: groups,
    standaloneHabits: habits.filter(habit => !habit.parentId && predicate(habit) && !groupedHabitIds.has(habit.id)),
  };
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
  const frequent = buildRoutineGroups(trackable, task => (
    getAppearanceMode(task) === 'quota'
    || getNominalDays(getAppearanceFrequency(task), getAppearanceUnit(task)) < 7
  ));
  const monthly = buildRoutineGroups(trackable, task => (
    getAppearanceMode(task) !== 'quota'
    && getNominalDays(getAppearanceFrequency(task), getAppearanceUnit(task)) >= 7
  ));
  const year = today.getFullYear();
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(() => new Set());
  const toggleRoutine = (routineId: string) => {
    setExpandedRoutines(previous => {
      const next = new Set(previous);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
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
                expanded={expandedRoutines.has(group.routine.id)}
                onToggle={() => toggleRoutine(group.routine.id)}
              /></React.Fragment>
            ))}
            {frequent.standaloneHabits.map(habit => (
              <React.Fragment key={habit.id}><HabitTrackingRow habit={habit} days={days} history={history} snapshots={progressSnapshots} /></React.Fragment>
            ))}
          </div>
        )}
        <ResultLegend />
      </section>

      <section>
        <h2 className="text-title mb-1">Resumen mensual · {year}</h2>
        <p className="text-xs text-text-dim mb-5">Promedio de apariciones y ciclos cerrados o vencidos en cada mes. El punto indica actividad sin convertirla en cierre.</p>
        {!hasMonthly ? <Empty text="No hay hábitos o rutinas con frecuencia semanal o mayor." /> : (
          <section className="overflow-x-auto border border-border-line/50" aria-label="Resultados mensuales">
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
                      activityTaskIds={group.habits.map(habit => habit.id)}
                    />
                    {group.habits.map(habit => (
                      <React.Fragment key={habit.id}><MonthlyTaskRow task={habit} history={history} snapshots={progressSnapshots} year={year} nested /></React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {monthly.standaloneHabits.map(habit => (
                  <React.Fragment key={habit.id}><MonthlyTaskRow task={habit} history={history} snapshots={progressSnapshots} year={year} /></React.Fragment>
                ))}
              </tbody>
            </table>
          </section>
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
  const cycleProgress = getRoutineCycleProgress(routine, tasks, history, snapshots);
  const summary = getTaskTrackingSummary(routine, history, snapshots);
  const habitIds = habits.map(habit => habit.id);
  const row = (
    <TrackingRow
      label={(
        <header className="min-w-0 pr-2">
          <strong className="flex items-center gap-2 truncate text-xs text-text-main" title={routine.text}>
            {habits.length > 0 && <b className="w-3 text-[11px] font-normal text-primary" aria-hidden="true">{expanded ? '−' : '+'}</b>}
            {routine.text}
          </strong>
          <small className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-primary">
            Ciclo {cycleProgress}% · {summary.lastActivityDate ? `últ. ${formatShortDate(summary.lastActivityDate)}` : 'sin actividad'}
          </small>
        </header>
      )}
      days={days}
      renderCell={date => (
        <RoutineCycleCell
          routine={routine}
          habitIds={habitIds}
          date={date}
          history={history}
          snapshots={snapshots}
        />
      )}
    />
  );

  return (
    <section className="border-b border-border-line/35 pb-2">
      {habits.length > 0 ? (
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer hover:bg-base-dim/20 transition-colors">
          {row}
        </button>
      ) : row}
      {expanded && habits.map(habit => <React.Fragment key={habit.id}><HabitTrackingRow habit={habit} scheduleTask={routine} days={days} history={history} snapshots={snapshots} nested /></React.Fragment>)}
    </section>
  );
}

function RoutineCycleCell({
  routine, habitIds, date, history, snapshots,
}: {
  routine: AppTask;
  habitIds: string[];
  date: Date;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
}) {
  const dateKey = formatDateOnly(date);
  const snapshot = snapshots.find(candidate => candidate.kind === 'routine-cycle'
    && candidate.taskId === routine.id
    && getSnapshotResolvedAt(candidate) === dateKey);
  const scheduled = isTaskScheduledOnDate(routine, date);
  const activity = hasPositiveActivityOnDate(habitIds, history, date);
  if (!snapshot) {
    return <ResultCell state={scheduled ? 'planned' : 'empty'} activity={activity} label={`${dateKey}: ${scheduled ? 'oportunidad programada' : 'sin programación'}${activity ? ', con actividad' : ''}`} />;
  }
  const status = getSnapshotResultStatus(snapshot);
  const state: ResultCellState = status === 'complete'
    ? scheduled ? 'complete-planned' : 'complete-extra'
    : status === 'partial'
      ? scheduled ? 'partial-planned' : 'partial-extra'
      : 'missed';
  return <ResultCell state={state} activity={activity} label={`${dateKey}: rutina ${status === 'complete' ? 'completa' : status === 'partial' ? `parcial, ${snapshot.progressPercent}%` : 'no completada'}`} />;
}

function HabitTrackingRow({
  habit, scheduleTask, days, history, snapshots, nested = false,
}: {
  habit: AppTask;
  scheduleTask?: AppTask;
  days: Date[];
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  nested?: boolean;
}) {
  const quota = getAppearanceMode(habit) === 'quota';
  const quotaLabel = quota
    ? ` · ${getStandaloneQuotaCount(habit, history)}/${Math.max(1, habit.quotaTarget || 1)}`
    : '';
  return (
    <TrackingRow
      label={<p className={cn('m-0 truncate text-xs text-text-main', nested && 'pl-5 text-text-dim')} title={habit.text}>{nested && '↳ '}{habit.text}{quotaLabel}</p>}
      days={days}
      renderCell={date => {
        const dateKey = formatDateOnly(date);
        const scheduled = isTaskScheduledOnDate(scheduleTask || habit, date);
        const result = getDailyHabitResult(habit, history, snapshots, dateKey);
        const activity = hasPositiveActivityOnDate([habit.id], history, date);
        if (!result) {
          const isToday = dateKey === formatDateOnly(new Date());
          const state: ResultCellState = quota
            ? 'empty'
            : scheduled ? 'planned' : 'empty';
          const status = quota
            ? 'sin cierre de cuota'
            : scheduled ? isToday ? 'pendiente' : 'aparición programada' : 'sin agenda';
          return <ResultCell state={state} activity={activity} label={`${dateKey}: ${status}${activity ? ', con actividad' : ''}`} />;
        }
        const state: ResultCellState = result.status === 'complete'
          ? scheduled ? 'complete-planned' : 'complete-extra'
          : result.status === 'partial'
            ? scheduled ? 'partial-planned' : 'partial-extra'
            : 'missed';
        return <ResultCell state={state} activity={activity} label={`${dateKey}: ${result.status === 'complete' ? scheduled ? 'completo en fecha' : 'completo fuera de fecha' : result.status === 'partial' ? `${scheduled ? 'parcial en fecha' : 'parcial fuera de fecha'}, ${result.progressPercent}%` : 'no completado'}${activity ? ', con actividad' : ''}`} />;
      }}
    />
  );
}

function MonthlyTaskRow({
  task, history, snapshots, year, activityTaskIds, nested = false,
}: {
  task: AppTask;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  year: number;
  activityTaskIds?: string[];
  nested?: boolean;
}) {
  const summary = getTaskTrackingSummary(task, history, snapshots);
  const isRoutine = task.type === 'Rutina';
  const yearResults = getResolvedResults(task, history, snapshots, {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  });
  const annualAverage = yearResults.length
    ? Math.round(yearResults.reduce((sum, result) => sum + result.progressPercent, 0) / yearResults.length)
    : undefined;
  const scheduleMeta = summary.pendingDate
    ? `Pendiente ${formatShortDate(summary.pendingDate)}`
    : `${isRoutine ? 'Avance' : 'Últ.'} ${formatShortDate(summary.lastActivityDate)} · Próx. ${formatShortDate(summary.nextDate)}`;
  const stickyBackground = isRoutine ? 'bg-base-dim/15' : 'bg-base';
  const label = (
    <header className={cn('max-w-[210px]', nested && 'pl-4 text-text-dim')}>
      <strong className="block truncate font-normal" title={task.text}>{nested && '↳ '}{task.text}</strong>
      <small className="block text-[9px] font-mono uppercase text-text-dim">{isRoutine ? 'Rutina' : 'Hábito'}</small>
      <small className={cn('mt-0.5 block truncate text-[8px] font-mono', summary.pendingDate ? 'text-red-600' : 'text-text-dim')} title={scheduleMeta}>{scheduleMeta}</small>
    </header>
  );

  return (
    <tr className={cn('border-b border-border-line/40 last:border-0', isRoutine && 'bg-base-dim/15')}>
      <th className={cn('sticky left-0 z-10 w-[230px] min-w-[230px] px-3 py-2 text-left font-normal', stickyBackground)}>
        {label}
      </th>
      <td className={cn('sticky left-[230px] z-[9] w-[86px] min-w-[86px] px-2 py-2 text-center font-mono text-primary', stickyBackground)}>{annualAverage === undefined ? '—' : `${annualAverage}%`}</td>
      {MONTHS.map((_, month) => <React.Fragment key={month}><MonthlyResultCell task={task} history={history} snapshots={snapshots} year={year} month={month} activityTaskIds={activityTaskIds} /></React.Fragment>)}
    </tr>
  );
}

function MonthlyResultCell({
  task, history, snapshots, year, month, activityTaskIds,
}: {
  task: AppTask;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  year: number;
  month: number;
  activityTaskIds?: string[];
}) {
  const start = formatDateOnly(new Date(year, month, 1));
  const end = formatDateOnly(new Date(year, month + 1, 0));
  const records = getResolvedResults(task, history, snapshots, { start, end });
  const average = records.length
    ? Math.round(records.reduce((sum, record) => sum + record.progressPercent, 0) / records.length)
    : undefined;
  const ids = activityTaskIds?.length ? activityTaskIds : [task.id];
  const activity = history.some(record => ids.includes(record.taskId)
    && (record.duration || 0) > 0
    && getHistoryDateKey(record) >= start
    && getHistoryDateKey(record) <= end);
  const label = `${MONTHS[month]} ${year}: ${average === undefined ? 'sin resultado' : `${average}% promedio de ${records.length} ${records.length === 1 ? 'resultado' : 'resultados'}`}${activity ? ', con actividad' : ''}`;
  return <td className="p-0"><MonthlyOutcomeCell percentage={average} activity={activity} label={label} /></td>;
}

type ResultCellState =
  | 'empty'
  | 'planned'
  | 'complete-planned'
  | 'complete-extra'
  | 'partial-planned'
  | 'partial-extra'
  | 'missed';

interface ResolvedResult {
  progressPercent: number;
  status: 'complete' | 'partial' | 'missed';
}

function getDailyHabitResult(
  habit: AppTask,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  date: string,
): ResolvedResult | undefined {
  return getHabitResultsInRange(habit, history, snapshots, { start: date, end: date })[0];
}

function getResolvedResults(
  task: AppTask,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  range: DateRange,
): ResolvedResult[] {
  if (task.type === 'Hábito') return getHabitResultsInRange(task, history, snapshots, range);
  return snapshots
    .filter(snapshot => snapshot.kind === 'routine-cycle'
      && snapshot.taskId === task.id
      && getSnapshotResolvedAt(snapshot) >= range.start
      && getSnapshotResolvedAt(snapshot) <= range.end)
    .map(snapshot => ({
      progressPercent: Math.max(0, Math.min(100, snapshot.progressPercent)),
      status: getSnapshotResultStatus(snapshot),
    }));
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

function ResultCell({
  state, activity = false, label,
}: {
  state: ResultCellState;
  activity?: boolean;
  label: string;
}) {
  return (
    <output
      aria-label={label}
      title={label}
      data-result={state}
      data-activity={activity ? 'true' : 'false'}
      className="tracking-result-cell"
    />
  );
}

function MonthlyOutcomeCell({
  percentage, activity, label,
}: {
  percentage?: number;
  activity: boolean;
  label: string;
}) {
  return (
    <output
      aria-label={label}
      title={label}
      data-activity={activity ? 'true' : 'false'}
      className={cn(
        'tracking-month-cell',
        percentage === 100 ? 'text-emerald-700' : percentage === 0 ? 'text-red-700' : 'text-primary',
      )}
    >
      {percentage === undefined ? '—' : `${percentage}%`}
    </output>
  );
}

function ResultLegend() {
  const entries: [ResultCellState, string][] = [
    ['empty', 'Sin agenda'],
    ['planned', 'Pendiente'],
    ['complete-planned', 'Completo · en fecha'],
    ['complete-extra', 'Completo · fuera de fecha'],
    ['partial-planned', 'Parcial · en fecha'],
    ['partial-extra', 'Parcial · fuera de fecha'],
    ['missed', 'No completado'],
  ];
  return (
    <ul className="mt-4 flex list-none flex-wrap gap-4 p-0 text-[9px] font-mono uppercase text-text-dim" aria-label="Leyenda de hábitos y rutinas">
      {entries.map(([state, label]) => (
        <li key={state} className="flex items-center gap-1.5">
          <ResultCell state={state} label={label} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <ResultCell state="empty" activity label="Actividad guardada" />
        Actividad guardada
      </li>
    </ul>
  );
}

function Legend({ labels }: { labels: [TrackingCellState, string][] }) {
  return <div className="flex flex-wrap gap-4 mt-4">{labels.map(([state, label]) => <div key={state} className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-text-dim"><Cell state={state} title={label} /><span>{label}</span></div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-text-dim border border-dashed border-border-line px-4 py-6 text-center">{text}</p>;
}
