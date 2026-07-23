import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  getDescendantTaskIds,
  getProjectForTask,
  getWorkDayState,
  getWorkedHoursForDate,
  resolveCompletionDuration,
} from './workTracking';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task',
  userId: 'user',
  text: 'Task',
  type: 'Tarea',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const record = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: 'history',
  userId: 'user',
  taskId: 'task',
  date: '2026-07-20T12:00:00.000Z',
  createdAt: '2026-07-20T12:00:00.000Z',
  ...overrides,
});

describe('project ancestry', () => {
  it('resolves deep descendants without duplicating them', () => {
    const tasks = [
      task({ id: 'project', type: 'Proyecto' }),
      task({ id: 'child', parentId: 'project' }),
      task({ id: 'grandchild', parentId: 'child' }),
    ];

    expect(getProjectForTask('grandchild', tasks)?.id).toBe('project');
    expect(getDescendantTaskIds('project', tasks)).toEqual(['child', 'grandchild']);
  });

  it('attributes historical task ids through the current project hierarchy', () => {
    const projectA = task({ id: 'project-a', type: 'Proyecto' });
    const projectB = task({ id: 'project-b', type: 'Proyecto' });
    const child = task({ id: 'child', parentId: projectA.id });

    expect(getProjectForTask(child.id, [projectA, projectB, child])?.id).toBe(projectA.id);
    expect(getProjectForTask(child.id, [projectA, projectB, { ...child, parentId: projectB.id }])?.id).toBe(projectB.id);
  });
});

describe('completion duration', () => {
  it('uses the estimate for a task only when it has no previous record', () => {
    const item = task({ duracion: 1 });
    expect(resolveCompletionDuration(item, [], '2026-07-21')).toBe(1);
    expect(resolveCompletionDuration(item, [record({ duration: 0.4 })], '2026-07-21')).toBe(0);
  });

  it('uses the estimate for a new habit occurrence but not after a same-day session', () => {
    const habit = task({ type: 'Hábito', duracion: 0.5 });
    const oldSession = record({ taskId: habit.id, date: '2026-07-20T12:00:00.000Z', duration: 0.25 });
    const sameDaySession = record({ taskId: habit.id, date: '2026-07-21T08:00:00.000Z', duration: 0.25 });

    expect(resolveCompletionDuration(habit, [oldSession], '2026-07-21T18:00:00.000Z')).toBe(0.5);
    expect(resolveCompletionDuration(habit, [oldSession, sameDaySession], '2026-07-21T18:00:00.000Z')).toBe(0);
  });

  it('always honors an explicit duration', () => {
    expect(resolveCompletionDuration(task({ duracion: 1 }), [record({})], '2026-07-21', 0.75)).toBe(0.75);
  });

  it('records a manual project closure as a zero-hour completion', () => {
    const project = task({ type: 'Proyecto', duracion: 8 });
    expect(resolveCompletionDuration(project, [], '2026-07-21')).toBe(0);
  });
});

describe('monthly work states', () => {
  it('ignores zero-hour completions and distinguishes planned and executed days', () => {
    const history = [
      record({ id: 'zero', date: '2026-07-21T09:00:00.000Z', duration: 0, isCompletion: true }),
      record({ id: 'worked', date: '2026-07-21T11:00:00.000Z', duration: 0.5 }),
    ];

    expect(getWorkedHoursForDate(['task'], history, '2026-07-21')).toBe(0.5);
    expect(getWorkDayState(true, 0)).toBe('planned');
    expect(getWorkDayState(false, 0.5)).toBe('executed');
    expect(getWorkDayState(true, 0.5)).toBe('matched');
  });
});
