import { AppTask, HistoryRecord } from '../types';
import { canTrackTask } from './appearance';
import { getDescendantTaskIds } from './workTracking';

export function getOmnibarSearchResults(
  tasks: AppTask[],
  history: HistoryRecord[],
  query: string,
): AppTask[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  if (normalizedQuery) {
    return tasks
      .filter(task => task.text.toLocaleLowerCase('es-ES').includes(normalizedQuery))
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
