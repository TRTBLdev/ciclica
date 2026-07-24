import { AppTask, HistoryRecord } from '../types';

export type HistoryPeriod = 'todas' | 'hoy' | 'semana' | '7dias' | 'mes' | '30dias' | 'ciclo';
export type HistorySection = 'simple' | 'recurring' | 'pulses';

export const DEFAULT_HISTORY_PERIOD: HistoryPeriod = '7dias';
export const HISTORY_PAGE_SIZE = 25;

export interface HistoryGroups {
  simple: HistoryRecord[];
  recurring: HistoryRecord[];
  pulses: HistoryRecord[];
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
      groups.simple.push(record);
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
