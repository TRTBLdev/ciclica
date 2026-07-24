import { AppTask, HistoryRecord, ProgressSnapshot, RecurrenceUnit } from '../types';
import { DateRange, formatDateOnly, getCalendarCycleRange, getIsoWeekday, parseDateOnly } from './recurrenceProgress';
import { getProjectForTask } from './workTracking';
import {
  getHabitResultsInRange,
  getRoutineCycleProgress as getResolvedRoutineCycleProgress,
} from './occurrenceResults';

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(value?: string | Date): string | undefined {
  if (!value) return undefined;
  if (typeof value !== 'string') return formatDateOnly(value);
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
}

export function getAppearanceDate(task: AppTask): string | undefined {
  const legacyAppearance = task.type === 'Proyecto' ? undefined : task.fechaPlanificada;
  return toDateKey(task.fechaAparicion || legacyAppearance || task.recurrenceAnchorDate);
}

export function getDeadlineDate(task: AppTask): string | undefined {
  return toDateKey(task.fechaLimite || (task.type === 'Proyecto' ? task.fechaPlanificada : undefined));
}

export function getAppearanceFrequency(task: AppTask): number {
  return Math.max(1, task.appearanceFrequency || task.frecuencia || 1);
}

export function getAppearanceUnit(task: AppTask): RecurrenceUnit {
  return task.appearanceFrequencyUnit || task.frecuenciaUnidad || 'días';
}

