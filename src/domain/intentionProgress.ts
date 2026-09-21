import { AppTask, HistoryRecord, IntentionItem, Intention, LinkedItem, ProgressSnapshot } from '../types';
import { getHistoryDateKey, getProjectTaskIds } from './workTracking';
import { formatDateOnly, getCalendarCycleRange, parseDateOnly } from './recurrenceProgress';
import { getHabitResultsInRange, getRoutineCycleProgress, getSnapshotResolvedAt } from './occurrenceResults';

export type AreaCommitment = {
  intention: Intention;
  item: IntentionItem;
};

export const INTENTION_SCALE_LABELS = {
  cycle: 'Ciclo',
  quarter: 'Trimestre',
  year: 'Año'
} as const;

export function getIntentionItemLabel(item: IntentionItem, tasks: AppTask[]): string {
  if (item.targetType === 'counter') {
    if (item.counterName) return item.counterName;
    if (item.taskId) return tasks.find(task => task.id === item.taskId)?.text || 'Contador';
  }
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
    const task = tasks.find(t => t.id === item.taskId);
    if (task?.type === 'Rutina') {
      const childHabitIds = tasks.filter(t => t.parentId === item.taskId).map(t => t.id);
      return [item.taskId, ...childHabitIds];
    }
    if (task?.type === 'Proyecto') {
      const childTaskIds = tasks.filter(t => t.parentId === item.taskId).map(t => t.id);
      return [item.taskId, ...childTaskIds];
    }
    return [item.taskId];
  }
  if (item.projectId) {
    return getProjectTaskIds(item.projectId, tasks);
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
    const recordDateStr = getHistoryDateKey(h);
    return (
      taskIds.includes(h.taskId) &&
      recordDateStr >= periodStart &&
      recordDateStr <= periodEnd &&
      h.duration !== undefined &&
      h.duration > 0
    );
  });

  const current = relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
  let target = item.targetHours || 0;
  if (item.hoursPacing === 'weekly' && item.weeklyHours) {
    const s = new Date(periodStart);
    const e = new Date(periodEnd);
    const totalDays = Math.max(7, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalWeeks = Math.max(1, Math.round(totalDays / 7));
    target = item.weeklyHours * totalWeeks;
  }
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return { current, target, percent, weeklyHours: item.weeklyHours, pacing: item.hoursPacing };
}

export function calculateCounterProgress(
  item: IntentionItem,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string
) {
  const current = item.currentCount || 0;
  const target = item.targetCount || 0;
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const unit = item.unitLabel || 'unidades';

  let hoursSpent = 0;
  if (item.taskId) {
    const relevantHistory = history.filter(h => {
      const recordDateStr = getHistoryDateKey(h);
      return (
        h.taskId === item.taskId &&
        recordDateStr >= periodStart &&
        recordDateStr <= periodEnd &&
        h.duration !== undefined &&
        h.duration > 0
      );
    });
    hoursSpent = relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
  }

  return {
    current,
    target,
    percent,
    unit,
    hoursSpent,
    isDone: target > 0 && current >= target
  };
}

export interface ConsistencyProgressResult {
  current: number;
  target: number;
  percent: number;
  unit: '%' | 'd';
  isCycleScore?: boolean;
  uniqueDays?: number;
  totalDaysElapsed?: number;
}

