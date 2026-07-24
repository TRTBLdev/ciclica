import { AppTask, HistoryContextSnapshot, HistoryRecord } from '../types';
import { getProjectForTask } from './workTracking';

function toSnapshot(task: AppTask): HistoryContextSnapshot {
  return {
    id: task.id,
    type: task.type as 'Proyecto' | 'Rutina',
    text: task.text,
  };
}

export function resolveHistoryContext(
  record: Pick<HistoryRecord, 'taskId'> & Partial<Pick<HistoryRecord, 'routineId' | 'context'>>,
  tasks: AppTask[],
): HistoryContextSnapshot | undefined {
  if (record.context) return record.context;

  const task = tasks.find(candidate => candidate.id === record.taskId);
  if (task?.type === 'Proyecto' || task?.type === 'Rutina') return toSnapshot(task);

  if (task?.type === 'Hábito' && task.parentId) {
    const routine = tasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina');
    if (routine) return toSnapshot(routine);
  }

  const routine = record.routineId
    ? tasks.find(candidate => candidate.id === record.routineId && candidate.type === 'Rutina')
    : undefined;
  if (routine) return toSnapshot(routine);

  const project = task ? getProjectForTask(task.id, tasks) : null;
  return project ? toSnapshot(project) : undefined;
}

export function attachHistoryContext<T extends Pick<HistoryRecord, 'taskId'> & Partial<HistoryRecord>>(
  record: T,
  tasks: AppTask[],
): T {
  const context = resolveHistoryContext(record, tasks);
  return context && !record.context ? { ...record, context } : record;
}

export function preserveHistoryBeforeTaskDeletion(
  records: HistoryRecord[],
  taskToDelete: AppTask,
  tasks: AppTask[],
  updatedAt = new Date().toISOString(),
): HistoryRecord[] {
  return records.map(record => {
    const contextualized = attachHistoryContext(record, tasks);
    if (record.taskId !== taskToDelete.id || record.taskSnapshotText) return contextualized;
    return {
      ...contextualized,
      taskSnapshotText: taskToDelete.text,
      updatedAt,
    };
  });
}
