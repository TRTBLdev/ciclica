import { AppTask, HistoryRecord } from '../types';

export type HistoryPeriod = 'todas' | 'hoy' | 'semana' | '7dias' | 'mes' | '30dias' | 'ciclo';
export type HistorySection = 'simple' | 'recurring' | 'pulses';
export type HistorySearchScope =
  | { kind: 'item'; id: string }
  | { kind: 'context'; id: string; taskIds?: ReadonlySet<string> };

export interface HistorySearchSuggestion {
  key: string;
  kind: 'item' | 'context';
  id: string;
  text: string;
  type: AppTask['type'] | 'Proyecto archivado' | 'Rutina archivada';
  archived?: boolean;
}

export const DEFAULT_HISTORY_PERIOD: HistoryPeriod = '7dias';
export const HISTORY_PAGE_SIZE = 25;

export interface HistoryGroups {
  simple: HistoryRecord[];
  recurring: HistoryRecord[];
  pulses: HistoryRecord[];
}

export function getHistoryContextTaskIds(contextId: string, tasks: AppTask[]): Set<string> {
  const ids = new Set<string>([contextId]);
  const childrenByParent = new Map<string, string[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const children = childrenByParent.get(task.parentId) || [];
    children.push(task.id);
    childrenByParent.set(task.parentId, children);
  }

  const pending = [contextId];
  while (pending.length > 0) {
    const parentId = pending.pop()!;
    for (const childId of childrenByParent.get(parentId) || []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      pending.push(childId);
    }
  }

  return ids;
}

export function getHistorySearchSuggestions(
  query: string,
  tasks: AppTask[],
  history: HistoryRecord[],
  limit = 10,
): HistorySearchSuggestion[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  if (!normalizedQuery) return [];

  const suggestions: HistorySearchSuggestion[] = [];
  const liveContextKeys = new Set(
    tasks
      .filter(task => task.type === 'Proyecto' || task.type === 'Rutina')
      .map(task => `${task.type}|${task.id}`),
  );

  for (const task of tasks) {
    if (!task.text.toLocaleLowerCase('es-ES').includes(normalizedQuery)) continue;
    const isContext = task.type === 'Proyecto' || task.type === 'Rutina';
    suggestions.push({
      key: `${isContext ? 'context' : 'item'}:${task.id}`,
      kind: isContext ? 'context' : 'item',
      id: task.id,
      text: task.text,
      type: task.type,
    });
  }

  const archivedContexts = new Map<string, HistorySearchSuggestion>();
  for (const record of history) {
    const context = record.context;
    if (!context || !context.text.toLocaleLowerCase('es-ES').includes(normalizedQuery)) continue;
    const contextKey = `${context.type}|${context.id}`;
    if (liveContextKeys.has(contextKey) || archivedContexts.has(contextKey)) continue;
    archivedContexts.set(contextKey, {
      key: `archived-context:${context.type}:${context.id}`,
      kind: 'context',
      id: context.id,
      text: context.text,
      type: context.type === 'Proyecto' ? 'Proyecto archivado' : 'Rutina archivada',
      archived: true,
    });
  }

  return [...suggestions, ...archivedContexts.values()]
    .sort((a, b) => (
      Number(a.archived) - Number(b.archived)
      || a.text.localeCompare(b.text, 'es')
    ))
    .slice(0, limit);
}

export function getRetrospectiveSessionTargets(
  tasks: AppTask[],
  query: string,
  limit = 8,
): AppTask[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  if (!normalizedQuery) return [];
  return tasks.filter(task => (
    (task.type === 'Tarea' || task.type === 'Hábito')
    && task.text.toLocaleLowerCase('es-ES').includes(normalizedQuery)
  )).slice(0, limit);
}

export function getHistoryDayKey(date: string): string {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function filterHistoryRecords(
  sortedHistory: HistoryRecord[],
  taskById: Map<string, AppTask>,
  period: HistoryPeriod,
  query: string,
  lastCycleStartDate?: string,
  now = new Date(),
  scope?: HistorySearchScope,
): HistoryRecord[] {
  let start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'todas':
      break;
    case 'hoy':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'semana': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case '7dias':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'mes':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case '30dias':
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'ciclo':
      start = lastCycleStartDate ? new Date(lastCycleStartDate) : new Date(now);
      if (!lastCycleStartDate) start.setDate(now.getDate() - 27);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  const startTime = start.getTime();
  const endTime = end.getTime();

  return sortedHistory.filter(record => {
    if (period !== 'todas') {
      const recordTime = new Date(record.date).getTime();
      if (recordTime < startTime || recordTime > endTime) return false;
    }

    if (scope?.kind === 'item' && record.taskId !== scope.id) return false;
    if (
      scope?.kind === 'context'
      && record.context?.id !== scope.id
      && !scope.taskIds?.has(record.taskId)
    ) {
      return false;
    }

    if (!normalizedQuery) return true;
    const task = taskById.get(record.taskId);
    const label = task?.text || record.taskSnapshotText || '';
    return label.toLocaleLowerCase('es-ES').includes(normalizedQuery);
  });
}

export function groupHistoryRecords(
  records: HistoryRecord[],
  taskById: Map<string, AppTask>,
): HistoryGroups {
  const groups: HistoryGroups = { simple: [], recurring: [], pulses: [] };
  const taskDayKeys = new Set(records.map(record => `${record.taskId}|${getHistoryDayKey(record.date)}`));

  for (const record of records) {
    const task = taskById.get(record.taskId);

    if (!task) {
      if (record.context?.type === 'Rutina') groups.recurring.push(record);
      else groups.simple.push(record);
      continue;
    }

    if (task.type === 'Tarea' || task.type === 'Proyecto') {
      if (task.parentId) {
        const parent = taskById.get(task.parentId);
        const parentHasLogSameDay = parent?.type !== 'Proyecto'
          && taskDayKeys.has(`${task.parentId}|${getHistoryDayKey(record.date)}`);
        if (parentHasLogSameDay) continue;
      }
      groups.simple.push(record);
      continue;
    }

    if (task.type === 'Hábito' || task.type === 'Rutina') {
      if (
        task.parentId
        && taskDayKeys.has(`${task.parentId}|${getHistoryDayKey(record.date)}`)
      ) {
        continue;
      }
      groups.recurring.push(record);
      continue;
    }

    if (task.type === 'Pulso' && record.pulseOutcome !== 'safe-day') {
      groups.pulses.push(record);
    }
  }

  return groups;
}

export function getVisibleHistoryRecords(
  records: HistoryRecord[],
  period: HistoryPeriod,
  visibleCount: number,
): HistoryRecord[] {
  return period === 'todas' ? records.slice(0, visibleCount) : records;
}