export function calculateConsistencyProgress(
  item: IntentionItem,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string,
  progressSnapshots: ProgressSnapshot[] = []
): ConsistencyProgressResult {
  const task = item.taskId ? tasks.find(t => t.id === item.taskId) : undefined;

  // 1. Routine cycle compliance
  if (task?.type === 'Rutina' && (item.targetPercent !== undefined || !item.targetDays)) {
    const target = item.targetPercent ?? 80;

    // Collect resolved routine-cycle snapshots in range
    const resolvedSnapshots = progressSnapshots.filter(s =>
      s.kind === 'routine-cycle' &&
      s.taskId === task.id &&
      getSnapshotResolvedAt(s) >= periodStart &&
      getSnapshotResolvedAt(s) <= periodEnd
    );

    const scores = resolvedSnapshots.map(s => Math.max(0, Math.min(100, s.progressPercent)));

    // Active cycle score if currently within or overlapping period
    const today = new Date();
    const activeCycle = getCalendarCycleRange(
      task.routineCycleFrequency || 1,
      task.routineCycleUnit || 'semanas',
      today
    );

    const overlaps = activeCycle.start <= periodEnd && activeCycle.end >= periodStart;
    const isAlreadySnapshotted = resolvedSnapshots.some(s => {
      const at = getSnapshotResolvedAt(s);
      return at >= activeCycle.start && at <= activeCycle.end;
    });

    if (overlaps && !isAlreadySnapshotted) {
      const activeScore = getRoutineCycleProgress(task, tasks, history, progressSnapshots, today);
      scores.push(activeScore);
    }

    const current = scores.length > 0
      ? Math.round(scores.reduce((sum, val) => sum + val, 0) / scores.length)
      : 0;
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return {
      current,
      target,
      percent,
      unit: '%',
      isCycleScore: true
    };
  }

  // 2. Standalone habit with targetPercent
  if (task?.type === 'Hábito' && item.targetPercent !== undefined && !item.targetDays) {
    const target = item.targetPercent ?? 80;
    const habitResults = getHabitResultsInRange(task, history, progressSnapshots, { start: periodStart, end: periodEnd });
    if (habitResults.length > 0) {
      const current = Math.round(habitResults.reduce((sum, r) => sum + r.progressPercent, 0) / habitResults.length);
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        current,
        target,
        percent,
        unit: '%',
        isCycleScore: false
      };
    }
  }

  // 3. Fallback: unique active days against targetDays or total elapsed days
  const taskIds = getTaskIdsForItem(item, tasks);
  const relevantHistory = history.filter(h => {
    const recordDateStr = getHistoryDateKey(h);
    return (
      taskIds.includes(h.taskId) &&
      recordDateStr >= periodStart &&
      recordDateStr <= periodEnd
    );
  });

  const uniqueDays = new Set(relevantHistory.map(getHistoryDateKey)).size;

  if (item.targetDays && item.targetDays > 0) {
    const target = item.targetDays;
    const percent = Math.min(100, (uniqueDays / target) * 100);
    return {
      current: uniqueDays,
      target,
      percent,
      unit: 'd',
      uniqueDays
    };
  }

  const target = item.targetPercent ?? 80;
  const s = parseDateOnly(periodStart);
  const e = parseDateOnly(periodEnd);
  const now = new Date();
  const effectiveEnd = now < e ? now : e;
  const totalDaysElapsed = Math.max(1, Math.round((effectiveEnd.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const current = Math.min(100, Math.round((uniqueDays / totalDaysElapsed) * 100));
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return {
    current,
    target,
    percent,
    unit: '%',
    uniqueDays,
    totalDaysElapsed
  };
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
  intentions: Intention[] = [],
  progressSnapshots: ProgressSnapshot[] = []
): {
  type: 'hours' | 'consistency' | 'completion' | 'counter';
  hours?: { current: number; target: number; percent: number; weeklyHours?: number; pacing?: 'weekly' | 'total' };
  consistency?: ConsistencyProgressResult;
  completion?: { completed: boolean; taskName: string };
  counter?: { current: number; target: number; percent: number; unit: string; hoursSpent: number; isDone: boolean };
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
        intentions,
        progressSnapshots
      );

      if (childProgress.type === 'hours' && childProgress.hours) {
        currentSum += childProgress.hours.current;
      } else if (childProgress.type === 'consistency' && childProgress.consistency) {
        currentSum += childProgress.consistency.current;
      } else if (childProgress.type === 'counter' && childProgress.counter) {
        currentSum += childProgress.counter.current;
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
          percent: targetDays > 0 ? Math.min(100, (currentSum / targetDays) * 100) : 0,
          unit: 'd'
        }
      };
    } else if (item.targetType === 'counter') {
      const targetCount = item.targetCount || 0;
      return {
        type: 'counter',
        counter: {
          current: currentSum,
          target: targetCount,
          percent: targetCount > 0 ? Math.min(100, Math.round((currentSum / targetCount) * 100)) : 0,
          unit: item.unitLabel || 'unidades',
          hoursSpent: 0,
          isDone: targetCount > 0 && currentSum >= targetCount
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
      consistency: calculateConsistencyProgress(item, tasks, history, periodStart, periodEnd, progressSnapshots)
    };
  }
  if (item.targetType === 'counter') {
    return {
      type: 'counter',
      counter: calculateCounterProgress(item, tasks, history, periodStart, periodEnd)
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
      compactValue: `${progress.hours.current.toFixed(1)}/${progress.hours.target}h`,
      percent: progress.hours.percent
    };
  }
  if (progress.type === 'consistency' && progress.consistency) {
    const isPercent = progress.consistency.unit === '%';
    return {
      typeLabel: 'Constancia',
      value: isPercent
        ? `${progress.consistency.current}% / ${progress.consistency.target}%`
        : `${progress.consistency.current} / ${progress.consistency.target} d`,
      compactValue: isPercent
        ? `${progress.consistency.current}% / ${progress.consistency.target}%`
        : `${progress.consistency.current}/${progress.consistency.target}d`,
      percent: progress.consistency.percent
    };
  }
  if (progress.type === 'counter' && progress.counter) {
    return {
      typeLabel: 'Contador',
      value: `${progress.counter.current} / ${progress.counter.target} ${progress.counter.unit}`,
      compactValue: `${progress.counter.current}/${progress.counter.target}`,
      percent: progress.counter.percent
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
