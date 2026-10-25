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

export type CommitmentTone = 'success' | 'danger' | 'in-progress' | 'neutral';

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
  tone: CommitmentTone;
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

export function computeWeeklyTone(
  percent: number,
  weekStart: string,
  weekEnd: string,
  refDate: string,
  plannedDays?: number,
  completedDays?: number,
): CommitmentTone {
  if (percent >= 100) return 'success';

  if (refDate < weekStart) {
    return percent > 0 ? 'in-progress' : 'neutral';
  }

  const effectiveDateStr = refDate <= weekEnd ? refDate : weekEnd;
  const effectiveDate = parseDateOnly(effectiveDateStr);
  const day = effectiveDate.getDay();
  const dayNumber = day === 0 ? 7 : day;
  const daysRemaining = 7 - dayNumber + 1;
  const isLateWeek = dayNumber >= 5;

  if (plannedDays !== undefined && completedDays !== undefined && plannedDays > 0) {
    const neededDays = plannedDays - completedDays;
    if (neededDays > daysRemaining) {
      return 'danger';
    }
  }

  if (isLateWeek && percent < 20) {
    return 'danger';
  }

  if (percent > 0) return 'in-progress';
  return 'neutral';
}

export function computeDailyTone(
  dayPercent: number,
  weeklyTone?: CommitmentTone,
): CommitmentTone {
  if (dayPercent >= 100) return 'success';
  if (weeklyTone === 'danger') return 'danger';
  if (dayPercent > 0) return 'in-progress';
  return 'neutral';
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
  refDate: string = formatDateOnly(new Date()),
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
  let plannedDays: number | undefined;
  let completedDays: number | undefined;
  const isHabits = actions.some(action => action.task.type === 'Hábito');

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
    const unitLabel = isHabits
      ? (plannedOccurrences === 1 ? 'hábito' : 'hábitos')
      : (plannedOccurrences === 1 ? 'acción' : 'acciones');

    if (mode === 'week' && context.item.targetType === 'consistency' && isHabits) {
      // Indicador en la agenda semanal para hábitos/rutinas
      const days = dateRange(start, end);
      let pDays = 0;
      let cDays = 0;

      days.forEach(date => {
        const isScheduled = actions.some(action => (
          isActionScheduledOnDate(action.task, date, tasks, history, snapshots)
        ));
        const hasCompletion = actions.some(action => (
          historyForTaskOnDate(action.task, tasks, history, date).some(record => (
            record.isCompletion === true || (record.duration || 0) > 0 || record.pulseOutcome === 'safe-day'
          ))
        ));

        if (isScheduled || hasCompletion) {
          pDays += 1;
          if (hasCompletion) {
            cDays += 1;
          }
        }
      });

      plannedDays = pDays;
      completedDays = cDays;

      // Indicador principal: hábitos
      const habitsUnit = plannedOccurrences === 1 ? 'hábito' : 'hábitos';
      displayValue = `${completedOccurrences} / ${plannedOccurrences} ${habitsUnit}`;
      // Indicador secundario: desglose de días
      const daysUnit = plannedDays === 1 ? 'día' : 'días';
      secondaryValue = `${completedDays} / ${plannedDays} ${daysUnit}`;
      // Porcentaje basado en el total de hábitos completados frente al total de la semana
      percent = plannedOccurrences > 0
        ? Math.min(100, Math.round((completedOccurrences / plannedOccurrences) * 100))
        : 0;
    } else {
      // Vista Hoy o compromisos de tipo completion / tareas normales
      percent = plannedOccurrences > 0
        ? Math.min(100, Math.round((completedOccurrences / plannedOccurrences) * 100))
        : 0;
      displayValue = `${completedOccurrences} / ${plannedOccurrences} ${unitLabel}`;
    }
  }

  let tone: CommitmentTone = 'neutral';
  if (mode === 'week') {
    const targetDays = (context.item.targetType === 'consistency' && isHabits)
      ? (context.item.weeklyTarget || plannedDays)
      : undefined;
    tone = computeWeeklyTone(percent, start, end, refDate, targetDays, completedDays);
  } else {
    tone = percent >= 100 ? 'success' : (percent > 0 ? 'in-progress' : 'neutral');
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
    tone,
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
  const { start: weekStart, end: weekEnd } = getWeekRange(today);
  return intersectingQuarterCommitments(intentions, today, today)
    .map(context => {
      const daySummary = buildSummary(context, tasks, history, snapshots, today, today, 'day', today);
      if (!daySummary) return null;
      const weeklySummary = buildSummary(context, tasks, history, snapshots, weekStart, weekEnd, 'week', today);
      const tone = computeDailyTone(daySummary.percent, weeklySummary?.tone);
      return {
        ...daySummary,
        tone,
      };
    })
    .filter((summary): summary is CommitmentPeriodSummary => !!summary);
}

export function getWeeklyCommitmentSummaries(
  intentions: Intention[],
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[],
  weekStart: string,
  weekEnd?: string,
  refDate: string = formatDateOnly(new Date()),
): CommitmentPeriodSummary[] {
  const end = weekEnd || formatDateOnly(new Date(toDate(weekStart).getTime() + 6 * DAY_MS));
  return intersectingQuarterCommitments(intentions, weekStart, end)
    .map(context => buildSummary(context, tasks, history, snapshots, weekStart, end, 'week', refDate))
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