export function getAppearanceMode(task: AppTask): AppTask['appearanceMode'] {
  if (task.type === 'Tarea' && task.appearanceMode === 'once') return 'persistent';
  if (task.appearanceMode) return task.appearanceMode;
  if (task.type === 'Hábito' && !task.parentId && task.quotaTarget) return 'quota';
  if (task.appearanceWeekdays?.length) return 'weekdays';
  if (task.type === 'Rutina' || task.type === 'Hábito' || task.frecuencia || task.appearanceFrequency) return 'interval';
  return getAppearanceDate(task) ? (task.type === 'Tarea' ? 'persistent' : 'once') : undefined;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isAppearanceScheduledOnDate(task: AppTask, at: string | Date): boolean {
  const mode = getAppearanceMode(task);
  const anchorValue = getAppearanceDate(task);
  if (!mode || mode === 'quota' || !anchorValue) return false;

  const date = parseDateOnly(at);
  const anchor = parseDateOnly(anchorValue);
  if (date < anchor) return false;
  if (mode === 'persistent') return true;
  if (mode === 'once') return formatDateOnly(date) === formatDateOnly(anchor);

  const frequency = getAppearanceFrequency(task);
  const unit = getAppearanceUnit(task);
  if (mode === 'weekdays' || unit === 'semanas') {
    const anchorMonday = new Date(anchor);
    anchorMonday.setDate(anchorMonday.getDate() - (getIsoWeekday(anchorMonday) - 1));
    const dateMonday = new Date(date);
    dateMonday.setDate(dateMonday.getDate() - (getIsoWeekday(dateMonday) - 1));
    const weeks = Math.round((dateMonday.getTime() - anchorMonday.getTime()) / (7 * DAY_MS));
    const weekdays = task.appearanceWeekdays?.length ? task.appearanceWeekdays : [getIsoWeekday(anchor)];
    return weeks >= 0 && weeks % frequency === 0 && weekdays.includes(getIsoWeekday(date));
  }

  if (unit === 'meses') {
    const months = (date.getFullYear() - anchor.getFullYear()) * 12 + date.getMonth() - anchor.getMonth();
    const day = Math.min(anchor.getDate(), lastDayOfMonth(date.getFullYear(), date.getMonth()));
    return months >= 0 && months % frequency === 0 && date.getDate() === day;
  }

  const days = Math.round((date.getTime() - anchor.getTime()) / DAY_MS);
  return days >= 0 && days % frequency === 0;
}

export function getQuotaRange(task: AppTask, at: string | Date = new Date()): DateRange {
  return getCalendarCycleRange(1, task.quotaPeriodUnit || 'semanas', at);
}

export function isVerifiedHabitCompletion(task: AppTask, record: HistoryRecord): boolean {
  return record.taskId === task.id && record.isCompletion === true;
}

export function getStandaloneQuotaCount(task: AppTask, history: HistoryRecord[], at: string | Date = new Date()): number {
  const range = getQuotaRange(task, at);
  const days = new Set(
    history.filter(record => isVerifiedHabitCompletion(task, record))
      .map(record => toDateKey(record.date))
      .filter((date): date is string => !!date && date >= range.start && date <= range.end),
  );
  return days.size;
}

export function isItemAppearingOnDate(
  task: AppTask,
  history: HistoryRecord[],
  at: string | Date = new Date(),
): boolean {
  if (task.completed || task.type === 'Pulso') return false;
  if (task.type === 'Hábito' && task.parentId) return false;
  const dateKey = formatDateOnly(parseDateOnly(at));
  if (task.type === 'Hábito' && history.some(record => isVerifiedHabitCompletion(task, record) && toDateKey(record.date) === dateKey)) return false;
  if (getAppearanceMode(task) === 'quota') {
    const start = getAppearanceDate(task);
    if (start && dateKey < start) return false;
    const target = Math.max(1, task.quotaTarget || 1);
    return getStandaloneQuotaCount(task, history, at) < target
      && !history.some(record => isVerifiedHabitCompletion(task, record) && toDateKey(record.date) === dateKey);
  }
  return isAppearanceScheduledOnDate(task, at);
}

export function getNextAppearanceDate(task: AppTask, from: string | Date = new Date()): string | undefined {
  const mode = getAppearanceMode(task);
  if (!mode) return undefined;
  const cursor = parseDateOnly(from);
  if (mode === 'quota') {
    const range = getQuotaRange(task, cursor);
    return formatDateOnly(cursor) <= range.end ? formatDateOnly(cursor) : range.start;
  }
  for (let offset = 0; offset <= 3660; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(candidate.getDate() + offset);
    if (isAppearanceScheduledOnDate(task, candidate)) return formatDateOnly(candidate);
  }
  return undefined;
}

export function getRoutineCycleRangeForTask(routine: AppTask, at: string | Date = new Date()): DateRange {
  return getCalendarCycleRange(routine.routineCycleFrequency || 1, routine.routineCycleUnit || 'semanas', at);
}

function recordBelongsToCycle(record: HistoryRecord, routineId: string, range: DateRange): boolean {
  if (record.routineId && record.routineId !== routineId) return false;
  if (record.routineCycleStart) return record.routineCycleStart === range.start;
  const date = toDateKey(record.date);
  return !!date && date >= range.start && date <= range.end;
}

export function getChildHabitCycleCount(
  routine: AppTask,
  habit: AppTask,
  history: HistoryRecord[],
  at: string | Date = new Date(),
  snapshots: ProgressSnapshot[] = [],
): number {
  const range = getRoutineCycleRangeForTask(routine, at);
  if (snapshots.length) {
    return getHabitResultsInRange(habit, history, snapshots, range)
      .filter(result => result.status !== 'missed').length;
  }
  return new Set(
    history.filter(record => isVerifiedHabitCompletion(habit, record))
      .filter(record => recordBelongsToCycle(record, routine.id, range))
      .map(record => record.routineAppearanceDate || toDateKey(record.date))
      .filter((date): date is string => !!date),
  ).size;
}

export function wasChildHabitCompletedInAppearance(
  routine: AppTask,
  habit: AppTask,
  history: HistoryRecord[],
  appearanceDate: string | Date,
): boolean {
  const key = formatDateOnly(parseDateOnly(appearanceDate));
  return history.filter(record => isVerifiedHabitCompletion(habit, record)).some(record => {
    if (record.routineId && record.routineId !== routine.id) return false;
    return (record.routineAppearanceDate || toDateKey(record.date)) === key;
  });
}

export function canTrackTask(
  task: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): boolean {
  if (task.completed || task.type === 'Pulso' || task.type === 'Rutina' || task.type === 'Proyecto') return false;
  if (task.type !== 'Hábito' || !task.parentId) return true;
  const routine = tasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina');
  if (!routine) return false;
  if (wasChildHabitCompletedInAppearance(routine, task, history, at)) return false;
  return getChildHabitCycleCount(routine, task, history, at) < Math.max(1, task.objetivoPorCiclo || 1);
}

export function getRoutineCycleProgressFromHistory(
  routine: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
  snapshots: ProgressSnapshot[] = [],
): number {
  if (snapshots.length) {
    return getResolvedRoutineCycleProgress(routine, tasks, history, snapshots, at);
  }
  const habits = tasks.filter(task => task.type === 'Hábito' && task.parentId === routine.id);
  if (!habits.length) return 0;
  const total = habits.reduce((sum, habit) => {
    const target = Math.max(1, habit.objetivoPorCiclo || 1);
    const range = getRoutineCycleRangeForTask(routine, at);
    const scores = history
      .filter(record => isVerifiedHabitCompletion(habit, record))
      .filter(record => recordBelongsToCycle(record, routine.id, range))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, target)
      .reduce((score, record) => score + Math.max(0, Math.min(100, record.completionPercent ?? 100)) / 100, 0);
    return sum + Math.min(1, scores / target);
  }, 0);
  return Math.round((total / habits.length) * 100);
}

