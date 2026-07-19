import { AppTask, ProgressSnapshot, RecurrenceUnit } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  start: string;
  end: string;
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getIsoWeekday(value: string | Date): number {
  const day = parseDateOnly(value).getDay();
  return day === 0 ? 7 : day;
}

export function getNominalDays(frequency = 1, unit: RecurrenceUnit = 'días'): number {
  const safeFrequency = Math.max(1, frequency || 1);
  if (unit === 'semanas') return safeFrequency * 7;
  if (unit === 'meses') return safeFrequency * 30;
  return safeFrequency;
}

export function getCalendarCycleRange(
  frequency = 1,
  unit: RecurrenceUnit = 'días',
  at: string | Date = new Date(),
): DateRange {
  const date = parseDateOnly(at);
  const safeFrequency = Math.max(1, frequency || 1);
  let start: Date;
  let end: Date;

  if (unit === 'meses') {
    const absoluteMonth = date.getFullYear() * 12 + date.getMonth();
    const startAbsoluteMonth = Math.floor(absoluteMonth / safeFrequency) * safeFrequency;
    const startYear = Math.floor(startAbsoluteMonth / 12);
    const startMonth = startAbsoluteMonth % 12;
    start = new Date(startYear, startMonth, 1);
    end = new Date(startYear, startMonth + safeFrequency, 0);
  } else if (unit === 'semanas') {
    const epochMonday = new Date(1970, 0, 5);
    const monday = new Date(date);
    monday.setDate(monday.getDate() - (getIsoWeekday(monday) - 1));
    const weeksSinceEpoch = Math.floor((monday.getTime() - epochMonday.getTime()) / (7 * DAY_MS));
    const blockStart = weeksSinceEpoch - (((weeksSinceEpoch % safeFrequency) + safeFrequency) % safeFrequency);
    start = new Date(epochMonday);
    start.setDate(start.getDate() + blockStart * 7);
    end = new Date(start);
    end.setDate(end.getDate() + safeFrequency * 7 - 1);
  } else {
    const epoch = new Date(1970, 0, 1);
    const daysSinceEpoch = Math.floor((date.getTime() - epoch.getTime()) / DAY_MS);
    const blockStart = daysSinceEpoch - (((daysSinceEpoch % safeFrequency) + safeFrequency) % safeFrequency);
    start = new Date(epoch);
    start.setDate(start.getDate() + blockStart);
    end = new Date(start);
    end.setDate(end.getDate() + safeFrequency - 1);
  }

  return { start: formatDateOnly(start), end: formatDateOnly(end) };
}

export function isRoutineConfigured(routine: AppTask): boolean {
  return routine.type === 'Rutina'
    && !!routine.routineCycleFrequency
    && !!routine.routineCycleUnit;
}

