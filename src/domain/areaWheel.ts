import { AppTask, Config, HistoryRecord, Intention, IntentionItem, ProgressSnapshot } from '../types';
import { calculateItemProgress, summarizeIntentionProgress } from './intentionProgress';
import { getHistoryDateKey, getProjectForTask } from './workTracking';

export interface AreaWheelDatum {
  area: string;
  score: number;
  hasData: boolean;
  valueLabel: string;
  detailLabel: string;
  count: number;
}

export interface IntentionAreaWheelResult {
  data: AreaWheelDatum[];
  unassignedCount: number;
}

export interface DedicationAreaWheelResult {
  data: AreaWheelDatum[];
  totalHours: number;
  unassignedHours: number;
  unassignedCount: number;
}

function configuredAreas(config: Config | null): string[] {
  return Object.keys(config?.areas || {});
}

export function resolveTaskArea(taskId: string, tasks: AppTask[]): string | undefined {
  const task = tasks.find(candidate => candidate.id === taskId);
  if (!task) return undefined;

  const project = getProjectForTask(task.id, tasks);
  if (project?.category) return project.category;
  if (task.category) return task.category;

  const visited = new Set<string>();
  let parentId = task.parentId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = tasks.find(candidate => candidate.id === parentId);
    if (!parent) return undefined;
    if (parent.category) return parent.category;
    parentId = parent.parentId;
  }

  return undefined;
}

function resolveItemArea(item: IntentionItem, tasks: AppTask[]): string | undefined {
  if (item.areaName) return item.areaName;
  if (item.projectId) return resolveTaskArea(item.projectId, tasks);
  if (item.taskId) return resolveTaskArea(item.taskId, tasks);
  return undefined;
}

export function buildIntentionAreaWheel(
  config: Config | null,
  intention: Intention | undefined,
  tasks: AppTask[],
  history: HistoryRecord[],
  intentions: Intention[],
  progressSnapshots: ProgressSnapshot[] = [],
): IntentionAreaWheelResult {
  const areas = configuredAreas(config);
  const buckets = new Map<string, { total: number; count: number }>();
  areas.forEach(area => buckets.set(area, { total: 0, count: 0 }));
  let unassignedCount = 0;

  intention?.items.forEach(item => {
    const area = resolveItemArea(item, tasks);
    const bucket = area ? buckets.get(area) : undefined;
    if (!bucket) {
      unassignedCount += 1;
      return;
    }

    const progress = calculateItemProgress(
      item,
      tasks,
      history,
      intention.periodStart,
      intention.periodEnd,
      intentions,
      progressSnapshots,
    );
    const percent = summarizeIntentionProgress(progress).percent;
    bucket.total += Math.max(0, Math.min(100, percent));
    bucket.count += 1;
  });

  return {
    data: areas.map(area => {
      const bucket = buckets.get(area)!;
      const score = bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0;
      return {
        area,
        score,
        hasData: bucket.count > 0,
        valueLabel: bucket.count > 0 ? `${score}% de avance` : 'Sin compromisos',
        detailLabel: bucket.count === 1 ? '1 compromiso' : `${bucket.count} compromisos`,
        count: bucket.count,
      };
    }),
    unassignedCount,
  };
}

export function buildDedicationAreaWheel(
  config: Config | null,
  tasks: AppTask[],
  history: HistoryRecord[],
  periodStart: string,
  periodEnd: string,
): DedicationAreaWheelResult {
  const areas = configuredAreas(config);
  const areaHours = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  areas.forEach(area => {
    areaHours.set(area, 0);
    areaCounts.set(area, 0);
  });

  let totalHours = 0;
  let unassignedHours = 0;
  let unassignedCount = 0;

  history.forEach(record => {
    const date = getHistoryDateKey(record);
    if (date < periodStart || date > periodEnd || (record.duration || 0) <= 0) return;

    const duration = record.duration || 0;
    totalHours += duration;
    const area = resolveTaskArea(record.taskId, tasks);
    if (!areaHours.has(area || '')) {
      unassignedHours += duration;
      unassignedCount += 1;
      return;
    }

    areaHours.set(area!, (areaHours.get(area!) || 0) + duration);
    areaCounts.set(area!, (areaCounts.get(area!) || 0) + 1);
  });

  const maxHours = Math.max(0, ...Array.from(areaHours.values()));
  return {
    data: areas.map(area => {
      const hours = areaHours.get(area) || 0;
      const count = areaCounts.get(area) || 0;
      const share = totalHours > 0 ? (hours / totalHours) * 100 : 0;
      return {
        area,
        score: maxHours > 0 ? Math.round((hours / maxHours) * 100) : 0,
        hasData: hours > 0,
        valueLabel: `${hours.toFixed(1)} h`,
        detailLabel: `${share.toFixed(1)}% del total · ${count} ${count === 1 ? 'registro' : 'registros'}`,
        count,
      };
    }),
    totalHours,
    unassignedHours,
    unassignedCount,
  };
}
