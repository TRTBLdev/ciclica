import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { getAreaCardCounts } from './areaSummary';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: overrides.id || 'task',
  userId: 'local_user',
  text: overrides.text || overrides.id || 'Elemento',
  type: overrides.type || 'Tarea',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('getAreaCardCounts', () => {
  it('counts active containers and children with their effective area', () => {
    const project = task({ id: 'project', type: 'Proyecto', category: 'BODY' });
    const projectTask = task({ id: 'project-task', parentId: project.id, category: undefined });
    const nestedTask = task({ id: 'nested-task', parentId: projectTask.id, category: undefined });
    const standaloneTask = task({ id: 'standalone-task', category: 'BODY' });
    const routine = task({ id: 'routine', type: 'Rutina', category: 'BODY' });
    const routineHabit = task({ id: 'routine-habit', type: 'Hábito', parentId: routine.id, category: undefined });
    const ownAreaHabit = task({ id: 'mind-habit', type: 'Hábito', parentId: routine.id, category: 'MIND' });
    const standaloneHabit = task({ id: 'standalone-habit', type: 'Hábito', category: 'BODY' });

    expect(getAreaCardCounts('BODY', [
      project,
      projectTask,
      nestedTask,
      standaloneTask,
      routine,
      routineHabit,
      ownAreaHabit,
      standaloneHabit,
    ])).toEqual({ projects: 1, tasks: 3, routines: 1, habits: 2 });
    expect(getAreaCardCounts('MIND', [ownAreaHabit])).toEqual({ projects: 0, tasks: 0, routines: 0, habits: 1 });
  });

  it('excludes completed items and direct or inherited pauses', () => {
    const pausedProject = task({
      id: 'paused-project',
      type: 'Proyecto',
      category: 'BODY',
      pauseIntervals: [{ startedAt: '2026-01-01T00:00:00.000Z' }],
    });
    const pausedChild = task({ id: 'paused-child', parentId: pausedProject.id });
    const pausedHabit = task({
      id: 'paused-habit',
      type: 'Hábito',
      category: 'BODY',
      pauseIntervals: [{ startedAt: '2026-01-01T00:00:00.000Z' }],
    });
    const completedRoutine = task({ id: 'completed-routine', type: 'Rutina', category: 'BODY', completed: true });
    const completedHabit = task({ id: 'completed-habit', type: 'Hábito', category: 'BODY', completed: true });

    expect(getAreaCardCounts('BODY', [
      pausedProject,
      pausedChild,
      pausedHabit,
      completedRoutine,
      completedHabit,
    ])).toEqual({ projects: 0, tasks: 0, routines: 0, habits: 0 });
  });
});
