import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, Intention } from '../types';
import {
  getTodayCommitmentSummaries,
  getWeeklyCommitmentSummaries,
  getCommitmentLabelsForTask,
} from './commitmentProgress';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: overrides.id || 'task-1',
  userId: 'user',
  text: overrides.text || 'Acción',
  type: 'Tarea',
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const quarter: Intention = {
  id: 'int-q1',
  userId: 'user',
  scale: 'quarter',
  periodStart: '2026-10-01',
  periodEnd: '2026-12-31',
  items: [],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('commitmentProgress', () => {
  it('calculates daily hours from planned actions and recorded time', () => {
    const action = task({ id: 'task-1', text: 'Bloque de foco', duracion: 2, fechaAparicion: '2026-10-16', appearanceMode: 'persistent' });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'hours', taskId: action.id }],
    };
    const history: HistoryRecord[] = [{
      id: 'history-1', userId: 'user', taskId: action.id,
      date: '2026-10-16T09:00:00', duration: 1, isCompletion: true, createdAt: '2026-10-16T10:00:00',
    }];

    const [summary] = getTodayCommitmentSummaries([intention], [action], history, [], '2026-10-16');

    expect(summary.displayValue).toBe('1.0 / 2.0 h');
    expect(summary.period).toBe('day');
    expect(summary.percent).toBe(50);
    expect(summary.actions).toHaveLength(1);
    expect(summary.actions[0].completed).toBe(true);
  });

  it('keeps a completed action visible at 100% even after it leaves the active task list', () => {
    const action = task({ id: 'task-1', duracion: 1, fechaAparicion: '2026-10-16', appearanceMode: 'persistent', completed: true });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'hours', taskId: action.id }],
    };
    const history: HistoryRecord[] = [{
      id: 'history-1', userId: 'user', taskId: action.id,
      date: '2026-10-16T09:00:00', isCompletion: true, createdAt: '2026-10-16T10:00:00',
    }];

    const [summary] = getTodayCommitmentSummaries([intention], [action], history, [], '2026-10-16');

    expect(summary.percent).toBe(100);
    expect(summary.actions[0].completed).toBe(true);
  });

  it('uses weeklyHours for a weekly commitment and keeps the calculation within the visible week', () => {
    const action = task({ id: 'task-1', duracion: 2, fechaAparicion: '2026-10-12', appearanceMode: 'persistent' });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'hours', taskId: action.id, hoursPacing: 'weekly', weeklyHours: 4 }],
    };
    const history: HistoryRecord[] = [
      { id: 'history-1', userId: 'user', taskId: action.id, date: '2026-10-12T09:00:00', duration: 2, createdAt: '2026-10-12T10:00:00' },
      { id: 'history-2', userId: 'user', taskId: action.id, date: '2026-10-20T09:00:00', duration: 3, createdAt: '2026-10-20T10:00:00' },
    ];

    const [summary] = getWeeklyCommitmentSummaries([intention], [action], history, [], '2026-10-12', '2026-10-18');

    expect(summary.displayValue).toBe('2.0 / 4.0 h');
    expect(summary.period).toBe('week');
    expect(summary.percent).toBe(50);
  });

  it('counts recurring weekly occurrences without duplicating the action row', () => {
    const action = task({ id: 'task-1', fechaAparicion: '2026-10-12', appearanceMode: 'persistent' });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'consistency', taskId: action.id }],
    };
    const history: HistoryRecord[] = [
      { id: 'history-1', userId: 'user', taskId: action.id, date: '2026-10-12T09:00:00', isCompletion: true, createdAt: '2026-10-12T10:00:00' },
      { id: 'history-2', userId: 'user', taskId: action.id, date: '2026-10-13T09:00:00', isCompletion: true, createdAt: '2026-10-13T10:00:00' },
    ];

    const [summary] = getWeeklyCommitmentSummaries([intention], [action], history, [], '2026-10-12', '2026-10-18');

    expect(summary.displayValue).toBe('2 / 7 ocurrencias');
    expect(summary.actions).toHaveLength(1);
    expect(summary.percent).toBe(29);
  });

  it('keeps dated counter increments separate from legacy currentCount', () => {
    const action = task({ id: 'task-1', fechaAparicion: '2026-10-16', appearanceMode: 'persistent' });
    const intention: Intention = {
      ...quarter,
      items: [{
        id: 'item-1', targetType: 'counter', taskId: action.id,
        currentCount: 120, targetCount: 500, unitLabel: 'páginas',
        counterEntries: [{ id: 'entry-1', date: '2026-10-16', delta: 12, createdAt: '2026-10-16T10:00:00' }],
      }],
    };

    const [summary] = getTodayCommitmentSummaries([intention], [action], [], [], '2026-10-16');

    expect(summary.displayValue).toBe('+12 páginas');
    expect(summary.percent).toBe(0);
    expect(summary.item.currentCount).toBe(120);
  });

  it('hides commitments without actions today and labels related tasks', () => {
    const todayAction = task({ id: 'task-today', fechaAparicion: '2026-10-16', appearanceMode: 'persistent' });
    const futureAction = task({ id: 'task-future', fechaAparicion: '2026-10-20', appearanceMode: 'once' });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'completion', taskId: todayAction.id }],
    };

    expect(getTodayCommitmentSummaries([intention], [futureAction], [], [], '2026-10-16')).toEqual([]);
    expect(getCommitmentLabelsForTask([intention], [todayAction], todayAction.id, '2026-10-12', '2026-10-18')).toEqual(['Acción']);
  });

  it('uses visible descendants as the daily actions of a project commitment', () => {
    const project = task({ id: 'project-1', text: 'Proyecto', type: 'Proyecto' });
    const child = task({
      id: 'child-1',
      text: 'Accion operativa',
      parentId: project.id,
      fechaAparicion: '2026-10-16',
      appearanceMode: 'persistent',
    });
    const intention: Intention = {
      ...quarter,
      items: [{ id: 'item-1', targetType: 'completion', projectId: project.id }],
    };

    const [summary] = getTodayCommitmentSummaries([intention], [project, child], [], [], '2026-10-16');

    expect(summary.actions.map(action => action.task.id)).toEqual(['child-1']);
  });
});