export function getChecklistProgress(task: AppTask): number {
  const checklist = task.checklist || [];
  if (checklist.length === 0) return 0;
  return Math.round((checklist.filter(item => item.done).length / checklist.length) * 100);
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getTaskAnchor(task: AppTask): Date {
  return parseDateOnly(task.recurrenceAnchorDate || task.fechaPlanificada || task.createdAt);
}

export function isTaskScheduledOnDate(task: AppTask, at: string | Date): boolean {
  const date = parseDateOnly(at);
  const anchor = getTaskAnchor(task);
  const frequency = Math.max(1, task.frecuencia || 1);
  const unit = task.frecuenciaUnidad || 'días';
  if (date < anchor) return false;

  if (unit === 'meses') {
    const months = (date.getFullYear() - anchor.getFullYear()) * 12 + date.getMonth() - anchor.getMonth();
    const targetDay = Math.min(anchor.getDate(), lastDayOfMonth(date.getFullYear(), date.getMonth()));
    return months >= 0 && months % frequency === 0 && date.getDate() === targetDay;
  }

  if (unit === 'semanas') {
    const anchorMonday = new Date(anchor);
    anchorMonday.setDate(anchorMonday.getDate() - (getIsoWeekday(anchorMonday) - 1));
    const dateMonday = new Date(date);
    dateMonday.setDate(dateMonday.getDate() - (getIsoWeekday(dateMonday) - 1));
    const weekDifference = Math.round((dateMonday.getTime() - anchorMonday.getTime()) / (7 * DAY_MS));
    const weekdays = task.appearanceWeekdays?.length
      ? task.appearanceWeekdays
      : [getIsoWeekday(anchor)];
    return weekDifference >= 0
      && weekDifference % frequency === 0
      && weekdays.includes(getIsoWeekday(date));
  }

  const dayDifference = Math.round((date.getTime() - anchor.getTime()) / DAY_MS);
  return dayDifference >= 0 && dayDifference % frequency === 0;
}

export function getNextScheduledDate(task: AppTask, after: string | Date): string {
  const cursor = parseDateOnly(after);
  for (let i = 1; i <= 3660; i += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(candidate.getDate() + i);
    if (isTaskScheduledOnDate(task, candidate)) return formatDateOnly(candidate);
  }
  return formatDateOnly(cursor);
}

export function getRequiredHabitOccurrences(routine: AppTask, habit: AppTask): number {
  const cycleDays = getNominalDays(routine.routineCycleFrequency, routine.routineCycleUnit);
  const habitDays = getNominalDays(habit.frecuencia, habit.frecuenciaUnidad);
  return Math.max(1, Math.round(cycleDays / habitDays));
}

function isWithin(value: string, range: DateRange): boolean {
  const date = parseDateOnly(value).getTime();
  return date >= parseDateOnly(range.start).getTime() && date <= parseDateOnly(range.end).getTime();
}

export function getHabitCycleContribution(
  routine: AppTask,
  habit: AppTask,
  snapshots: ProgressSnapshot[],
  cycle: DateRange,
  today: string | Date = new Date(),
): number {
  const required = getRequiredHabitOccurrences(routine, habit);
  const completedValue = snapshots
    .filter(snapshot => snapshot.kind === 'habit-period'
      && snapshot.taskId === habit.id
      && isWithin(snapshot.periodEnd, cycle))
    .reduce((sum, snapshot) => sum + snapshot.progressPercent / 100, 0);

  const plannedDate = habit.fechaPlanificada ? parseDateOnly(habit.fechaPlanificada) : null;
  const currentIsInCycle = plannedDate
    && plannedDate <= parseDateOnly(today)
    && plannedDate <= parseDateOnly(cycle.end);
  const currentValue = currentIsInCycle ? getChecklistProgress(habit) / 100 : 0;
  return Math.min(100, Math.round(((completedValue + currentValue) / required) * 100));
}

export function getRoutineCycleProgress(
  routine: AppTask,
  tasks: AppTask[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): number {
  if (!isRoutineConfigured(routine)) return 0;
  const habits = tasks.filter(task => task.type === 'Hábito' && task.parentId === routine.id);
  if (habits.length === 0) return 0;
  const cycle = getCalendarCycleRange(routine.routineCycleFrequency, routine.routineCycleUnit, at);
  const total = habits.reduce(
    (sum, habit) => sum + getHabitCycleContribution(routine, habit, snapshots, cycle, at),
    0,
  );
  return Math.round(total / habits.length);
}

export function getRoutineAppearanceTarget(routine: AppTask, at: string | Date = new Date()): number {
  if (!isRoutineConfigured(routine)) return 0;
  const cycle = getCalendarCycleRange(routine.routineCycleFrequency, routine.routineCycleUnit, at);
  const appearancesPerInterval = routine.frecuenciaUnidad === 'semanas'
    ? Math.max(1, routine.appearanceWeekdays?.length || 1)
    : 1;
  const plannedAppearances = Math.max(
    1,
    Math.round(
      getNominalDays(routine.routineCycleFrequency, routine.routineCycleUnit)
        / getNominalDays(routine.frecuencia, routine.frecuenciaUnidad),
    ) * appearancesPerInterval,
  );
  let appearanceIndex = 0;
  const cursor = parseDateOnly(cycle.start);
  const end = parseDateOnly(at);
  while (cursor <= end) {
    if (isTaskScheduledOnDate(routine, cursor)) appearanceIndex += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.min(100, Math.round((Math.max(1, appearanceIndex) / plannedAppearances) * 100));
}

export function isHabitCompatibleWithRoutine(routine: AppTask, habit: Pick<AppTask, 'frecuencia' | 'frecuenciaUnidad'>): boolean {
  if (!isRoutineConfigured(routine)) return false;
  return getNominalDays(habit.frecuencia, habit.frecuenciaUnidad)
    <= getNominalDays(routine.routineCycleFrequency, routine.routineCycleUnit);
}
