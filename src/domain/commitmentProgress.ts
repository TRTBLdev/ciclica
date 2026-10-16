import { AppTask, HistoryRecord, Intention, IntentionItem, ProgressSnapshot } from '../types';
import { formatDateOnly, parseDateOnly } from './recurrenceProgress';
import { getHistoryDateKey, getProjectTaskIds } from './workTracking';
import { getTaskIdsForItem, getIntentionItemLabel } from './intentionProgress';
import { getTodayPlacement, isAppearanceScheduledOnDate, isItemAppearingOnDate, isRoutineCycleClosed } from './appearance';
import { isTaskEffectivelyPaused } from './pause';

export type CommitmentContext = {
  intention: Intention;
  item: IntentionItem;
};

export type CommitmentAction = {
  task: AppTask;
  completed: boolean;
  actualHours: number;
  plannedHours: number;
  plannedOccurrences: number;
  completedOccurrences: number;
};

export type CommitmentPeriodSummary = CommitmentContext & {
  id: string;
  period: 'day' | 'week';
  title: string;
  targetType: IntentionItem['targetType'];
  actions: CommitmentAction[];
  actualHours: number;
  plannedHours: number;
  completedActions: number;
  plannedOccurrences: number;
  completedOccurrences: number;
  counterDelta: number;
  percent: number;
  displayValue: string;
  secondaryValue?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date): Date {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseDateOnly(value)
    : new Date(value);
}

export function getWeekRange(at: string | Date = new Date()): { start: string; end: string } {
  const date = toDate(at);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  const start = formatDateOnly(date);
  date.setDate(date.getDate() + 6);
  return { start, end: formatDateOnly(date) };
}

