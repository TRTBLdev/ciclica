import { AppTask } from '../types';
import { isTaskEffectivelyPaused } from './pause';
import { getProjectForTask } from './workTracking';

export interface AreaCardCounts {
  projects: number;
  tasks: number;
  routines: number;
  habits: number;
}

function getNearestAncestorArea(task: AppTask, tasks: AppTask[]): string | undefined {
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

function getTaskArea(task: AppTask, tasks: AppTask[]): string | undefined {
  if (task.type === 'Tarea') {
    const project = getProjectForTask(task.id, tasks);
    if (project?.category) return project.category;
  }

  return task.category || getNearestAncestorArea(task, tasks);
}

function isActive(task: AppTask, tasks: AppTask[]): boolean {
  return !task.completed && !isTaskEffectivelyPaused(task, tasks);
}

export function getAreaCardCounts(area: string, tasks: AppTask[]): AreaCardCounts {
  return tasks.reduce<AreaCardCounts>((counts, task) => {
    if (!isActive(task, tasks)) return counts;

    if (task.type === 'Proyecto' && task.category === area) counts.projects += 1;
    if (task.type === 'Tarea' && getTaskArea(task, tasks) === area) counts.tasks += 1;
    if (task.type === 'Rutina' && task.category === area) counts.routines += 1;
    if (task.type === 'Hábito' && getTaskArea(task, tasks) === area) counts.habits += 1;

    return counts;
  }, { projects: 0, tasks: 0, routines: 0, habits: 0 });
}
