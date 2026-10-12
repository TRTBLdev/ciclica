import { AppTask, PauseInterval } from '../types';

function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTime(value: string | Date): number {
  if (value instanceof Date) return value.getTime();
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`).getTime()
    : new Date(value).getTime();
}

function intervalContains(interval: PauseInterval, at: string | Date): boolean {
  const point = toTime(at);
  const start = toTime(interval.startedAt);
  const end = interval.endedAt ? toTime(interval.endedAt) : Number.POSITIVE_INFINITY;
  return Number.isFinite(start) && point >= start && point < end;
}

export function isTaskDirectlyPaused(task: AppTask, at: string | Date = new Date()): boolean {
  return (task.pauseIntervals || []).some(interval => intervalContains(interval, at));
}

export function getTaskParent(task: AppTask, tasks: AppTask[]): AppTask | undefined {
  return task.parentId ? tasks.find(candidate => candidate.id === task.parentId) : undefined;
}

export function isTaskEffectivelyPaused(
  task: AppTask,
  tasks: AppTask[],
  at: string | Date = new Date(),
): boolean {
  const visited = new Set<string>();
  let current: AppTask | undefined = task;
  while (current && !visited.has(current.id)) {
    if (isTaskDirectlyPaused(current, at)) return true;
    visited.add(current.id);
    current = getTaskParent(current, tasks);
  }
  return false;
}

export function isTaskPauseRoot(
  task: AppTask,
  tasks: AppTask[],
  at: string | Date = new Date(),
): boolean {
  if (!isTaskEffectivelyPaused(task, tasks, at)) return false;
  const parent = getTaskParent(task, tasks);
  return !parent || !isTaskEffectivelyPaused(parent, tasks, at);
}

export function getPauseRootTasks(
  tasks: AppTask[],
  at: string | Date = new Date(),
): AppTask[] {
  return tasks.filter(task => isTaskPauseRoot(task, tasks, at));
}

export function wasTaskPausedAtPeriodEnd(
  task: AppTask,
  tasks: AppTask[],
  date: string | Date,
): boolean {
  const end = parseLocalDate(date);
  end.setHours(23, 59, 59, 999);
  return isTaskEffectivelyPaused(task, tasks, end);
}

export function getDirectPauseStart(task: AppTask): string | undefined {
  return [...(task.pauseIntervals || [])]
    .filter(interval => !interval.endedAt)
    .sort((a, b) => toTime(b.startedAt) - toTime(a.startedAt))[0]?.startedAt;
}

export function pauseTaskRecord(task: AppTask, startedAt: string): AppTask {
  if (task.completed || isTaskDirectlyPaused(task, startedAt)) return task;
  return {
    ...task,
    pauseIntervals: [...(task.pauseIntervals || []), { startedAt }],
  };
}

export function resumeTaskRecord(task: AppTask, endedAt: string): AppTask {
  const intervals = [...(task.pauseIntervals || [])];
  const openIndex = intervals.map(interval => !interval.endedAt).lastIndexOf(true);
  if (openIndex < 0) return task;
  const open = intervals[openIndex];
  if (toTime(endedAt) < toTime(open.startedAt)) return task;
  intervals[openIndex] = { ...open, endedAt };
  return { ...task, pauseIntervals: intervals };
}

export function getPauseDateLabel(task: AppTask): string | undefined {
  const startedAt = getDirectPauseStart(task);
  return startedAt ? formatLocalDate(new Date(startedAt)) : undefined;
}
