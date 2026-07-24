import {
  AppTask,
  HistoryRecord,
  ProgressSnapshot,
  RecurringResolutionSource,
  RecurringResultStatus,
} from '../types';
import {
  DateRange,
  formatDateOnly,
  getCalendarCycleRange,
  getChecklistProgress,
  getNextScheduledDate,
  isTaskScheduledOnDate,
  parseDateOnly,
} from './recurrenceProgress';
import { getHistoryDateKey } from './workTracking';

const MAX_LOOKBACK_DAYS = 3660;

function previousDay(value: string): string {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() - 1);
  return formatDateOnly(date);
}

function taskAnchor(task: AppTask): string {
  return (task.recurrenceAnchorDate || task.fechaAparicion || task.fechaPlanificada || task.createdAt).slice(0, 10);
}

function taskMode(task: AppTask): AppTask['appearanceMode'] {
  if (task.appearanceMode) return task.appearanceMode;
  if (!task.parentId && task.quotaTarget) return 'quota';
  if (task.appearanceWeekdays?.length) return 'weekdays';
  return task.frecuencia || task.appearanceFrequency ? 'interval' : 'once';
}

function occurrenceTask(task: AppTask): AppTask {
  const mode = taskMode(task);
  return {
    ...task,
    appearanceMode: mode,
    appearanceFrequencyUnit: mode === 'weekdays'
      ? 'semanas'
      : task.appearanceFrequencyUnit,
  };
}

export function getHabitOccurrenceRange(
  habit: AppTask,
  tasks: AppTask[],
  at: string | Date = new Date(),
): DateRange {
  const date = parseDateOnly(at);
  const dateKey = formatDateOnly(date);
  const parentRoutine = habit.parentId
    ? tasks.find(task => task.id === habit.parentId && task.type === 'Rutina')
    : undefined;

  if (parentRoutine) {
    return getCalendarCycleRange(
      parentRoutine.routineCycleFrequency || 1,
      parentRoutine.routineCycleUnit || 'semanas',
      date,
    );
  }

  if (taskMode(habit) === 'quota') {
    return getCalendarCycleRange(1, habit.quotaPeriodUnit || 'semanas', date);
  }

  const scheduledHabit = occurrenceTask(habit);
  const anchor = taskAnchor(scheduledHabit);
  let start = dateKey;
  for (let offset = 0; offset <= MAX_LOOKBACK_DAYS; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(candidate.getDate() - offset);
    if (formatDateOnly(candidate) < anchor) break;
    if (isTaskScheduledOnDate(scheduledHabit, candidate)) {
      start = formatDateOnly(candidate);
      break;
    }
  }
  const next = getNextScheduledDate(scheduledHabit, start);
  return { start, end: next === start ? start : previousDay(next) };
}

