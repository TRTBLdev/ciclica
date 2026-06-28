import { AppTask, HistoryRecord, IntentionItem } from '../types';

export function getTaskIdsForItem(item: IntentionItem, tasks: AppTask[]): string[] {
  if (item.taskId) {
    return [item.taskId];
  }
  if (item.projectId) {
    const subTaskIds = tasks.filter(t => t.parentId === item.projectId).map(t => t.id);
    return [item.projectId, ...subTaskIds];
  }
  if (item.areaName) {
    if (item.subCategory) {
      return tasks
        .filter(t => t.category === item.areaName && t.subCategory === item.subCategory)
        .map(t => t.id);
    }
    return tasks.filter(t => t.category === item.areaName).map(t => t.id);
  }
  return [];
}

export function calculateHoursProgress(
  item: IntentionItem,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string
) {
  const taskIds = getTaskIdsForItem(item, tasks);
  const relevantHistory = history.filter(h => {
    const recordDateStr = h.date.slice(0, 10);
    return (
      taskIds.includes(h.taskId) &&
      recordDateStr >= periodStart &&
      recordDateStr <= periodEnd &&
      h.duration !== undefined &&
      h.duration > 0
    );
  });

  const current = relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
  const target = item.targetHours || 0;
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return { current, target, percent };
}

export function calculateConsistencyProgress(
  item: IntentionItem,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string
) {
  const taskIds = getTaskIdsForItem(item, tasks);
  const relevantHistory = history.filter(h => {
    const recordDateStr = h.date.slice(0, 10);
    return (
      taskIds.includes(h.taskId) &&
      recordDateStr >= periodStart &&
      recordDateStr <= periodEnd
    );
  });

  const uniqueDays = new Set(relevantHistory.map(h => h.date.slice(0, 10)));
  const current = uniqueDays.size;
  const target = item.targetDays || 0;
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return { current, target, percent };
}

export function calculateCompletionProgress(item: IntentionItem, tasks: AppTask[]) {
  if (item.taskId) {
    const task = tasks.find(t => t.id === item.taskId);
    return {
      completed: !!task?.completed,
      taskName: task?.text || 'Tarea no encontrada'
    };
  }
  if (item.projectId) {
    const project = tasks.find(t => t.id === item.projectId);
    return {
      completed: !!project?.completed,
      taskName: project?.text || 'Proyecto no encontrado'
    };
  }
  return {
    completed: false,
    taskName: 'Sin vinculación'
  };
}

export function calculateItemProgress(
  item: IntentionItem,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string
) {
  if (item.targetType === 'hours') {
    return {
      type: 'hours' as const,
      hours: calculateHoursProgress(item, tasks, history, periodStart, periodEnd)
    };
  }
  if (item.targetType === 'consistency') {
    return {
      type: 'consistency' as const,
      consistency: calculateConsistencyProgress(item, tasks, history, periodStart, periodEnd)
    };
  }
  // item.targetType === 'completion'
  return {
    type: 'completion' as const,
    completion: calculateCompletionProgress(item, tasks)
  };
}
