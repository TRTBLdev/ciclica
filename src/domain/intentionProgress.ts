import { AppTask, HistoryRecord, IntentionItem, Intention, LinkedItem } from '../types';

export type AreaCommitment = {
  intention: Intention;
  item: IntentionItem;
};

export const INTENTION_SCALE_LABELS = {
  phase: 'Fase',
  cycle: 'Ciclo',
  quarter: 'Trimestre',
  year: 'Año'
} as const;

export function getIntentionItemLabel(item: IntentionItem, tasks: AppTask[]): string {
  if (item.projectId) return tasks.find(task => task.id === item.projectId)?.text || 'Proyecto';
  if (item.taskId) return tasks.find(task => task.id === item.taskId)?.text || 'Tarea';
  if (item.subCategory) return item.subCategory;
  return item.areaName || 'Área';
}

export function getActiveAreaCommitments(
  areaName: string,
  intentions: Intention[],
  tasks: AppTask[],
  today = new Date().toISOString().slice(0, 10)
): AreaCommitment[] {
  return intentions.flatMap(intention => {
    if (intention.periodStart > today || intention.periodEnd < today) return [];

    return intention.items
      .filter(item => {
        if (item.areaName === areaName) return true;
        if (item.projectId) return tasks.find(task => task.id === item.projectId)?.category === areaName;
        if (item.taskId) return tasks.find(task => task.id === item.taskId)?.category === areaName;
        return false;
      })
      .map(item => ({ intention, item }));
  });
}

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
  periodEnd: string,
  intentions: Intention[] = []
): {
  type: 'hours' | 'consistency' | 'completion';
  hours?: { current: number; target: number; percent: number };
  consistency?: { current: number; target: number; percent: number };
  completion?: { completed: boolean; taskName: string };
} {
  // Find all child items linked to this parent item across all intentions
  const childLinks: LinkedItem[] = [];
  intentions.forEach(intent => {
    if (intent.linkedItems) {
      intent.linkedItems.forEach(link => {
        if (link.parentItemId === item.id) {
          childLinks.push(link);
        }
      });
    }
  });

  if (childLinks.length > 0) {
    let currentSum = 0;
    let completedCount = 0;

    childLinks.forEach(link => {
      // Find the child intention
      const childIntention = intentions.find(i => i.id === link.childIntentionId);
      if (!childIntention) return;
      const childItem = childIntention.items.find(it => it.id === link.childItemId);
      if (!childItem) return;

      // Calculate child item's progress recursively
      const childProgress = calculateItemProgress(
        childItem,
        tasks,
        history,
        childIntention.periodStart,
        childIntention.periodEnd,
        intentions
      );

      if (childProgress.type === 'hours' && childProgress.hours) {
        currentSum += childProgress.hours.current;
      } else if (childProgress.type === 'consistency' && childProgress.consistency) {
        currentSum += childProgress.consistency.current;
      } else if (childProgress.type === 'completion' && childProgress.completion) {
        if (childProgress.completion.completed) {
          completedCount++;
        }
      }
    });

    if (item.targetType === 'hours') {
      const targetHours = item.targetHours || 0;
      return {
        type: 'hours',
        hours: {
          current: currentSum,
          target: targetHours,
          percent: targetHours > 0 ? Math.min(100, (currentSum / targetHours) * 100) : 0
        }
      };
    } else if (item.targetType === 'consistency') {
      const targetDays = item.targetDays || 0;
      return {
        type: 'consistency',
        consistency: {
          current: currentSum,
          target: targetDays,
          percent: targetDays > 0 ? Math.min(100, (currentSum / targetDays) * 100) : 0
        }
      };
    } else {
      // item.targetType === 'completion'
      const completed = childLinks.length > 0 && completedCount === childLinks.length;
      return {
        type: 'completion',
        completion: {
          completed,
          taskName: item.projectId 
            ? (tasks.find(t => t.id === item.projectId)?.text || 'Proyecto')
            : (tasks.find(t => t.id === item.taskId)?.text || 'Tarea')
        }
      };
    }
  }

  // Direct calculation (fallback when no child items are linked)
  if (item.targetType === 'hours') {
    return {
      type: 'hours',
      hours: calculateHoursProgress(item, tasks, history, periodStart, periodEnd)
    };
  }
  if (item.targetType === 'consistency') {
    return {
      type: 'consistency',
      consistency: calculateConsistencyProgress(item, tasks, history, periodStart, periodEnd)
    };
  }
  // item.targetType === 'completion'
  return {
    type: 'completion',
    completion: calculateCompletionProgress(item, tasks)
  };
}

export function summarizeIntentionProgress(progress: ReturnType<typeof calculateItemProgress>) {
  if (progress.type === 'hours' && progress.hours) {
    return {
      typeLabel: 'Horas',
      value: `${progress.hours.current.toFixed(1)} / ${progress.hours.target} h`,
      compactValue: `${progress.hours.current}/${progress.hours.target}h`,
      percent: progress.hours.percent
    };
  }
  if (progress.type === 'consistency' && progress.consistency) {
    return {
      typeLabel: 'Constancia',
      value: `${progress.consistency.current} / ${progress.consistency.target} d`,
      compactValue: `${progress.consistency.current}/${progress.consistency.target}d`,
      percent: progress.consistency.percent
    };
  }

  const completed = progress.completion?.completed || false;
  return {
    typeLabel: 'Cumplimiento',
    value: completed ? '1 / 1' : '0 / 1',
    compactValue: completed ? '1/1' : '0/1',
    percent: completed ? 100 : 0
  };
}
