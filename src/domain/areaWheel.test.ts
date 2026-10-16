import { describe, expect, it } from 'vitest';
import { AppTask, Config, HistoryRecord, Intention } from '../types';
import { buildDedicationAreaWheel, buildIntentionAreaWheel, resolveTaskArea } from './areaWheel';

const config: Config = {
  userId: 'local_user',
  theme: 'muji',
  areas: {
    BODY: { color: 'emerald' },
    MIND: { color: 'teal' },
    FINANCE: { color: 'amber' },
    HOME: { color: 'slate' },
  },
  separators: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  cycleConfig: { trackingType: 'none' },
};

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task',
  userId: 'local_user',
  text: 'Tarea',
  type: 'Tarea',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const record = (id: string, taskId: string, date: string, duration: number): HistoryRecord => ({
  id,
  userId: 'local_user',
  taskId,
  date,
  createdAt: date,
  duration,
});

describe('area wheel selectors', () => {
  it('resolves project and routine descendants to their effective areas', () => {
    const tasks = [
      task({ id: 'project', text: 'Proyecto', type: 'Proyecto', category: 'BODY' }),
      task({ id: 'nested', text: 'Subtarea profunda', parentId: 'project' }),
      task({ id: 'routine', text: 'Rutina', type: 'Rutina', category: 'MIND' }),
      task({ id: 'habit', text: 'Hábito', type: 'Hábito', parentId: 'routine' }),
    ];

    expect(resolveTaskArea('nested', tasks)).toBe('BODY');
    expect(resolveTaskArea('habit', tasks)).toBe('MIND');
  });

  it('averages heterogeneous commitments and reports unassigned items', () => {
    const tasks = [
      task({ id: 'project', text: 'Proyecto', type: 'Proyecto', category: 'BODY' }),
      task({ id: 'completed', text: 'Completada', parentId: 'project', completed: true }),
      task({ id: 'open', text: 'Abierta', parentId: 'project' }),
      task({ id: 'habit', text: 'Lectura', type: 'Hábito', category: 'MIND' }),
    ];
    const intention: Intention = {
      id: 'intention',
      userId: 'local_user',
      scale: 'quarter',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      items: [
        { id: 'hours', targetType: 'hours', areaName: 'BODY', targetHours: 10 },
        { id: 'completion', targetType: 'completion', projectId: 'project' },
        { id: 'counter', targetType: 'counter', taskId: 'habit', currentCount: 4, targetCount: 10, unitLabel: 'páginas' },
        { id: 'unassigned', targetType: 'hours', areaName: 'OTHER', targetHours: 2 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const result = buildIntentionAreaWheel(
      config,
      intention,
      tasks,
      [record('session', 'open', '2026-02-01T10:00:00.000Z', 4)],
      [intention],
    );

    expect(result.data.find(item => item.area === 'BODY')).toMatchObject({ score: 45, count: 2, hasData: true });
    expect(result.data.find(item => item.area === 'MIND')).toMatchObject({ score: 40, count: 1, hasData: true });
    expect(result.data.find(item => item.area === 'FINANCE')).toMatchObject({ score: 0, count: 0, hasData: false });
    expect(result.unassignedCount).toBe(1);
  });

  it('uses all positive history once and scales dedication relative to the busiest area', () => {
    const tasks = [
      task({ id: 'project', type: 'Proyecto', category: 'BODY' }),
      task({ id: 'child', parentId: 'project' }),
      task({ id: 'habit', type: 'Hábito', category: 'MIND' }),
      task({ id: 'finance', category: 'FINANCE' }),
    ];
    const result = buildDedicationAreaWheel(
      config,
      tasks,
      [
        record('body', 'child', '2026-02-01T10:00:00.000Z', 2),
        record('mind', 'habit', '2026-02-02T10:00:00.000Z', 1),
        record('finance', 'finance', '2026-02-03T10:00:00.000Z', 1),
        record('outside', 'finance', '2025-12-31T10:00:00.000Z', 20),
        record('empty', 'finance', '2026-02-04T10:00:00.000Z', 0),
        record('unknown', 'missing', '2026-02-05T10:00:00.000Z', 3),
      ],
      '2026-02-01',
      '2026-02-28',
    );

    expect(result.totalHours).toBe(7);
    expect(result.unassignedHours).toBe(3);
    expect(result.data.find(item => item.area === 'BODY')).toMatchObject({ score: 100, detailLabel: '28.6% del total · 1 registro' });
    expect(result.data.find(item => item.area === 'MIND')).toMatchObject({ score: 50, detailLabel: '14.3% del total · 1 registro' });
    expect(result.data.find(item => item.area === 'HOME')).toMatchObject({ score: 0, hasData: false });
  });
});
