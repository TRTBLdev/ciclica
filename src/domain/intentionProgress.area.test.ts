import { describe, expect, it } from 'vitest';
import { AppTask, Intention } from '../types';
import { getActiveAreaCommitments } from './intentionProgress';

const task = (id: string, category: string): AppTask => ({
  id,
  userId: 'user',
  text: id,
  type: id.startsWith('project') ? 'Proyecto' : 'Tarea',
  category,
  createdAt: '2026-01-01T00:00:00.000Z'
});

const intention = (id: string, periodStart: string, periodEnd: string, items: Intention['items']): Intention => ({
  id,
  userId: 'user',
  scale: 'cycle',
  periodStart,
  periodEnd,
  items,
  createdAt: '2026-01-01T00:00:00.000Z'
});

describe('getActiveAreaCommitments', () => {
  it('matches direct, subcategory, project and task commitments in the active period', () => {
    const tasks = [task('project-1', 'BODY'), task('task-1', 'BODY'), task('task-2', 'MIND')];
    const commitments = getActiveAreaCommitments('BODY', [
      intention('active', '2026-07-01', '2026-07-31', [
        { id: 'area', targetType: 'hours', areaName: 'BODY', targetHours: 4 },
        { id: 'subcategory', targetType: 'hours', areaName: 'BODY', subCategory: 'MOVIMIENTO', targetHours: 4 },
        { id: 'project', targetType: 'completion', projectId: 'project-1' },
        { id: 'task', targetType: 'consistency', taskId: 'task-1', targetDays: 3 },
        { id: 'other', targetType: 'hours', taskId: 'task-2', targetHours: 2 }
      ])
    ], tasks, '2026-07-19');

    expect(commitments.map(commitment => commitment.item.id)).toEqual(['area', 'subcategory', 'project', 'task']);
  });

  it('excludes expired and future intentions', () => {
    const intentions = [
      intention('expired', '2026-06-01', '2026-06-30', [{ id: 'old', targetType: 'hours', areaName: 'BODY' }]),
      intention('future', '2026-08-01', '2026-08-31', [{ id: 'next', targetType: 'hours', areaName: 'BODY' }])
    ];
    expect(getActiveAreaCommitments('BODY', intentions, [], '2026-07-19')).toEqual([]);
  });
});