export function getExpiredHabitOccurrenceRanges(
  habit: AppTask,
  tasks: AppTask[],
  before: string | Date = new Date(),
): DateRange[] {
  if (habit.parentId || taskMode(habit) === 'quota') return [];
  const endLimit = formatDateOnly(parseDateOnly(before));
  const anchor = parseDateOnly(taskAnchor(habit));
  const ranges: DateRange[] = [];
  const seen = new Set<string>();
  const scheduledHabit = occurrenceTask(habit);
  const cursor = new Date(anchor);
  let safety = 0;

  while (formatDateOnly(cursor) <= endLimit && safety < MAX_LOOKBACK_DAYS) {
    if (isTaskScheduledOnDate(scheduledHabit, cursor)) {
      const range = getHabitOccurrenceRange(habit, tasks, cursor);
      const key = `${range.start}:${range.end}`;
      if (range.end <= endLimit && !seen.has(key)) {
        ranges.push(range);
        seen.add(key);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return ranges;
}

export function isSameRecurringClosureSlot(
  task: AppTask,
  tasks: AppTask[],
  first: string | Date,
  second: string | Date,
): boolean {
  const firstKey = formatDateOnly(parseDateOnly(first));
  const secondKey = formatDateOnly(parseDateOnly(second));
  if (task.type === 'Rutina') {
    const firstCycle = getCalendarCycleRange(
      task.routineCycleFrequency || 1,
      task.routineCycleUnit || 'semanas',
      firstKey,
    );
    const secondCycle = getCalendarCycleRange(
      task.routineCycleFrequency || 1,
      task.routineCycleUnit || 'semanas',
      secondKey,
    );
    return firstCycle.start === secondCycle.start;
  }
  if (task.type !== 'Hábito') return firstKey === secondKey;
  if (task.parentId || taskMode(task) === 'quota') return firstKey === secondKey;
  const firstRange = getHabitOccurrenceRange(task, tasks, firstKey);
  const secondRange = getHabitOccurrenceRange(task, tasks, secondKey);
  return firstRange.start === secondRange.start && firstRange.end === secondRange.end;
}

export function getSnapshotResolvedAt(snapshot: ProgressSnapshot): string {
  return snapshot.resolvedAt || snapshot.periodEnd;
}

export function getSnapshotResultStatus(snapshot: ProgressSnapshot): RecurringResultStatus {
  if (snapshot.resultStatus) return snapshot.resultStatus;
  if (snapshot.progressPercent >= 100) return 'complete';
  if (snapshot.progressPercent > 0 || snapshot.wasCompleted) return 'partial';
  return 'missed';
}

export function getManualHabitProgress(habit: AppTask): number {
  return habit.checklist?.length ? getChecklistProgress(habit) : 100;
}

function latestCompletionTime(history: HistoryRecord[], taskId: string, range: DateRange): number {
  return history.reduce((latest, record) => {
    const key = getHistoryDateKey(record);
    if (record.taskId !== taskId || !record.isCompletion || key < range.start || key > range.end) return latest;
    return Math.max(latest, new Date(record.date).getTime());
  }, 0);
}

export function getAutomaticHabitProgress(
  habit: AppTask,
  history: HistoryRecord[],
  range: DateRange,
): number {
  if (habit.checklist?.length) return getChecklistProgress(habit);
  if (!habit.duracion || habit.duracion <= 0) return 0;

  const after = latestCompletionTime(history, habit.id, range);
  const hours = history.reduce((total, record) => {
    const key = getHistoryDateKey(record);
    const timestamp = new Date(record.date).getTime();
    if (
      record.taskId !== habit.id
      || record.isCompletion
      || key < range.start
      || key > range.end
      || timestamp <= after
    ) return total;
    return total + Math.max(0, record.duration || 0);
  }, 0);

  return Math.min(100, Math.round((hours / habit.duracion) * 100));
}

export function createHabitResultSnapshot(
  habit: AppTask,
  range: DateRange,
  progressPercent: number,
  resolvedAt: string,
  source: RecurringResolutionSource,
): Omit<ProgressSnapshot, 'id'> {
  const manual = source === 'manual';
  const resultStatus: RecurringResultStatus = progressPercent >= 100
    ? 'complete'
    : progressPercent > 0 || manual ? 'partial' : 'missed';
  return {
    userId: habit.userId,
    kind: 'habit-period',
    taskId: habit.id,
    taskSnapshotText: habit.text,
    periodStart: range.start,
    periodEnd: range.end,
    resolvedAt,
    progressPercent,
    resultStatus,
    resolutionSource: source,
    wasCompleted: resultStatus !== 'missed',
    createdAt: `${resolvedAt}T23:59:59`,
  };
}

interface HabitResult {
  key: string;
  progressPercent: number;
  status: RecurringResultStatus;
}

function isWithin(key: string, range: DateRange): boolean {
  return key >= range.start && key <= range.end;
}

export function getHabitResultsInRange(
  habit: AppTask,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  range: DateRange,
): HabitResult[] {
  const results = new Map<string, HabitResult>();

  snapshots
    .filter(snapshot => snapshot.kind === 'habit-period'
      && snapshot.taskId === habit.id
      && isWithin(getSnapshotResolvedAt(snapshot), range))
    .forEach(snapshot => {
      const key = getSnapshotResolvedAt(snapshot);
      results.set(key, {
        key,
        progressPercent: Math.max(0, Math.min(100, snapshot.progressPercent)),
        status: getSnapshotResultStatus(snapshot),
      });
    });

  history
    .filter(record => record.taskId === habit.id
      && record.isCompletion
      && isWithin(getHistoryDateKey(record), range))
    .forEach(record => {
      const key = getHistoryDateKey(record);
      if (results.has(key)) return;
      const progressPercent = Math.max(0, Math.min(100, record.completionPercent ?? 100));
      results.set(key, {
        key,
        progressPercent,
        status: progressPercent >= 100 ? 'complete' : 'partial',
      });
    });

  return [...results.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function getRoutineHabitContribution(
  routine: AppTask,
  habit: AppTask,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): number {
  const cycle = getCalendarCycleRange(
    routine.routineCycleFrequency || 1,
    routine.routineCycleUnit || 'semanas',
    at,
  );
  const target = Math.max(1, habit.objetivoPorCiclo || 1);
  const score = getHabitResultsInRange(habit, history, snapshots, cycle)
    .slice(0, target)
    .reduce((total, result) => total + result.progressPercent / 100, 0);
  return Math.round((Math.min(target, score) / target) * 100);
}

export function getRoutineCycleProgress(
  routine: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): number {
  const habits = tasks.filter(task => task.type === 'Hábito' && task.parentId === routine.id);
  if (!habits.length) return 0;
  const total = habits.reduce(
    (sum, habit) => sum + getRoutineHabitContribution(routine, habit, history, snapshots, at),
    0,
  );
  return Math.round(total / habits.length);
}

export function isRoutineReadyToClose(
  routine: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): boolean {
  const cycle = getCalendarCycleRange(
    routine.routineCycleFrequency || 1,
    routine.routineCycleUnit || 'semanas',
    at,
  );
  const habits = tasks.filter(task => task.type === 'Hábito' && task.parentId === routine.id);
  return habits.length > 0 && habits.every(habit => {
    const target = Math.max(1, habit.objetivoPorCiclo || 1);
    return getHabitResultsInRange(habit, history, snapshots, cycle)
      .filter(result => result.status !== 'missed').length >= target;
  });
}

export function hasPositiveActivityOnDate(
  taskIds: Iterable<string>,
  history: HistoryRecord[],
  date: string | Date,
): boolean {
  const ids = new Set(taskIds);
  const key = formatDateOnly(parseDateOnly(date));
  return history.some(record => ids.has(record.taskId)
    && getHistoryDateKey(record) === key
    && (record.duration || 0) > 0);
}
