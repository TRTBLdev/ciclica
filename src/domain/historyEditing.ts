import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  getRoutineCycleProgressFromHistory,
  getRoutineCycleRangeForTask,
  isVerifiedHabitCompletion,
} from './appearance';
import { getHistoryDateKey } from './workTracking';

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

  if (routine) {
    const affectedCycleStarts = new Set([
      getRoutineCycleRangeForTask(routine, getHistoryDateKey(original)).start,
      getRoutineCycleRangeForTask(routine, getHistoryDateKey(updated)).start,
    ]);
    return snapshots.map(snapshot => {
      if (snapshot.taskId !== routine.id) return snapshot;
      const cycle = getRoutineCycleRangeForTask(routine, snapshot.periodStart);
      if (!affectedCycleStarts.has(cycle.start)) return snapshot;
      const progress = getRoutineCycleProgressFromHistory(routine, tasks, nextHistory, snapshot.periodStart);
      return {
        ...snapshot,
        progressPercent: progress,
        wasCompleted: snapshot.kind === 'routine-cycle'
          ? progress === 100
          : progress >= Math.max(1, snapshot.targetPercent || 100),
      };
    });
  }

  if (task?.type !== 'Hábito') return snapshots;
  const affectedDates = new Set([getHistoryDateKey(original), getHistoryDateKey(updated)]);
  let next = snapshots.filter(snapshot => !(snapshot.kind === 'habit-period'
    && snapshot.taskId === task.id
    && affectedDates.has(snapshot.periodStart)));

  affectedDates.forEach(date => {
    const completion = nextHistory.find(record => getHistoryDateKey(record) === date && isVerifiedHabitCompletion(task, record));
    if (!completion) return;
    next = [...next, {
      id: `progress_edit_${task.id}_${date}`,
      userId: task.userId,
      kind: 'habit-period',
      taskId: task.id,
      taskSnapshotText: task.text,
      periodStart: date,
      periodEnd: date,
      progressPercent: completion.completionPercent ?? 100,
      wasCompleted: true,
      createdAt: completion.createdAt,
    }];
  });

  return next;
}
