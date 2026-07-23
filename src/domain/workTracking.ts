import { AppTask, HistoryRecord } from '../types';
import { formatDateOnly } from './recurrenceProgress';

export type WorkDayState = 'empty' | 'planned' | 'executed' | 'matched';

function toLocalDateKey(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatDateOnly(new Date(value));
}

export function getHistoryDateKey(record: Pick<HistoryRecord, 'date'>): string {
  return toLocalDateKey(record.date);
}

export function isWorkedHistoryRecord(record: HistoryRecord): boolean {
  return (record.duration || 0) > 0;
}

export function getDescendantTaskIds(parentId: string, tasks: AppTask[]): string[] {
  const descendants: string[] = [];
  const pending = [parentId];
  const visited = new Set<string>(pending);

  while (pending.length) {
    const currentId = pending.shift()!;
    tasks.forEach(task => {
      if (task.parentId !== currentId || visited.has(task.id)) return;
      visited.add(task.id);
      descendants.push(task.id);
      pending.push(task.id);
    });
  }

  return descendants;
}

export function getProjectForTask(taskId: string, tasks: AppTask[]): AppTask | null {
  let current = tasks.find(task => task.id === taskId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.type === 'Proyecto') return current;
    if (!current.parentId) return null;
    current = tasks.find(task => task.id === current!.parentId);
  }

  return null;
}

export function getProjectTaskIds(projectId: string, tasks: AppTask[]): string[] {
  return [projectId, ...getDescendantTaskIds(projectId, tasks)];
}

export function resolveCompletionDuration(
  task: AppTask,
  history: HistoryRecord[],
  occurrenceDate: string | Date,
  explicitDuration?: number,
): number {
  if (explicitDuration !== undefined) return explicitDuration;
  if (task.type === 'Proyecto' || task.type === 'Rutina') return 0;

  const hasRelevantRecord = task.type === 'Hábito'
    ? history.some(record => record.taskId === task.id
      && getHistoryDateKey(record) === toLocalDateKey(occurrenceDate))
    : history.some(record => record.taskId === task.id);

  return hasRelevantRecord ? 0 : (task.duracion || 0);
}

export function getWorkedHoursForDate(
  taskIds: Iterable<string>,
  history: HistoryRecord[],
  date: string | Date,
): number {
  const ids = new Set(taskIds);
  const dateKey = toLocalDateKey(date);
  return history.reduce((sum, record) => (
    ids.has(record.taskId) && getHistoryDateKey(record) === dateKey
      ? sum + Math.max(0, record.duration || 0)
      : sum
  ), 0);
}

export function getWorkDayState(planned: boolean, workedHours: number): WorkDayState {
  const executed = workedHours > 0;
  if (planned && executed) return 'matched';
  if (planned) return 'planned';
  if (executed) return 'executed';
  return 'empty';
}
