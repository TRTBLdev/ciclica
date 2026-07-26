import { AppTask } from '../types';
import { getHabitOccurrenceRange } from './occurrenceResults';

export function resolveHabitChecklistCycleUpdate(
  task: AppTask,
  updates: Partial<AppTask>,
  tasks: AppTask[],
  at: string | Date = new Date(),
): Partial<AppTask> {
  if (task.type !== 'Hábito') return updates;

  const parentChanged = Object.prototype.hasOwnProperty.call(updates, 'parentId')
    && updates.parentId !== task.parentId;
  const startsCheckedChecklist = !!updates.checklist?.some(item => item.done)
    && !task.checklistCycleStart;
  if (!parentChanged && !startsCheckedChecklist) return updates;

  const updatedTask = { ...task, ...updates };
  const updatedTasks = tasks.map(candidate => candidate.id === task.id ? updatedTask : candidate);
  return {
    ...updates,
    checklistCycleStart: updatedTask.checklist?.some(item => item.done)
      ? getHabitOccurrenceRange(updatedTask, updatedTasks, at).start
      : undefined,
  };
}
