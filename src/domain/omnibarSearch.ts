import { AppTask, HistoryRecord } from '../types';
import { canTrackTask } from './appearance';
import { getDescendantTaskIds } from './workTracking';
import { isTaskEffectivelyPaused } from './pause';

export function getOmnibarSearchResults(
  tasks: AppTask[],
  history: HistoryRecord[],
  query: string,
): AppTask[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  if (normalizedQuery) {
    return tasks
      .filter(task => !task.completed && task.text.toLocaleLowerCase('es-ES').includes(normalizedQuery))
      .slice(0, 10);
  }

  return tasks
    .filter(task => canTrackTask(task, tasks, history))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
}

export function getTrackableDescendants(
  containerId: string,
  tasks: AppTask[],
  history: HistoryRecord[],
): AppTask[] {
  const descendantIds = new Set(getDescendantTaskIds(containerId, tasks));
  return tasks.filter(task => (
    descendantIds.has(task.id)
    && canTrackTask(task, tasks, history)
  ));
}

export function getQuickTrackItems(
  tasks: AppTask[],
  history: HistoryRecord[],
  at: string | Date = new Date(),
): AppTask[] {
  return tasks.filter(task => {
    if (!task.quickTrack || task.completed || isTaskEffectivelyPaused(task, tasks, at)) {
      return false;
    }
    if (task.type === 'Proyecto') {
      return getTrackableDescendants(task.id, tasks, history).length > 0;
    }
    return canTrackTask(task, tasks, history, at);
  });
}

export function getRecentTrackedTasks(
  tasks: AppTask[],
  history: HistoryRecord[],
  excludeIds: Set<string> = new Set(),
  limit = 3,
  at: string | Date = new Date(),
): AppTask[] {
  if (limit <= 0) return [];
  const taskMap = new Map(tasks.map(task => [task.id, task]));
  const seen = new Set<string>(excludeIds);
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const recents: AppTask[] = [];
  for (const record of sortedHistory) {
    if (seen.has(record.taskId)) continue;
    const task = taskMap.get(record.taskId);
    if (!task) continue;
    if (!canTrackTask(task, tasks, history, at)) continue;
    seen.add(task.id);
    recents.push(task);
    if (recents.length >= limit) break;
  }
  return recents;
}
