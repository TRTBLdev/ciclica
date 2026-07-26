import { AppTask, HistoryRecord, ProgressSnapshot, RecurringResultStatus } from '../types';
import {
  getChildHabitCycleCount,
  getRoutineOpportunityDates,
  getStandaloneQuotaCount,
} from './appearance';
import { getHabitOccurrenceRange, getSnapshotResultStatus } from './occurrenceResults';
import { formatDateOnly, parseDateOnly } from './recurrenceProgress';
import { getHistoryDateKey } from './workTracking';

export interface HabitDurationSummary {
  currentActualHours: number;
  estimatedHours: number;
  completedCycleAverageHours: number | null;
  completedCycleCount: number;
}

export interface RoutineDurationSummary {
  currentActualHours: number;
  estimatedHours: number;
  combinedAverageHours: number | null;
  contributingHabitCount: number;
}

interface DurationBoundary {
  time: number;
  dateKey: string;
  status: RecurringResultStatus;
  durationHours: number;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

function recordTime(record: HistoryRecord): number {
  return new Date(record.endTime || record.date).getTime();
}

function snapshotTime(snapshot: ProgressSnapshot): number {
  const createdAt = new Date(snapshot.createdAt).getTime();
  if (Number.isFinite(createdAt)) return createdAt;
  return new Date(`${snapshot.resolvedAt || snapshot.periodEnd}T23:59:59`).getTime();
}

function completionStatus(record: HistoryRecord): RecurringResultStatus {
  return (record.completionPercent ?? 100) >= 100 ? 'complete' : 'partial';
}

function buildDurationBoundaries(
  records: HistoryRecord[],
  snapshots: ProgressSnapshot[],
): DurationBoundary[] {
  const boundaries = new Map<number, Omit<DurationBoundary, 'durationHours'>>();
  const completionRecords = records.filter(record => record.isCompletion === true);
  const matchedCompletionIds = new Set<string>();

  snapshots
    .filter(snapshot => snapshot.kind === 'habit-period')
    .forEach(snapshot => {
      const snapshotDate = snapshot.resolvedAt || snapshot.periodEnd;
      const matchingCompletion = snapshot.resolutionSource === 'manual'
        ? completionRecords
          .filter(record => !matchedCompletionIds.has(record.id) && getHistoryDateKey(record) === snapshotDate)
          .sort((first, second) => (
            Math.abs(recordTime(first) - snapshotTime(snapshot))
            - Math.abs(recordTime(second) - snapshotTime(snapshot))
          ))[0]
        : undefined;
      if (matchingCompletion) matchedCompletionIds.add(matchingCompletion.id);
      const time = matchingCompletion ? recordTime(matchingCompletion) : snapshotTime(snapshot);
      if (!Number.isFinite(time)) return;
      boundaries.set(time, {
        time,
        dateKey: snapshotDate,
        status: getSnapshotResultStatus(snapshot),
      });
    });

  completionRecords.forEach(record => {
      const time = recordTime(record);
      if (!Number.isFinite(time)) return;
      const existing = boundaries.get(time);
      boundaries.set(time, existing || {
        time,
        dateKey: getHistoryDateKey(record),
        status: completionStatus(record),
      });
  });

  const sortedRecords = [...records]
    .filter(record => Number.isFinite(recordTime(record)))
    .sort((a, b) => recordTime(a) - recordTime(b));
  const sortedBoundaries = [...boundaries.values()].sort((a, b) => a.time - b.time);
  let recordIndex = 0;

  return sortedBoundaries.map(boundary => {
    let durationHours = 0;
    while (
      recordIndex < sortedRecords.length
      && recordTime(sortedRecords[recordIndex]) <= boundary.time
    ) {
      durationHours += Math.max(0, sortedRecords[recordIndex].duration || 0);
      recordIndex += 1;
    }
    return { ...boundary, durationHours: roundHours(durationHours) };
  });
}

function recordsDurationAfter(
  records: HistoryRecord[],
  after: number,
  range: { start: string; end: string },
): number {
  return roundHours(records.reduce((total, record) => {
    const dateKey = getHistoryDateKey(record);
    const time = recordTime(record);
    if (
      !Number.isFinite(time)
      || time <= after
      || dateKey < range.start
      || dateKey > range.end
    ) return total;
    return total + Math.max(0, record.duration || 0);
  }, 0));
}

function shouldKeepLatestClosedDuration(
  habit: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  latest: DurationBoundary,
  at: string | Date,
): boolean {
  if (latest.status === 'missed') return false;

  const todayKey = formatDateOnly(parseDateOnly(at));
  if (latest.dateKey === todayKey) return true;

  const parentRoutine = habit.parentId
    ? tasks.find(task => task.id === habit.parentId && task.type === 'Rutina')
    : undefined;

  if (parentRoutine) {
    const target = Math.max(1, habit.objetivoPorCiclo || 1);
    if (getChildHabitCycleCount(parentRoutine, habit, history, at, snapshots) >= target) {
      return true;
    }
    const nextOpportunity = getRoutineOpportunityDates(parentRoutine, at)
      .find(date => date > latest.dateKey);
    return !nextOpportunity || todayKey < nextOpportunity;
  }

  if (habit.appearanceMode === 'quota' || habit.quotaTarget) {
    const target = Math.max(1, habit.quotaTarget || 1);
    return getStandaloneQuotaCount(habit, history, at) >= target;
  }

  const range = getHabitOccurrenceRange(habit, tasks, at);
  return latest.dateKey >= range.start && latest.dateKey <= range.end;
}

export function getHabitDurationSummary(
  habit: AppTask,
  tasks: AppTask[],
  records: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): HabitDurationSummary {
  const boundaries = buildDurationBoundaries(records, snapshots);
  const completedDurations = boundaries
    .filter(boundary => boundary.status === 'complete')
    .map(boundary => boundary.durationHours);
  const average = completedDurations.length > 0
    ? roundHours(completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length)
    : null;

  const range = getHabitOccurrenceRange(habit, tasks, at);
  const boundariesInRange = boundaries.filter(
    boundary => boundary.dateKey >= range.start && boundary.dateKey <= range.end,
  );
  const latestBoundary = boundariesInRange.at(-1);
  const openDuration = recordsDurationAfter(
    records,
    latestBoundary?.time ?? Number.NEGATIVE_INFINITY,
    range,
  );
  const currentActualHours = openDuration > 0
    ? openDuration
    : latestBoundary && shouldKeepLatestClosedDuration(habit, tasks, records, snapshots, latestBoundary, at)
      ? latestBoundary.durationHours
      : 0;

  return {
    currentActualHours: roundHours(currentActualHours),
    estimatedHours: roundHours(Math.max(0, habit.duracion || 0)),
    completedCycleAverageHours: average,
    completedCycleCount: completedDurations.length,
  };
}

export function buildHabitDurationSummaryIndex(
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  at: string | Date = new Date(),
): Map<string, HabitDurationSummary> {
  const historyByTask = new Map<string, HistoryRecord[]>();
  const snapshotsByTask = new Map<string, ProgressSnapshot[]>();

  history.forEach(record => {
    const records = historyByTask.get(record.taskId) || [];
    records.push(record);
    historyByTask.set(record.taskId, records);
  });
  snapshots.forEach(snapshot => {
    const taskSnapshots = snapshotsByTask.get(snapshot.taskId) || [];
    taskSnapshots.push(snapshot);
    snapshotsByTask.set(snapshot.taskId, taskSnapshots);
  });

  return new Map(
    tasks
      .filter(task => task.type === 'Hábito')
      .map(habit => [
        habit.id,
        getHabitDurationSummary(
          habit,
          tasks,
          historyByTask.get(habit.id) || [],
          snapshotsByTask.get(habit.id) || [],
          at,
        ),
      ]),
  );
}

export function getRoutineDurationSummary(
  habits: AppTask[],
  habitSummaries: Map<string, HabitDurationSummary>,
): RoutineDurationSummary {
  const summaries = habits
    .map(habit => habitSummaries.get(habit.id))
    .filter((summary): summary is HabitDurationSummary => !!summary);
  const averages = summaries.filter(summary => summary.completedCycleAverageHours !== null);

  return {
    currentActualHours: roundHours(
      summaries.reduce((total, summary) => total + summary.currentActualHours, 0),
    ),
    estimatedHours: roundHours(
      summaries.reduce((total, summary) => total + summary.estimatedHours, 0),
    ),
    combinedAverageHours: averages.length > 0
      ? roundHours(averages.reduce(
        (total, summary) => total + (summary.completedCycleAverageHours || 0),
        0,
      ))
      : null,
    contributingHabitCount: averages.length,
  };
}

export function buildRoutineDurationSummaryIndex(
  tasks: AppTask[],
  habitSummaries: Map<string, HabitDurationSummary>,
): Map<string, RoutineDurationSummary> {
  const habitsByRoutine = new Map<string, AppTask[]>();
  tasks
    .filter(task => task.type === 'Hábito' && task.parentId)
    .forEach(habit => {
      const habits = habitsByRoutine.get(habit.parentId!) || [];
      habits.push(habit);
      habitsByRoutine.set(habit.parentId!, habits);
    });

  return new Map(
    tasks
      .filter(task => task.type === 'Rutina')
      .map(routine => [
        routine.id,
        getRoutineDurationSummary(habitsByRoutine.get(routine.id) || [], habitSummaries),
      ]),
  );
}
