import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { formatDateOnly, getNextScheduledDate, isTaskScheduledOnDate, parseDateOnly } from './recurrenceProgress';

export type TrackingCellState = 'complete' | 'partial' | 'exceeded' | 'failed' | 'absent' | 'unconfirmed' | 'unscheduled';

export interface TaskTrackingSummary {
  compliancePercent: number;
  dueCount: number;
  completedScore: number;
  lastActivityDate?: string;
  pendingDate?: string;
  nextDate: string;
}

export function normalizePulsePolarity(value: unknown): 'Reforzar' | 'Abandonar' {
  return typeof value === 'string' && value.toLowerCase() === 'abandonar' ? 'Abandonar' : 'Reforzar';
}

function startOfDay(value: string | Date): Date {
  const date = parseDateOnly(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getRecentDates(days: number, at: string | Date = new Date()): Date[] {
  const today = startOfDay(at);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return date;
  });
}

export function isPulseSafeDayConfirmation(record: HistoryRecord): boolean {
  return record.pulseOutcome === 'safe-day';
}

export function getPulseOccurrenceCount(history: HistoryRecord[], taskId: string, date: string | Date): number {
  const key = formatDateOnly(startOfDay(date));
  return history.filter(record => record.taskId === taskId
    && !isPulseSafeDayConfirmation(record)
    && formatDateOnly(new Date(record.date)) === key).length;
}

export function hasPulseSafeDayConfirmation(history: HistoryRecord[], taskId: string, date: string | Date): boolean {
  const key = formatDateOnly(startOfDay(date));
  return history.some(record => record.taskId === taskId
    && isPulseSafeDayConfirmation(record)
    && formatDateOnly(new Date(record.date)) === key);
}

export function getPulseState(pulse: AppTask, count: number, safeDayConfirmed = false): TrackingCellState {
  const target = Math.max(1, pulse.targetCount || pulse.objetivo || 1);
  const isAbandoning = normalizePulsePolarity(pulse.polaridad) === 'Abandonar';

  if (isAbandoning) {
    if (count === 0) return safeDayConfirmed ? 'complete' : 'unconfirmed';
    if (count < target) return 'partial';
    if (count === target) return 'failed';
    return 'exceeded';
  }

  if (count === 0) return 'absent';
  if (count < target) return 'partial';
  if (count === target) return 'complete';
  return 'exceeded';
}

export function completedHistoryForDate(history: HistoryRecord[], taskId: string, date: string | Date): number {
  const key = formatDateOnly(startOfDay(date));
  return history.filter(record => record.taskId === taskId
    && record.isCompletion
    && formatDateOnly(new Date(record.date)) === key).length;
}

function scheduledDatesBetween(task: AppTask, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (isTaskScheduledOnDate(task, cursor)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function routineSnapshotForDate(snapshots: ProgressSnapshot[], taskId: string, date: Date): ProgressSnapshot | undefined {
  const key = formatDateOnly(date);
  return snapshots.find(snapshot => snapshot.kind === 'routine-appearance'
    && snapshot.taskId === taskId
    && snapshot.periodStart === key);
}

function routineSnapshotScore(snapshot?: ProgressSnapshot): number {
  if (!snapshot) return 0;
  return Math.min(1, snapshot.progressPercent / Math.max(1, snapshot.targetPercent || 100));
}

export function getTaskTrackingSummary(
  task: AppTask,
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): TaskTrackingSummary {
  const today = startOfDay(at);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const dueDates = scheduledDatesBetween(task, yearStart, today);
  const isRoutine = task.type === 'Rutina';
  const scores = dueDates.map(date => isRoutine
    ? routineSnapshotScore(routineSnapshotForDate(snapshots, task.id, date))
    : completedHistoryForDate(history, task.id, date) > 0 ? 1 : 0);
  const completedScore = scores.reduce((sum, score) => sum + score, 0);
  const lastDueDate = dueDates.at(-1);
  const lastDueScore = scores.at(-1) || 0;
  const activityDates = isRoutine
    ? snapshots
      .filter(snapshot => snapshot.kind === 'routine-appearance' && snapshot.taskId === task.id)
      .map(snapshot => snapshot.periodStart)
    : history
      .filter(record => record.taskId === task.id && record.isCompletion)
      .map(record => formatDateOnly(new Date(record.date)));

  return {
    compliancePercent: dueDates.length ? Math.round((completedScore / dueDates.length) * 100) : 0,
    dueCount: dueDates.length,
    completedScore,
    lastActivityDate: activityDates.sort().at(-1),
    pendingDate: lastDueDate && lastDueScore < 1 ? formatDateOnly(lastDueDate) : undefined,
    nextDate: getNextScheduledDate(task, today),
  };
}

export function getRoutineAppearanceSnapshot(snapshots: ProgressSnapshot[], routineId: string, date: string | Date): ProgressSnapshot | undefined {
  return routineSnapshotForDate(snapshots, routineId, startOfDay(date));
}
