import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { AppTask, Config, HistoryRecord, ProgressSnapshot } from '../types';
import { cn } from '../lib/utils';
import { DateRange, formatDateOnly, isRoutineConfigured, isTaskScheduledOnDate } from '../domain/recurrenceProgress';
import {
  getPulseState,
  getPulseOccurrenceCount,
  getRecentDates,
  hasPulseSafeDayConfirmation,
  getTaskTrackingSummary,
  normalizePulsePolarity,
  TrackingCellState,
} from '../domain/trackingProgress';
import { getAppearanceMode, getStandaloneQuotaCount, isAppearanceScheduledOnDate } from '../domain/appearance';
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
  const days = getRecentDates(30, today).reverse();
  const pulses = tasks.filter(task => task.type === 'Pulso');
  const trackable = tasks.filter(task => task.type === 'Hábito' || (task.type === 'Rutina' && isRoutineConfigured(task)));
  const allHabitsRoutines = buildRoutineGroups(trackable, () => true);
  const year = today.getFullYear();
  const [trackingView, setTrackingView] = useState<'30days' | 'annual'>('30days');
  const [expandedRoutines, setExpandedRoutines] = useState<Set<string>>(() => new Set());
  const toggleRoutine = (routineId: string) => {
    setExpandedRoutines(previous => {
      const next = new Set(previous);
      if (next.has(routineId)) next.delete(routineId);
      else next.add(routineId);
      return next;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const pulsosScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (pulsosScrollRef.current) {
        pulsosScrollRef.current.scrollLeft = pulsosScrollRef.current.scrollWidth;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (trackingView === '30days') {
      const frame = requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [trackingView]);

  const hasItems = allHabitsRoutines.routines.length > 0 || allHabitsRoutines.standaloneHabits.length > 0;

  return (
    <main className="p-6 md:p-10 max-w-6xl mx-auto xl:mx-0 space-y-12 text-left">
      <section>
        <h2 className="text-title mb-1">Pulsos</h2>
        <p className="text-xs text-text-dim mb-5">Cada registro cuenta como una ocurrencia durante los últimos 30 días. La polaridad define qué significa cumplir la meta.</p>
        {pulses.length === 0 ? <Empty text="No hay pulsos configurados." /> : (
          <div ref={pulsosScrollRef} className="overflow-auto max-h-[50vh] sm:max-h-[60vh] pb-2">
            <table className="w-max border-collapse text-xs">
              <TrackingDaysHeader days={days} />
              <tbody>
                {pulses.map(pulse => {
                  const target = Math.max(1, pulse.targetCount || pulse.objetivo || 1);
                  const isAbandoning = normalizePulsePolarity(pulse.polaridad) === 'Abandonar';
                  return (
                    <tr key={pulse.id} className="border-b border-border-line/30 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-normal border-r border-border-line/30 overflow-hidden">
                        <div className="min-w-0">
                          <span className="block truncate text-xs text-text-main font-light" title={pulse.text}>{pulse.text}</span>
                          <span className={cn('text-[9px] font-mono uppercase tracking-wider font-light', isAbandoning ? 'text-red-600' : 'text-primary')}>
                            {isAbandoning ? 'Abandonar' : 'Reforzar'} · {isAbandoning ? 'límite' : 'meta'} {target} {pulse.unitLabel || 'veces'}
                          </span>
                        </div>
                      </th>
                      {days.map(date => {
                        const count = getPulseOccurrenceCount(history, pulse.id, date);
                        const safeDayConfirmed = hasPulseSafeDayConfirmation(history, pulse.id, date);
                        const state = getPulseState(pulse, count, safeDayConfirmed);
                        const status = isAbandoning
                          ? state === 'complete' ? 'logrado: día libre confirmado' : state === 'unconfirmed' ? 'sin registro' : state === 'partial' ? 'en progreso' : state === 'failed' ? 'incumplido: alcanzó el límite' : 'excedido'
                          : state === 'complete' ? 'logrado' : state === 'partial' ? 'en progreso' : state === 'exceeded' ? 'excedido' : 'sin registro';
                        const isFirstDayOfMonth = date.getDate() === 1;
                        return (
                          <td
                            key={formatDateOnly(date)}
                            className={cn(
                              "p-0 text-center align-middle h-full",
                              isFirstDayOfMonth && "border-l-2 border-[#c27150]/60 pl-0.5"
                            )}
                          >
                            <Cell state={state} title={`${formatDateOnly(date)}: ${count}/${target} · ${status}`} value={count || undefined} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Legend labels={[
          ['complete', 'Logrado'], ['unconfirmed', 'Sin registro'], ['partial', 'En progreso'], ['failed', 'Incumplido'], ['exceeded', 'Excedido'],
        ]} />
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-title mb-1">Hábitos y Rutinas</h2>
            <p className="text-xs text-text-dim">
              {trackingView === '30days'
                ? 'Pasado a la izquierda; hoy al extremo derecho. Desplaza para consultar los días anteriores.'
                : `Promedio de apariciones y ciclos cerrados o vencidos en cada mes · ${year}.`}
            </p>
          </div>
          <div className="flex items-center gap-6 border-b border-border-line/40 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTrackingView('30days')}
              className={cn(
                'flex items-center gap-1.5 pb-2 -mb-px text-xs font-mono uppercase tracking-wider transition-all cursor-pointer bg-transparent border-0 border-b-2 outline-none',
                trackingView === '30days'
                  ? 'border-text-main text-text-main font-bold'
                  : 'border-transparent text-text-dim hover:text-text-main'
              )}
            >
              <CalendarDays className={cn('w-3.5 h-3.5 transition-colors', trackingView === '30days' ? 'text-text-main' : 'text-text-dim')} />
              <span>30 días</span>
            </button>
            <button
              type="button"
              onClick={() => setTrackingView('annual')}
              className={cn(
                'flex items-center gap-1.5 pb-2 -mb-px text-xs font-mono uppercase tracking-wider transition-all cursor-pointer bg-transparent border-0 border-b-2 outline-none',
                trackingView === 'annual'
                  ? 'border-text-main text-text-main font-bold'
                  : 'border-transparent text-text-dim hover:text-text-main'
              )}
            >
              <CalendarRange className={cn('w-3.5 h-3.5 transition-colors', trackingView === 'annual' ? 'text-text-main' : 'text-text-dim')} />
              <span>Resumen anual</span>
            </button>
          </div>
        </div>

        {!hasItems ? (
          <Empty text="No hay hábitos o rutinas configurados." />
        ) : trackingView === '30days' ? (
          <>
            <div ref={scrollRef} className="overflow-auto max-h-[65vh] sm:max-h-[75vh] pb-2 border-b border-border-line/20">
              <table className="w-max border-collapse text-xs">
                <TrackingDaysHeader days={days} />
                <tbody>
                  {allHabitsRoutines.routines.length > 0 && (
                    <tr className="border-b border-border-line/40">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim font-light border-r border-border-line/30">
                        Rutinas
                      </th>
                      {days.map(date => (
                        <td key={formatDateOnly(date)} className={cn("p-0 text-center align-middle h-full", date.getDate() === 1 && "border-l-2 border-[#c27150]/60 pl-0.5")} />
                      ))}
                    </tr>
                  )}
                  {allHabitsRoutines.routines.map(group => {
                    const { routine, habits } = group;
                    const cycleProgress = getRoutineCycleProgress(routine, tasks, history, progressSnapshots);
                    const summary = getTaskTrackingSummary(routine, history, progressSnapshots);
                    const habitIds = habits.map(habit => habit.id);
                    const expanded = expandedRoutines.has(routine.id);

                    return (
                      <React.Fragment key={routine.id}>
                        <tr className="border-b border-border-line/30">
                          <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-normal border-r border-border-line/30 overflow-hidden">
                            {habits.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleRoutine(routine.id)}
                                aria-expanded={expanded}
                                className="w-full text-left bg-transparent border-0 p-0 cursor-pointer"
                              >
                                <header className="min-w-0 pr-2">
                                  <span className="flex items-center gap-2 truncate text-xs font-light text-text-main" title={routine.text}>
                                    <span className="w-3 text-[11px] font-light text-text-dim" aria-hidden="true">{expanded ? '−' : '+'}</span>
                                    {routine.text}
                                  </span>
                                  <small className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-text-dim font-light">
                                    Ciclo {cycleProgress}% · {summary.lastActivityDate ? `últ. ${formatShortDate(summary.lastActivityDate)}` : 'sin actividad'}
                                  </small>
                                </header>
                              </button>
                            ) : (
                              <header className="min-w-0 pr-2">
                                <span className="block truncate text-xs font-light text-text-main" title={routine.text}>{routine.text}</span>
                                <small className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-text-dim font-light">
                                  Ciclo {cycleProgress}% · {summary.lastActivityDate ? `últ. ${formatShortDate(summary.lastActivityDate)}` : 'sin actividad'}
                                </small>
                              </header>
                            )}
                          </th>
                          {days.map(date => (
                            <td
                              key={formatDateOnly(date)}
                              className={cn(
                                "p-0 text-center align-middle h-full",
                                date.getDate() === 1 && "border-l-2 border-[#c27150]/60 pl-0.5"
                              )}
                            >
                              <RoutineCycleCell
                                routine={routine}
                                habitIds={habitIds}
                                date={date}
                                history={history}
                                snapshots={progressSnapshots}
                              />
                            </td>
                          ))}
                        </tr>
                        {expanded && habits.map(habit => (
                          <tr key={habit.id} className="border-b border-border-line/20">
                            <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pl-4 pr-2 text-left font-normal text-text-dim border-r border-border-line/30 overflow-hidden">
                              <p className="m-0 truncate text-xs font-light text-text-dim" title={habit.text}>
                                ↳ {habit.text}{getAppearanceMode(habit) === 'quota' ? ` · ${getStandaloneQuotaCount(habit, history)}/${Math.max(1, habit.quotaTarget || 1)}` : ''}
                              </p>
                            </th>
                            {days.map(date => renderHabitCell(habit, routine, date, history, progressSnapshots))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {allHabitsRoutines.standaloneHabits.length > 0 && (
                    <tr className="border-b border-border-line/40">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim font-light border-r border-border-line/30">
                        Hábitos simples
                      </th>
                      {days.map(date => (
                        <td key={formatDateOnly(date)} className={cn("p-0 text-center align-middle h-full", date.getDate() === 1 && "border-l-2 border-[#c27150]/60 pl-0.5")} />
                      ))}
                    </tr>
                  )}
                  {allHabitsRoutines.standaloneHabits.map(habit => (
                    <tr key={habit.id} className="border-b border-border-line/30 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-normal text-text-main border-r border-border-line/30 overflow-hidden">
                        <p className="m-0 truncate text-xs font-light text-text-main" title={habit.text}>
                          {habit.text}{getAppearanceMode(habit) === 'quota' ? ` · ${getStandaloneQuotaCount(habit, history)}/${Math.max(1, habit.quotaTarget || 1)}` : ''}
                        </p>
                      </th>
                      {days.map(date => renderHabitCell(habit, undefined, date, history, progressSnapshots))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ResultLegend />
          </>
        ) : (
          <section className="overflow-auto max-h-[65vh] sm:max-h-[75vh] pb-2" aria-label="Resultados mensuales">
            <table className="w-max border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-line sticky top-0 z-30 bg-base">
                  <th className="sticky top-0 left-0 z-40 w-[140px] sm:w-[230px] min-w-[140px] sm:min-w-[230px] max-w-[140px] sm:max-w-[230px] bg-base px-3 py-2.5 text-left text-[9px] font-mono uppercase tracking-wider text-text-dim border-r border-border-line/30">Elemento</th>
                  <th className="sticky top-0 left-[140px] sm:left-[230px] z-40 w-[86px] min-w-[86px] bg-base px-2 py-2.5 text-center text-[9px] font-mono uppercase tracking-wider text-text-dim border-r border-border-line/30">Cumplimiento</th>
                  {MONTHS.map(month => <th key={month} className="w-[54px] min-w-[54px] px-1 py-2.5 text-center text-[9px] font-mono uppercase text-text-dim">{month}</th>)}
                </tr>
              </thead>
              <tbody>
                {allHabitsRoutines.routines.length > 0 && (
                  <tr className="border-b border-border-line/40">
                    <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[230px] min-w-[140px] sm:min-w-[230px] max-w-[140px] sm:max-w-[230px] bg-base px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim border-r border-border-line/30">
                      Rutinas
                    </th>
                    <td colSpan={MONTHS.length + 1} className="bg-base" />
                  </tr>
                )}
                {allHabitsRoutines.routines.map(group => (
                  <React.Fragment key={group.routine.id}>
                    <MonthlyTaskRow
                      task={group.routine}
                      history={history}
                      snapshots={progressSnapshots}
                      year={year}
                      activityTaskIds={group.habits.map(habit => habit.id)}
                      expanded={expandedRoutines.has(group.routine.id)}
                      onToggle={() => toggleRoutine(group.routine.id)}
                      hasNested={group.habits.length > 0}
                    />
                    {expandedRoutines.has(group.routine.id) && group.habits.map(habit => (
                      <React.Fragment key={habit.id}>
                        <MonthlyTaskRow task={habit} history={history} snapshots={progressSnapshots} year={year} nested />
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                {allHabitsRoutines.standaloneHabits.length > 0 && (
                  <tr className="border-b border-border-line/40">
                    <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[230px] min-w-[140px] sm:min-w-[230px] max-w-[140px] sm:max-w-[230px] bg-base px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim border-r border-border-line/30">
                      Hábitos simples
                    </th>
                    <td colSpan={MONTHS.length + 1} className="bg-base" />
                  </tr>
                )}
                {allHabitsRoutines.standaloneHabits.map(habit => (
                  <React.Fragment key={habit.id}>
                    <MonthlyTaskRow task={habit} history={history} snapshots={progressSnapshots} year={year} />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </section>

      <ProjectWorkCalendar tasks={tasks} history={history} days={days} />
    </main>
  );
}

function TrackingDaysHeader({ days }: { days: Date[] }) {
  return (
    <thead>
      <tr className="border-b border-border-line sticky top-0 z-30 bg-base">
        <th className="sticky top-0 left-0 z-40 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2.5 pr-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim border-r border-border-line/30">
          Pasado → hoy
        </th>
        {days.map((date, index) => {
          const isToday = index === days.length - 1;
          const isFirstDayOfMonth = date.getDate() === 1;
          const fullDateTitle = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
          const monthShort = MONTHS[date.getMonth()].toUpperCase();

          return (
            <th
              key={formatDateOnly(date)}
              className={cn(
                "w-6 min-w-[24px] px-0 py-1 text-center font-normal text-text-dim h-full",
                isFirstDayOfMonth && "border-l-2 border-[#c27150]/60 pl-0.5"
              )}
            >
              <abbr
                title={fullDateTitle}
                className={cn(
                  "no-underline text-[9px]",
                  isToday ? "font-bold text-primary" : isFirstDayOfMonth ? "font-bold text-[#c27150]" : "text-text-dim"
                )}
              >
                {date.toLocaleDateString('es-ES', { weekday: 'narrow' })}
              </abbr>
              {isFirstDayOfMonth ? (
                <div className="flex flex-col items-center leading-none mt-0.5" title={fullDateTitle}>
                  <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-[#c27150] pb-0.5">
                    {monthShort}
                  </span>
                  <time
                    dateTime={formatDateOnly(date)}
                    className="block font-mono text-[8px] font-bold text-[#c27150]"
                  >
                    1
                  </time>
                </div>
              ) : (
                <time
                  dateTime={formatDateOnly(date)}
                  className={cn('block font-mono text-[8px]', isToday ? 'font-bold text-primary' : 'text-text-dim')}
                  title={fullDateTitle}
                >
                  {date.getDate()}
                </time>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function renderHabitCell(
  habit: AppTask,
  scheduleTask: AppTask | undefined,
  date: Date,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
) {
  const dateKey = formatDateOnly(date);
  const quota = getAppearanceMode(habit) === 'quota';
  const scheduled = isTaskScheduledOnDate(scheduleTask || habit, date);
  const result = getDailyHabitResult(habit, history, snapshots, dateKey);
  const activity = hasPositiveActivityOnDate([habit.id], history, date);
  const isFirstDayOfMonth = date.getDate() === 1;

  let cellNode: React.ReactNode;
  if (!result) {
    const isToday = dateKey === formatDateOnly(new Date());
    const state: ResultCellState = quota
      ? 'empty'
      : scheduled ? 'planned' : 'empty';
    const status = quota
      ? 'sin cierre de cuota'
      : scheduled ? isToday ? 'pendiente' : 'aparición programada' : 'sin agenda';
    cellNode = <ResultCell state={state} activity={activity} label={`${dateKey}: ${status}${activity ? ', con actividad' : ''}`} />;
  } else {
    const state: ResultCellState = result.status === 'complete'
      ? 'complete'
      : result.status === 'partial'
        ? 'partial'
        : 'missed';
    cellNode = <ResultCell state={state} activity={activity} label={`${dateKey}: ${result.status === 'complete' ? 'completo' : result.status === 'partial' ? `parcial, ${result.progressPercent}%` : 'no completado'}${activity ? ', con actividad' : ''}`} />;
  }

  return (
    <td
      key={dateKey}
      className={cn(
        "p-0 text-center align-middle h-full",
        isFirstDayOfMonth && "border-l-2 border-[#c27150]/60 pl-0.5"
      )}
    >
      {cellNode}
    </td>
  );
}

function ProjectWorkCalendar({ tasks, history, days }: { tasks: AppTask[]; history: HistoryRecord[]; days: Date[] }) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());
  const activeProjects = tasks
    .filter(task => task.type === 'Proyecto' && !task.completed)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.text.localeCompare(b.text));
  const standaloneTasks = tasks
    .filter(task => task.type === 'Tarea' && !task.completed && !getProjectForTask(task.id, tasks))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.text.localeCompare(b.text));

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
    const isFirstDayOfMonth = date.getDate() === 1;
    return (
      <td
        key={formatDateOnly(date)}
        className={cn(
          "p-0 text-center align-middle h-full",
          isFirstDayOfMonth && "border-l-2 border-[#c27150]/60 pl-0.5"
        )}
      >
        <output
          aria-label={cellLabel}
          title={cellLabel}
          className={cn(
            'mx-auto flex h-5 w-5 items-center justify-center border text-[8px] font-mono',
            workStateClassName(state),
          )}
        >
          {hours > 0 ? Math.round(hours) : ''}
        </output>
      </td>
    );
  };

  const hasRows = activeProjects.length > 0 || standaloneTasks.length > 0;

  return (
    <section aria-labelledby="project-work-title">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <section>
          <h2 id="project-work-title" className="text-title mb-1">Trabajo en curso</h2>
          <p className="text-xs text-text-dim">Programación y ejecución real de proyectos y tareas pendientes en los últimos 30 días. Las ejecuciones de 0 h no pintan el día.</p>
        </section>
      </header>

      {!hasRows ? <Empty text="No hay proyectos o tareas pendientes para seguir." /> : (
        <section className="overflow-auto max-h-[65vh] sm:max-h-[75vh] pb-2" aria-label="Trabajo en curso (30 días)">
          <table className="w-max border-collapse text-xs">
            <TrackingDaysHeader days={days} />

            <tbody>
              {activeProjects.length > 0 && (
                <tr className="border-b border-border-line/40">
                  <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim font-light border-r border-border-line/30">
                    Proyectos
                  </th>
                  {days.map(date => (
                    <td key={formatDateOnly(date)} className={cn("p-0 text-center align-middle h-full", date.getDate() === 1 && "border-l-2 border-[#c27150]/60 pl-0.5")} />
                  ))}
                </tr>
              )}

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
                  <React.Fragment key={project.id}>
                    <tr className="border-b border-border-line/30">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-normal border-r border-border-line/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleProject(project.id)}
                          aria-expanded={expanded}
                          className="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left text-xs text-text-main cursor-pointer"
                        >
                          <span aria-hidden="true" className="w-3 text-[11px] font-light text-text-dim">{expanded ? '−' : '+'}</span>
                          <span className="truncate font-light text-xs text-text-main">{project.text}</span>
                          <small className="ml-auto font-mono text-[8px] text-text-dim font-light">{pendingTasks.length}</small>
                        </button>
                      </th>
                      {days.map(date => renderWorkCell(
                        project.text,
                        projectTaskIds,
                        date,
                        isAppearanceScheduledOnDate(project, date),
                      ))}
                    </tr>
                    {expanded && pendingTasks.map(task => {
                      const createdDate = getHistoryDateKey({ date: task.createdAt });
                      return (
                        <tr key={task.id} className="border-b border-border-line/20">
                          <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pl-4 pr-2 text-left font-normal text-text-dim border-r border-border-line/30 overflow-hidden">
                            <span className="truncate font-light text-xs text-text-dim">↳ {task.text}</span>
                          </th>
                          {days.map(date => renderWorkCell(
                            task.text,
                            [task.id],
                            date,
                            formatDateOnly(date) >= createdDate && isAppearanceScheduledOnDate(project, date),
                          ))}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {standaloneTasks.length > 0 && (
                <>
                  <tr className="border-b border-border-line/40">
                    <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-mono text-[9px] uppercase tracking-wider text-text-dim font-light border-r border-border-line/30">
                      Tareas sueltas
                    </th>
                    {days.map(date => (
                      <td key={formatDateOnly(date)} className={cn("p-0 text-center align-middle h-full", date.getDate() === 1 && "border-l-2 border-[#c27150]/60 pl-0.5")} />
                    ))}
                  </tr>
                  {standaloneTasks.map(task => (
                    <tr key={task.id} className="border-b border-border-line/30 last:border-0">
                      <th scope="row" className="sticky left-0 z-10 w-[140px] sm:w-[190px] min-w-[140px] sm:min-w-[190px] max-w-[140px] sm:max-w-[190px] bg-base py-2 pr-2 text-left font-normal text-text-main border-r border-border-line/30 overflow-hidden">
                        <span className="truncate font-light text-xs text-text-main">{task.text}</span>
                      </th>
                      {days.map(date => renderWorkCell(
                        task.text,
                        [task.id],
                        date,
                        isAppearanceScheduledOnDate(task, date),
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
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
  if (state === 'planned') return 'border-[#C8E8E3] bg-[#C8E8E3] text-text-main';
  if (state === 'executed') return 'border-[#FEF494] bg-[#FEF494] text-text-main';
  if (state === 'matched') return 'border-emerald-600 bg-emerald-600 text-white';
  return 'border-border-line/30 bg-transparent text-text-dim';
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
    ? 'complete'
    : status === 'partial'
      ? 'partial'
      : 'missed';
  return <ResultCell state={state} activity={activity} label={`${dateKey}: rutina ${status === 'complete' ? 'completa' : status === 'partial' ? `parcial, ${snapshot.progressPercent}%` : 'no completada'}`} />;
}


function MonthlyTaskRow({
  task, history, snapshots, year, activityTaskIds, nested = false,
  expanded, onToggle, hasNested,
}: {
  task: AppTask;
  history: HistoryRecord[];
  snapshots: ProgressSnapshot[];
  year: number;
  activityTaskIds?: string[];
  nested?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  hasNested?: boolean;
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

  const labelContent = (
    <header className={cn('max-w-[210px]', nested && 'pl-4')}>
      <span className={cn("flex items-center gap-2 truncate font-light text-xs", nested ? "text-text-dim" : "text-text-main")} title={task.text}>
        {!nested && hasNested && <span className="w-3 text-[11px] font-light text-text-dim" aria-hidden="true">{expanded ? '−' : '+'}</span>}
        {nested && '↳ '}{task.text}
      </span>
      <small className="block text-[9px] font-mono uppercase text-text-dim font-light">{isRoutine ? 'Rutina' : 'Hábito'}</small>
      <small className={cn('mt-0.5 block truncate text-[8px] font-mono', summary.pendingDate ? 'text-red-600' : 'text-text-dim')} title={scheduleMeta}>{scheduleMeta}</small>
    </header>
  );

  const label = onToggle ? (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left bg-transparent border-0 p-0 cursor-pointer">
      {labelContent}
    </button>
  ) : labelContent;

  return (
    <tr className="border-b border-border-line/40 last:border-0">
      <th className="sticky left-0 z-10 w-[140px] sm:w-[230px] min-w-[140px] sm:min-w-[230px] max-w-[140px] sm:max-w-[230px] px-3 py-2 text-left font-normal bg-base border-r border-border-line/30 overflow-hidden">
        {label}
      </th>
      <td className="sticky left-[140px] sm:left-[230px] z-[9] w-[86px] min-w-[86px] px-2 py-2 text-center text-[9px] font-mono text-primary bg-base border-r border-border-line/30">{annualAverage === undefined ? '—' : `${annualAverage}%`}</td>
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
  | 'complete'
  | 'partial'
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


function Cell({ state, title, value }: { state: TrackingCellState; title: string; value?: number }) {
  return <output title={title} className={cn('mx-auto w-5 h-5 border flex items-center justify-center text-[8px] font-mono', state === 'complete' && 'bg-emerald-600 border-emerald-600 text-white', state === 'executed' && 'bg-primary border-primary text-white', state === 'partial' && 'bg-amber-400/60 border-amber-500/50 text-text-main', state === 'failed' && 'bg-red-500/30 border-red-500/60 text-red-800', state === 'exceeded' && 'bg-red-700 border-red-700 text-white', state === 'absent' && 'bg-red-500/10 border-red-500/30', state === 'unconfirmed' && 'bg-transparent border-border-line/60', state === 'unscheduled' && 'bg-transparent border-border-line/30')}>{value}</output>;
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
        'tracking-month-cell text-[9px] font-mono',
        percentage === 100 ? 'text-emerald-700' : percentage === 0 ? 'text-red-700' : 'text-primary',
      )}
    >
      {percentage === undefined ? '—' : `${percentage}%`}
    </output>
  );
}

function ResultLegend() {
  const entries: [ResultCellState, string][] = [
    ['planned', 'Programado'],
    ['complete', 'Completo'],
    ['partial', 'Parcial'],
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
