import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  attachHistoryContext,
  preserveHistoryBeforeTaskDeletion,
  resolveHistoryContext,
} from './historyContext';

const task = (id: string, text: string, overrides: Partial<AppTask> = {}): AppTask => ({
  id,
  userId: 'local_user',
  text,
  type: 'Tarea',
  completed: false,
  createdAt: '2026-07-24T12:00:00.000Z',
  ...overrides,
});

const record = (taskId: string, overrides: Partial<HistoryRecord> = {}): HistoryRecord => ({
  id: `history-${taskId}`,
  userId: 'local_user',
  taskId,
  date: '2026-07-24T12:00:00.000Z',
  createdAt: '2026-07-24T12:00:00.000Z',
  duration: 1,
  ...overrides,
});

describe('history context snapshots', () => {
  it('resolves the root project for nested tasks', () => {
    const project = task('project', 'Sitio nuevo', { type: 'Proyecto' });
    const parent = task('parent', 'Diseño', { parentId: project.id });
    const child = task('child', 'Portada', { parentId: parent.id });

    expect(resolveHistoryContext(record(child.id), [project, parent, child])).toEqual({
      id: project.id,
      type: 'Proyecto',
      text: project.text,
    });
  });

  it('resolves a habit routine and preserves an existing archived snapshot', () => {
    const routine = task('routine', 'Mañana', { type: 'Rutina' });
    const habit = task('habit', 'Agua', { type: 'Hábito', parentId: routine.id });
    expect(attachHistoryContext(record(habit.id), [routine, habit]).context).toEqual({
      id: routine.id,
      type: 'Rutina',
      text: routine.text,
    });

    const archived = record(habit.id, {
      context: { id: 'old-routine', type: 'Rutina', text: 'Nombre histórico' },
    });
    expect(attachHistoryContext(archived, [routine, habit])).toBe(archived);
  });

  it('preserves title and project context without deleting or changing historical hours', () => {
    const project = task('project', 'Proyecto', { type: 'Proyecto' });
    const child = task('child', 'Tarea eliminada', { parentId: project.id });
    const childRecord = record(child.id, { duration: 1.37 });

    const preserved = preserveHistoryBeforeTaskDeletion(
      [childRecord],
      child,
      [project, child],
      '2026-07-24T13:00:00.000Z',
    );

    expect(preserved).toHaveLength(1);
    expect(preserved[0]).toMatchObject({
      duration: 1.37,
      taskSnapshotText: 'Tarea eliminada',
      context: { id: project.id, type: 'Proyecto', text: project.text },
    });
  });
});
