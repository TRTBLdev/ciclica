import { AppTask, ChecklistItem } from '../types';

export interface TaskDuplicationOptions {
  now?: string;
  createTaskId?: () => string;
  createChecklistId?: () => string;
}

const TEMPORAL_FIELDS: (keyof AppTask)[] = [
  'hora',
  'fechaPlanificada',
  'fechaAparicion',
  'fechaLimite',
  'fechaInicio',
  'recurrenceAnchorDate',
  'routineCycleAnchorDate',
];

function createDefaultId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getTaskDescendants(sourceId: string, tasks: AppTask[]): AppTask[] {
  const descendants: AppTask[] = [];
  const pending = [sourceId];
  const visited = new Set<string>(pending);

  while (pending.length > 0) {
    const parentId = pending.shift()!;
    tasks.forEach(task => {
      if (task.parentId !== parentId || visited.has(task.id)) return;
      visited.add(task.id);
      descendants.push(task);
      pending.push(task.id);
    });
  }

  return descendants;
}

function getSiblingOrder(source: AppTask, tasks: AppTask[]): number {
  const siblings = tasks
    .filter(task => (task.parentId || '') === (source.parentId || '')
      && (source.parentId ? true : task.type === source.type))
    .sort((a, b) => {
      const orderDifference = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
      if (orderDifference !== 0) return orderDifference;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const sourceIndex = siblings.findIndex(task => task.id === source.id);
  if (sourceIndex < 0) return source.order ?? 1000;

  const sourceOrder = source.order ?? (sourceIndex + 1) * 1000;
  const nextSibling = siblings[sourceIndex + 1];
  const nextOrder = nextSibling?.order ?? (sourceIndex + 2) * 1000;
  return nextSibling ? (sourceOrder + nextOrder) / 2 : sourceOrder + 1000;
}

function cloneChecklist(
  checklist: ChecklistItem[] | undefined,
  createChecklistId: () => string,
): ChecklistItem[] | undefined {
  return checklist?.map(item => ({
    ...item,
    id: createChecklistId(),
    done: false,
  }));
}

function clearTemporalFields(task: AppTask): AppTask {
  const next = { ...task };
  TEMPORAL_FIELDS.forEach(field => {
    delete next[field];
  });
  return next;
}

/**
 * Builds fresh copies of the selected task and every descendant without mutating the source list.
 * Internal parent/dependency references are remapped to the new IDs.
 */
export function duplicateTaskTree(
  sourceId: string,
  tasks: AppTask[],
  options: TaskDuplicationOptions = {},
): AppTask[] {
  const source = tasks.find(task => task.id === sourceId);
  if (!source) return [];

  const now = options.now || new Date().toISOString();
  const createTaskId = options.createTaskId || (() => createDefaultId('task'));
  const createChecklistId = options.createChecklistId || (() => createDefaultId('check'));
  const selected = [source, ...getTaskDescendants(sourceId, tasks)];
  const idMap = new Map<string, string>();
  selected.forEach(task => idMap.set(task.id, createTaskId()));

  return selected.map((original, index) => {
    const clone = clearTemporalFields(original);
    delete clone.id;
    delete clone.updatedAt;
    delete clone.createdAt;
    delete clone.userId;
    delete clone.completed;
    delete clone.lastExecutedAt;
    delete clone.checklistCycleStart;

    const isRoot = index === 0;
    const currentCount = original.type === 'Pulso' || original.currentCount !== undefined ? 0 : undefined;
    const duplicated: AppTask = {
      ...clone,
      id: idMap.get(original.id)!,
      userId: original.userId,
      text: isRoot ? `${original.text} (copia)` : original.text,
      parentId: original.parentId && idMap.get(original.parentId)
        ? idMap.get(original.parentId)
        : original.parentId,
      dependencyId: original.dependencyId && idMap.get(original.dependencyId)
        ? idMap.get(original.dependencyId)
        : original.dependencyId,
      completed: false,
      currentCount,
      checklist: cloneChecklist(original.checklist, createChecklistId),
      createdAt: now,
    };

    if (isRoot) duplicated.order = getSiblingOrder(source, tasks);
    return duplicated;
  });
}
