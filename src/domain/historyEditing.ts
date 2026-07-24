import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  getRoutineCycleRangeForTask,
  isVerifiedHabitCompletion,
} from './appearance';
import { getHistoryDateKey } from './workTracking';
import {
  createHabitResultSnapshot,
  getHabitOccurrenceRange,
  getRoutineCycleProgress,
  getSnapshotResolvedAt,
} from './occurrenceResults';

function getParentRoutine(task: AppTask | undefined, tasks: AppTask[]): AppTask | undefined {
  if (task?.type === 'Rutina') return task;
  if (task?.type !== 'Hábito' || !task.parentId) return undefined;
  return tasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina');
}

export function applyRecurringHistoryContext(
  record: HistoryRecord,
  task: AppTask | undefined,
  tasks: AppTask[],
): HistoryRecord {
  const routine = getParentRoutine(task, tasks);
  if (!routine || !record.isCompletion) return record;
  const actualDate = getHistoryDateKey(record);
  const cycle = getRoutineCycleRangeForTask(routine, actualDate);
  return {
    ...record,
    routineId: routine.id,
    routineCycleStart: cycle.start,
    routineAppearanceDate: actualDate,
  };
}

export function reconcileSnapshotsAfterHistoryEdit(
  snapshots: ProgressSnapshot[],
  tasks: AppTask[],
  nextHistory: HistoryRecord[],
  original: HistoryRecord,
  updated: HistoryRecord,
): ProgressSnapshot[] {
  const task = tasks.find(candidate => candidate.id === original.taskId);
  const routine = getParentRoutine(task, tasks);

  if (task?.type !== 'Hábito') return snapshots;
  const affectedDates = new Set([getHistoryDateKey(original), getHistoryDateKey(updated)]);
  let next = snapshots.filter(snapshot => !(snapshot.kind === 'habit-period'
    && snapshot.taskId === task.id
    && snapshot.resolutionSource !== 'period-end'
    && affectedDates.has(getSnapshotResolvedAt(snapshot))));

  affectedDates.forEach(date => {
    const completion = nextHistory.find(record => getHistoryDateKey(record) === date && isVerifiedHabitCompletion(task, record));
    if (!completion) return;
    const range = getHabitOccurrenceRange(task, tasks, date);
    next = [...next, {
      ...createHabitResultSnapshot(
        task,
        range,
        completion.completionPercent ?? 100,
        date,
        'manual',
      ),
      id: `progress_edit_${task.id}_${date}`,
      createdAt: completion.createdAt,
    }];
  });

  if (routine) {
    const affectedCycleStarts = new Set([
      getRoutineCycleRangeForTask(routine, getHistoryDateKey(original)).start,
      getRoutineCycleRangeForTask(routine, getHistoryDateKey(updated)).start,
    ]);
    next = next.map(snapshot => {
      if (snapshot.kind !== 'routine-cycle'
        || snapshot.taskId !== routine.id
        || !affectedCycleStarts.has(snapshot.periodStart)) return snapshot;
      const progress = getRoutineCycleProgress(routine, tasks, nextHistory, next, snapshot.periodStart);
      const resultStatus = progress >= 100
        ? 'complete'
        : progress > 0 || snapshot.resolutionSource === 'manual'
          ? 'partial'
          : 'missed';
      return {
        ...snapshot,
        progressPercent: progress,
        resultStatus,
        wasCompleted: resultStatus !== 'missed',
      };
    });
  }

  return next;
}