export function getRoutineOpportunityDates(routine: AppTask, at: string | Date = new Date()): string[] {
  const range = getRoutineCycleRangeForTask(routine, at);
  const dates: string[] = [];
  const cursor = parseDateOnly(range.start);
  const end = parseDateOnly(range.end);
  while (cursor <= end) {
    if (isAppearanceScheduledOnDate(routine, cursor)) dates.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getMinimumRoutineOpportunityCount(
  routine: AppTask,
  at: string | Date = new Date(),
  cyclesToCheck = 12,
): number {
  const anchor = getAppearanceDate(routine);
  let cursor = parseDateOnly(at);
  if (anchor && cursor < parseDateOnly(anchor)) cursor = parseDateOnly(anchor);
  const capacities: number[] = [];
  for (let index = 0; index < Math.max(1, cyclesToCheck); index += 1) {
    const range = getRoutineCycleRangeForTask(routine, cursor);
    capacities.push(getRoutineOpportunityDates(routine, cursor).length);
    cursor = parseDateOnly(range.end);
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.min(...capacities);
}

export function isRoutineCycleClosed(
  routine: AppTask,
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): boolean {
  const range = getRoutineCycleRangeForTask(routine, at);
  return snapshots.some(snapshot => snapshot.kind === 'routine-cycle'
    && snapshot.taskId === routine.id
    && snapshot.periodStart === range.start
    && snapshot.periodEnd === range.end);
}

export type TodayPlacement = 'timeline' | 'flexible' | 'backlog' | null;

export function getTodayPlacement(
  task: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): TodayPlacement {
  if (task.completed || task.type === 'Pulso') return null;
  const parentProject = task.parentId ? getProjectForTask(task.parentId, tasks) : null;
  if (parentProject) return null;
  if (task.type === 'Proyecto' && !getAppearanceMode(task)) return 'backlog';
  const appears = task.type === 'Rutina'
    ? isAppearanceScheduledOnDate(task, at) && !isRoutineCycleClosed(task, snapshots, at)
    : isItemAppearingOnDate(task, history, at);
  if (appears) return task.hora ? 'timeline' : 'flexible';
  return task.type === 'Tarea' ? 'backlog' : null;
}

export function shouldShowHistoryRecordInTimeline(_record: HistoryRecord, _tasks: AppTask[]): boolean {
  return true;
}

export interface ProjectDateSummary {
  startDate?: string;
  lastActivityDate?: string;
  nextTask?: AppTask;
  nextTaskDate?: string;
  deadline?: string;
}

export interface TaskDateSummary {
  startDate?: string;
  lastActivityDate?: string;
}

export type TaskTemporalTone = 'neutral' | 'amber' | 'orange' | 'red';

export interface TaskTemporalIndicator {
  kind: 'activity' | 'deadline' | 'start' | 'unstarted';
  text: string;
  title: string;
  tone: TaskTemporalTone;
}

export function getTaskDateSummary(task: AppTask, history: HistoryRecord[]): TaskDateSummary {
  const records = history
    .filter(record => record.taskId === task.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return {
    startDate: records.length ? toDateKey(records[0].date) : undefined,
    lastActivityDate: records.length ? toDateKey(records.at(-1)!.date) : undefined,
  };
}

function calendarDayDifference(value: string | Date, at: string | Date): number {
  return Math.round((parseDateOnly(value).getTime() - parseDateOnly(at).getTime()) / DAY_MS);
}

function getOverdueDaysAfterExpectedAppearance(
  task: AppTask,
  lastActivity: string | Date,
  history: HistoryRecord[],
  at: string | Date,
): number {
  const mode = getAppearanceMode(task);
  if (!mode || task.completed) return 0;
  const today = parseDateOnly(at);
  let expected: string | undefined;

  if (mode === 'persistent') {
    const anchor = getAppearanceDate(task);
    if (anchor && parseDateOnly(anchor) > today) return 0;
    const nextDay = parseDateOnly(lastActivity);
    nextDay.setDate(nextDay.getDate() + 1);
    expected = formatDateOnly(nextDay);
  } else if (mode === 'quota') {
    const target = Math.max(1, task.quotaTarget || 1);
    if (getStandaloneQuotaCount(task, history, at) >= target) return 0;
    const range = getQuotaRange(task, at);
    const nextDay = parseDateOnly(lastActivity);
    nextDay.setDate(nextDay.getDate() + 1);
    expected = formatDateOnly(nextDay < parseDateOnly(range.start) ? parseDateOnly(range.start) : nextDay);
  } else {
    const nextDay = parseDateOnly(lastActivity);
    nextDay.setDate(nextDay.getDate() + 1);
    expected = getNextAppearanceDate(task, nextDay);
  }

  return expected ? Math.max(0, -calendarDayDifference(expected, at)) : 0;
}

function activityToneFromOverdueDays(overdueDays: number): TaskTemporalTone {
  return overdueDays >= 3 ? 'red' : overdueDays === 2 ? 'orange' : overdueDays === 1 ? 'amber' : 'neutral';
}

export function getMissedTaskAppearanceCount(
  task: AppTask,
  lastActivity: string | Date,
  at: string | Date = new Date(),
): number {
  if (task.type !== 'Tarea') return 0;
  return Math.min(3, getOverdueDaysAfterExpectedAppearance(task, lastActivity, [], at));
}

function elapsedText(value: string, at: string | Date): string {
  const days = Math.max(0, -calendarDayDifference(value, at));
  return days === 0 ? 'hoy' : `${days}d`;
}

function deadlineText(value: string, at: string | Date): string {
  const days = calendarDayDifference(value, at);
  if (days === 0) return 'hoy';
  if (days < 0) return `venc. ${Math.abs(days)}d`;
  return `${days}d`;
}

function detailedDeadlineText(value: string, at: string | Date): string {
  const days = calendarDayDifference(value, at);
  const absolute = parseDateOnly(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
  if (days === 0) return `${absolute} · hoy`;
  if (days < 0) return `${absolute} · venció hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`;
  return `${absolute} · faltan ${days} ${days === 1 ? 'día' : 'días'}`;
}

export function getTaskTemporalIndicators(
  task: AppTask,
  history: HistoryRecord[],
  at: string | Date = new Date(),
): TaskTemporalIndicator[] {
  if (task.type !== 'Tarea') return [];
  const summary = getTaskDateSummary(task, history);
  const indicators: TaskTemporalIndicator[] = [];

  if (summary.lastActivityDate) {
    const overdueDays = getOverdueDaysAfterExpectedAppearance(task, summary.lastActivityDate, history, at);
    indicators.push({
      kind: 'activity',
      text: `Últ. ${elapsedText(summary.lastActivityDate, at)}`,
      title: `Última actividad: ${formatRelativeCalendarDate(summary.lastActivityDate, at)}`,
      tone: activityToneFromOverdueDays(overdueDays),
    });
  }

  const deadline = getDeadlineDate(task);
  if (deadline) {
    const tone = getCompactDateTone(deadline, at);
    indicators.push({
      kind: 'deadline',
      text: `Lím. ${deadlineText(deadline, at)}`,
      title: `Fecha límite: ${detailedDeadlineText(deadline, at)}`,
      tone: tone === 'soon' ? 'amber' : tone === 'overdue' ? 'red' : 'neutral',
    });
  }

  if (summary.startDate) {
    indicators.push({
      kind: 'start',
      text: `Inicio ${elapsedText(summary.startDate, at)}`,
      title: `Inicio: ${formatRelativeCalendarDate(summary.startDate, at)}`,
      tone: 'neutral',
    });
  }

  return indicators;
}

function getOwnTemporalIndicators(
  task: AppTask,
  history: HistoryRecord[],
  tone: TaskTemporalTone,
  at: string | Date,
  activityDetail?: string,
  includeStart = false,
): TaskTemporalIndicator[] {
  const summary = getTaskDateSummary(task, history);
  const indicators: TaskTemporalIndicator[] = [];
  if (summary.lastActivityDate) {
    indicators.push({
      kind: 'activity',
      text: `Últ. ${elapsedText(summary.lastActivityDate, at)}`,
      title: `Última actividad: ${formatRelativeCalendarDate(summary.lastActivityDate, at)}${activityDetail ? `. ${activityDetail}` : ''}`,
      tone,
    });
  }
  if (includeStart && summary.startDate) {
    indicators.push({
      kind: 'start',
      text: `Inicio ${elapsedText(summary.startDate, at)}`,
      title: `Inicio: ${formatRelativeCalendarDate(summary.startDate, at)}`,
      tone: 'neutral',
    });
  }
  return indicators;
}

export function getHabitTemporalIndicators(
  habit: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): TaskTemporalIndicator[] {
  if (habit.type !== 'Hábito') return [];
  const parentRoutine = habit.parentId
    ? tasks.find(task => task.id === habit.parentId && task.type === 'Rutina')
    : undefined;

  if (parentRoutine) {
    return getOwnTemporalIndicators(habit, history, 'neutral', at);
  }

  const summary = getTaskDateSummary(habit, history);
  if (!summary.lastActivityDate) return [];
  const overdueDays = getOverdueDaysAfterExpectedAppearance(habit, summary.lastActivityDate, history, at);
  return getOwnTemporalIndicators(habit, history, activityToneFromOverdueDays(overdueDays), at);
}

export interface ChildHabitQuotaStatus {
  tone: TaskTemporalTone;
  title: string;
}

export function getChildHabitQuotaStatus(
  routine: AppTask,
  habit: AppTask,
  history: HistoryRecord[],
  at: string | Date = new Date(),
): ChildHabitQuotaStatus {
  const completed = getChildHabitCycleCount(routine, habit, history, at);
  const target = Math.max(1, habit.objetivoPorCiclo || 1);
  const required = Math.max(0, target - completed);
  const today = formatDateOnly(parseDateOnly(at));
  const completedToday = wasChildHabitCompletedInAppearance(routine, habit, history, at);
  const remainingOpportunities = getRoutineOpportunityDates(routine, at)
    .filter(date => date > today || (date === today && !completedToday))
    .length;
  const tone: TaskTemporalTone = required === 0 || remainingOpportunities > required
    ? 'neutral'
    : remainingOpportunities === required ? 'amber' : 'red';
  return {
    tone,
    title: `Faltan ${required} ejecuciones y quedan ${remainingOpportunities} oportunidades en el ciclo`,
  };
}

export function getRoutineTemporalIndicators(
  routine: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): TaskTemporalIndicator[] {
  if (routine.type !== 'Rutina') return [];
  const childIds = new Set(tasks.filter(task => task.parentId === routine.id).map(task => task.id));
  const relevantHistory = history
    .filter(record => record.taskId === routine.id || childIds.has(record.taskId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (!relevantHistory.length) return [];
  const lastActivityDate = toDateKey(relevantHistory.at(-1)!.date)!;
  const overdueDays = getOverdueDaysAfterExpectedAppearance(routine, lastActivityDate, history, at);
  return [
    {
      kind: 'activity',
      text: `Últ. ${elapsedText(lastActivityDate, at)}`,
      title: `Última actividad de la rutina o sus hábitos: ${formatRelativeCalendarDate(lastActivityDate, at)}`,
      tone: activityToneFromOverdueDays(overdueDays),
    },
  ];
}

export function getItemTemporalIndicators(
  item: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): TaskTemporalIndicator[] {
  let indicators: TaskTemporalIndicator[] = [];
  let hasHistory = history.some(record => record.taskId === item.id);

  if (item.type === 'Tarea') indicators = getTaskTemporalIndicators(item, history, at);
  else if (item.type === 'Hábito') indicators = getHabitTemporalIndicators(item, tasks, history, at);
  else if (item.type === 'Rutina') {
    indicators = getRoutineTemporalIndicators(item, tasks, history, at);
    const childIds = new Set(tasks.filter(task => task.parentId === item.id).map(task => task.id));
    hasHistory = history.some(record => record.taskId === item.id || childIds.has(record.taskId));
  } else if (item.type === 'Proyecto') {
    const summary = getProjectDateSummary(item, tasks, history, at);
    hasHistory = !!summary.startDate;
    if (summary.startDate) {
      indicators.push({
        kind: 'start',
        text: `Inicio ${elapsedText(summary.startDate, at)}`,
        title: `Inicio: ${formatRelativeCalendarDate(summary.startDate, at)}`,
        tone: 'neutral',
      });
    }
    if (summary.deadline) {
      const tone = getCompactDateTone(summary.deadline, at);
      indicators.push({
        kind: 'deadline',
        text: `Lím. ${deadlineText(summary.deadline, at)}`,
        title: `Fecha límite: ${detailedDeadlineText(summary.deadline, at)}`,
        tone: tone === 'soon' ? 'amber' : tone === 'overdue' ? 'red' : 'neutral',
      });
    }
  }

  if (!item.completed && !hasHistory) {
    indicators.unshift({
      kind: 'unstarted',
      text: item.type === 'Pulso' ? 'Sin registros' : 'Sin iniciar',
      title: item.type === 'Pulso' ? 'Este Pulso todavía no tiene registros' : 'Este elemento todavía no tiene registros de actividad',
      tone: 'neutral',
    });
  }
  return indicators;
}

export function getProjectDateSummary(
  project: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): ProjectDateSummary {
  const descendantIds = new Set<string>();
  let frontier = [project.id];
  while (frontier.length) {
    const parents = new Set(frontier);
    const children = tasks.filter(task => task.parentId && parents.has(task.parentId));
    frontier = children.map(task => task.id).filter(id => !descendantIds.has(id));
    frontier.forEach(id => descendantIds.add(id));
  }
  const records = history
    .filter(record => (
      (record.taskId === project.id || descendantIds.has(record.taskId))
      && (record.duration || 0) > 0
    ))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const candidates = tasks
    .filter(task => descendantIds.has(task.id) && task.type === 'Tarea' && !task.completed)
    .map(task => ({ task, date: getNextAppearanceDate(task, at) }))
    .filter((entry): entry is { task: AppTask; date: string } => !!entry.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    startDate: records.length ? toDateKey(records[0].date) : undefined,
    lastActivityDate: records.length ? toDateKey(records.at(-1)!.date) : undefined,
    nextTask: candidates[0]?.task,
    nextTaskDate: candidates[0]?.date,
    deadline: getDeadlineDate(project),
  };
}

export function formatRelativeCalendarDate(value?: string, at: string | Date = new Date()): string {
  if (!value) return 'Sin fecha';
  const date = parseDateOnly(value);
  const today = parseDateOnly(at);
  const difference = Math.round((date.getTime() - today.getTime()) / DAY_MS);
  const absolute = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  if (difference === 0) return `${absolute} · hoy`;
  if (difference === 1) return `${absolute} · mañana`;
  if (difference === -1) return `${absolute} · ayer`;
  return `${absolute} · ${difference > 0 ? `en ${difference} días` : `hace ${Math.abs(difference)} días`}`;
}

export type CompactDateTone = 'neutral' | 'soon' | 'overdue';

export function getCompactDateTone(value?: string, at: string | Date = new Date(), historical = false): CompactDateTone {
  if (!value || historical) return 'neutral';
  const difference = Math.round((parseDateOnly(value).getTime() - parseDateOnly(at).getTime()) / DAY_MS);
  if (difference < 0) return 'overdue';
  return difference <= 3 ? 'soon' : 'neutral';
}

export function formatCompactCalendarDate(value?: string, at: string | Date = new Date(), historical = false): string {
  if (!value) return 'Sin fecha';
  const date = parseDateOnly(value);
  const difference = Math.round((date.getTime() - parseDateOnly(at).getTime()) / DAY_MS);
  const absolute = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
  if (historical) return absolute;
  if (difference === 0) return `${absolute} · hoy`;
  if (difference < 0) return `${absolute} · venc. ${Math.abs(difference)}d`;
  return `${absolute} · ${difference}d`;
}

export function limitCardMetadata<T>(items: Array<T | null | undefined | false>, limit = 3): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined && item !== false).slice(0, limit);
}