function dateRange(start: string, end: string): string[] {
  const cursor = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  const result: string[] = [];
  while (cursor <= endDate) {
    result.push(formatDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function taskIdsForAction(task: AppTask, tasks: AppTask[]): string[] {
  if (task.type === 'Proyecto') return getProjectTaskIds(task.id, tasks);
  if (task.type === 'Rutina') {
    return [task.id, ...tasks.filter(child => child.parentId === task.id).map(child => child.id)];
  }
  return [task.id];
}

function isVisibleAction(task: AppTask, tasks: AppTask[], at: string | Date = new Date()): boolean {
  if (
    task.completed
    || task.type === 'Pulso'
    || task.type === 'Proyecto'
    || task.type === 'Rutina'
    || isTaskEffectivelyPaused(task, tasks, at)
  ) return false;
  return true;
}

function isActionScheduledOnDate(
  task: AppTask,
  date: string,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
): boolean {
  if (!isVisibleAction(task, tasks, date)) return false;
  const parent = task.parentId ? tasks.find(candidate => candidate.id === task.parentId) : undefined;
  if (parent?.type === 'Proyecto') {
    return isItemAppearingOnDate(task, history, date);
  }
  if (parent?.type === 'Rutina') {
    return isAppearanceScheduledOnDate(parent, date) && !isRoutineCycleClosed(parent, snapshots, date);
  }
  const placement = getTodayPlacement(task, tasks, history, snapshots, date);
  return placement === 'timeline' || placement === 'flexible';
}

function historyForTaskOnDate(task: AppTask, tasks: AppTask[], history: HistoryRecord[], date: string): HistoryRecord[] {
  const ids = new Set(taskIdsForAction(task, tasks));
  return history.filter(record => ids.has(record.taskId) && getHistoryDateKey(record) === date);
}

function getActionHours(task: AppTask, tasks: AppTask[], history: HistoryRecord[], date: string): number {
  return historyForTaskOnDate(task, tasks, history, date)
    .reduce((sum, record) => sum + (record.duration || 0), 0);
}

function getPlannedHours(task: AppTask, tasks: AppTask[]): number {
  if (task.duracion && task.duracion > 0) return task.duracion;
  if (task.type === 'Proyecto' || task.type === 'Rutina') {
    return tasks
      .filter(candidate => candidate.parentId === task.id && !candidate.completed)
      .reduce((sum, candidate) => sum + (candidate.duracion || 0), 0);
  }
  return 0;
}

function isActionCompleted(task: AppTask, tasks: AppTask[], history: HistoryRecord[], date: string): boolean {
  return historyForTaskOnDate(task, tasks, history, date).some(record => (
    record.isCompletion === true || (record.duration || 0) > 0 || record.pulseOutcome === 'safe-day'
  ));
}

function getCounterDelta(item: IntentionItem, start: string, end: string): number {
  return (item.counterEntries || [])
    .filter(entry => entry.date >= start && entry.date <= end)
    .reduce((sum, entry) => sum + entry.delta, 0);
}

function intersectingQuarterCommitments(intentions: Intention[], start: string, end: string): CommitmentContext[] {
  return intentions.flatMap(intention => {
    if (intention.scale !== 'quarter' || intention.periodStart > end || intention.periodEnd < start) return [];
    return intention.items.map(item => ({ intention, item }));
  });
}

function actionsForCommitment(
  context: CommitmentContext,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  start: string,
  end: string,
): CommitmentAction[] {
  const relatedIds = new Set(getTaskIdsForItem(context.item, tasks));
  const result = new Map<string, CommitmentAction>();
  dateRange(start, end).forEach(date => {
    tasks.forEach(task => {
      if (!relatedIds.has(task.id) || task.type === 'Proyecto' || task.type === 'Rutina' || task.type === 'Pulso') return;
      const scheduled = isActionScheduledOnDate(task, date, tasks, history, snapshots);
      const activity = historyForTaskOnDate(task, tasks, history, date);
      const hasActivity = activity.length > 0;
      if (!scheduled && !hasActivity) return;
      const action = result.get(task.id) || {
        task,
        completed: false,
        actualHours: 0,
        plannedHours: 0,
        plannedOccurrences: 0,
        completedOccurrences: 0,
      };
      result.set(task.id, action);
      const completed = activity.some(record => (
        record.isCompletion === true || (record.duration || 0) > 0 || record.pulseOutcome === 'safe-day'
      ));
      if (scheduled || activity.length > 0) {
        action.plannedOccurrences += 1;
        action.plannedHours += getPlannedHours(task, tasks);
      }
      action.actualHours += activity.reduce((sum, record) => sum + (record.duration || 0), 0);
      if (completed) action.completedOccurrences += 1;
    });
  });

  result.forEach(action => {
    action.completed = action.completedOccurrences > 0
      && action.completedOccurrences >= Math.max(1, action.plannedOccurrences);
  });

  return Array.from(result.values());
}

function buildSummary(
  context: CommitmentContext,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  start: string,
  end: string,
  mode: 'day' | 'week',
): CommitmentPeriodSummary | null {
  const actions = actionsForCommitment(context, tasks, history, snapshots, start, end);
  const counterDelta = context.item.targetType === 'counter'
    ? getCounterDelta(context.item, start, end)
    : 0;
  if (actions.length === 0 && counterDelta === 0) return null;

  const actualHours = actions.reduce((sum, action) => sum + action.actualHours, 0);
  const plannedHours = actions.reduce((sum, action) => sum + action.plannedHours, 0);
  const plannedOccurrences = actions.reduce((sum, action) => sum + action.plannedOccurrences, 0);
  const completedOccurrences = actions.reduce((sum, action) => sum + action.completedOccurrences, 0);
  const completedActions = actions.filter(action => action.completed).length;
  const weeklyTarget = mode === 'week' && context.item.targetType === 'hours' && context.item.hoursPacing === 'weekly'
    ? context.item.weeklyHours || 0
    : 0;

  let percent = 0;
  let displayValue = '';
  let secondaryValue: string | undefined;

  if (context.item.targetType === 'hours') {
    const target = weeklyTarget || plannedHours;
    const completionFallback = plannedOccurrences > 0
      ? (completedOccurrences / plannedOccurrences) * 100
      : actions.length > 0 ? (completedActions / actions.length) * 100 : 0;
    percent = target > 0
      ? Math.min(100, Math.round(actualHours > 0 ? (actualHours / target) * 100 : completionFallback))
      : Math.min(100, completionFallback);
    displayValue = target > 0
      ? `${actualHours.toFixed(1)} / ${target.toFixed(1)} h`
      : `${actualHours.toFixed(1)} h realizadas`;
    if (weeklyTarget && plannedHours > 0) secondaryValue = `${plannedHours.toFixed(1)} h planificadas`;
  } else if (context.item.targetType === 'counter') {
    percent = plannedOccurrences > 0
      ? Math.min(100, Math.round((completedOccurrences / plannedOccurrences) * 100))
      : 0;
    const unit = context.item.unitLabel || 'unidades';
    displayValue = `+${counterDelta} ${unit}`;
    secondaryValue = plannedOccurrences > 0 ? `${completedOccurrences}/${plannedOccurrences} acciones` : undefined;
  } else {
    percent = plannedOccurrences > 0
      ? Math.min(100, Math.round((completedOccurrences / plannedOccurrences) * 100))
      : 0;
    displayValue = context.item.targetType === 'consistency'
      ? `${completedOccurrences} / ${plannedOccurrences} ocurrencias`
      : `${completedOccurrences} / ${plannedOccurrences} acciones`;
  }

  return {
    ...context,
    id: `${context.intention.id}:${context.item.id}`,
    period: mode,
    title: getIntentionItemLabel(context.item, tasks),
    targetType: context.item.targetType,
    actions,
    actualHours,
    plannedHours,
    completedActions,
    plannedOccurrences,
    completedOccurrences,
    counterDelta,
    percent,
    displayValue,
    secondaryValue,
  };
}

export function getTodayCommitmentSummaries(
  intentions: Intention[],
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  today: string = formatDateOnly(new Date()),
): CommitmentPeriodSummary[] {
  return intersectingQuarterCommitments(intentions, today, today)
    .map(context => buildSummary(context, tasks, history, snapshots, today, today, 'day'))
    .filter((summary): summary is CommitmentPeriodSummary => !!summary);
}

export function getWeeklyCommitmentSummaries(
  intentions: Intention[],
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  weekStart: string,
  weekEnd?: string,
): CommitmentPeriodSummary[] {
  const end = weekEnd || formatDateOnly(new Date(toDate(weekStart).getTime() + 6 * DAY_MS));
  return intersectingQuarterCommitments(intentions, weekStart, end)
    .map(context => buildSummary(context, tasks, history, snapshots, weekStart, end, 'week'))
    .filter((summary): summary is CommitmentPeriodSummary => !!summary);
}

export function getCommitmentLabelsForTask(
  intentions: Intention[],
  tasks: AppTask[],
  taskId: string,
  start: string,
  end: string,
): string[] {
  return intersectingQuarterCommitments(intentions, start, end)
    .filter(context => getTaskIdsForItem(context.item, tasks).includes(taskId))
    .map(context => getIntentionItemLabel(context.item, tasks));
}

export function isTaskActiveOnDate(
  task: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  date: string,
): boolean {
  return isActionScheduledOnDate(task, date, tasks, history, snapshots);
}

export function getActionActivityOnDate(task: AppTask, tasks: AppTask[], history: HistoryRecord[], date: string) {
  return {
    hours: getActionHours(task, tasks, history, date),
    completed: isActionCompleted(task, tasks, history, date),
  };
}
