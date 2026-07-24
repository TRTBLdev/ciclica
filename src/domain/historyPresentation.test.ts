import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  DEFAULT_HISTORY_PERIOD,
  filterHistoryRecords,
  getHistoryContextTaskIds,
  getHistorySearchSuggestions,
  getRetrospectiveSessionTargets,
  getVisibleHistoryRecords,
  groupHistoryRecords,
  HISTORY_PAGE_SIZE,
} from './historyPresentation';

const task = (id: string, text: string, overrides: Partial<AppTask> = {}): AppTask => ({
  id,
  userId: 'local_user',
  text,
  type: 'Tarea',
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  ...overrides,
});

const record = (
  id: string,
  taskId: string,
  date: string,
  overrides: Partial<HistoryRecord> = {},
): HistoryRecord => ({
  id,
  userId: 'local_user',
  taskId,
  date,
  createdAt: date,
  duration: 0.5,
  ...overrides,
});

describe('history period and search presentation', () => {
  const now = new Date(2026, 6, 24, 12, 0, 0);
  const recentTask = task('recent', 'Informe reciente');
  const oldTask = task('old', 'Informe antiguo');
  const taskById = new Map([
    [recentTask.id, recentTask],
    [oldTask.id, oldTask],
  ]);
  const records = [
    record('recent-log', recentTask.id, new Date(2026, 6, 23, 10).toISOString()),
    record('old-log', oldTask.id, new Date(2026, 6, 10, 10).toISOString()),
  ];

  it('uses the last seven days as the initial period', () => {
    expect(DEFAULT_HISTORY_PERIOD).toBe('7dias');
  });

  it('keeps session search inside the selected period', () => {
    expect(filterHistoryRecords(records, taskById, '7dias', 'Informe', undefined, now))
      .toEqual([records[0]]);
    expect(filterHistoryRecords(records, taskById, '7dias', 'antiguo', undefined, now))
      .toEqual([]);
  });

  it('searches all records only when all history is selected', () => {
    expect(filterHistoryRecords(records, taskById, 'todas', 'antiguo', undefined, now))
      .toEqual([records[1]]);
  });

  it('finds deleted items through their stored snapshot within the period', () => {
    const deletedRecord = record(
      'deleted-log',
      'deleted-task',
      new Date(2026, 6, 24, 9).toISOString(),
      { taskSnapshotText: 'Elemento eliminado' },
    );

    expect(filterHistoryRecords([deletedRecord], new Map(), '7dias', 'eliminado', undefined, now))
      .toEqual([deletedRecord]);
  });

  it('combines a recursive project context with free title search and the active period', () => {
    const project = task('project', 'Proyecto editorial', { type: 'Proyecto' });
    const parent = task('parent', 'Preparar lanzamiento', { parentId: project.id });
    const child = task('child', 'Revisar portada', { parentId: parent.id });
    const tasks = [project, parent, child];
    const taskMap = new Map(tasks.map(item => [item.id, item]));
    const recentChild = record('child-log', child.id, new Date(2026, 6, 23, 10).toISOString());
    const recentOutside = record('outside-log', recentTask.id, new Date(2026, 6, 23, 10).toISOString());
    const oldChild = record('old-child-log', child.id, new Date(2026, 5, 1, 10).toISOString());
    const contextIds = getHistoryContextTaskIds(project.id, tasks);

    expect(filterHistoryRecords(
      [recentChild, recentOutside, oldChild],
      taskMap,
      '7dias',
      'portada',
      undefined,
      now,
      { kind: 'context', id: project.id, taskIds: contextIds },
    )).toEqual([recentChild]);
  });

  it('finds archived contexts once and filters their preserved records', () => {
    const archivedRecord = record(
      'archived-log',
      'deleted-task',
      new Date(2026, 6, 23, 10).toISOString(),
      {
        taskSnapshotText: 'Boceto',
        context: { id: 'deleted-project', type: 'Proyecto', text: 'Proyecto archivado' },
      },
    );
    const suggestions = getHistorySearchSuggestions(
      'archivado',
      [],
      [archivedRecord, { ...archivedRecord, id: 'archived-log-2' }],
    );

    expect(suggestions).toEqual([expect.objectContaining({
      id: 'deleted-project',
      kind: 'context',
      archived: true,
    })]);
    expect(filterHistoryRecords(
      [archivedRecord],
      new Map(),
      'todas',
      '',
      undefined,
      now,
      { kind: 'context', id: 'deleted-project' },
    )).toEqual([archivedRecord]);
  });

  it('offers completed tasks and habits for retrospective sessions but excludes containers and pulses', () => {
    const candidates = [
      task('completed-task', 'Trabajo terminado', { completed: true }),
      task('habit', 'Trabajo corporal', { type: 'Hábito', completed: true }),
      task('project', 'Trabajo proyecto', { type: 'Proyecto' }),
      task('routine', 'Trabajo rutina', { type: 'Rutina' }),
      task('pulse', 'Trabajo pulso', { type: 'Pulso' }),
    ];

    expect(getRetrospectiveSessionTargets(candidates, 'trabajo').map(item => item.id))
      .toEqual(['completed-task', 'habit']);
  });
});

describe('history grouping and progressive visibility', () => {
  it('preserves parent-child grouping while classifying each record once', () => {
    const parent = task('parent', 'Bloque');
    const child = task('child', 'Subtarea', { parentId: parent.id });
    const project = task('project', 'Proyecto', { type: 'Proyecto' });
    const projectTask = task('project-task', 'Tarea de proyecto', { parentId: project.id });
    const routine = task('routine', 'Rutina', { type: 'Rutina' });
    const habit = task('habit', 'Hábito', { type: 'Hábito', parentId: routine.id });
    const pulse = task('pulse', 'Pulso', { type: 'Pulso' });
    const taskById = new Map(
      [parent, child, project, projectTask, routine, habit, pulse].map(item => [item.id, item]),
    );
    const date = '2026-07-24T12:00:00.000Z';

    const groups = groupHistoryRecords([
      record('parent-log', parent.id, date),
      record('child-log', child.id, date),
      record('project-log', project.id, date),
      record('project-task-log', projectTask.id, date),
      record('routine-log', routine.id, date),
      record('habit-log', habit.id, date),
      record('pulse-log', pulse.id, date),
      record('safe-day', pulse.id, date, { pulseOutcome: 'safe-day' }),
    ], taskById);

    expect(groups.simple.map(item => item.id)).toEqual([
      'parent-log',
      'project-log',
      'project-task-log',
    ]);
    expect(groups.recurring.map(item => item.id)).toEqual(['routine-log']);
    expect(groups.pulses.map(item => item.id)).toEqual(['pulse-log']);
  });

  it('bounds a large all-history result without limiting shorter periods', () => {
    const largeHistory = Array.from(
      { length: 10_000 },
      (_, index) => record(`log-${index}`, 'task', '2026-07-24T12:00:00.000Z'),
    );

    expect(getVisibleHistoryRecords(largeHistory, 'todas', HISTORY_PAGE_SIZE)).toHaveLength(25);
    expect(getVisibleHistoryRecords(largeHistory, '7dias', HISTORY_PAGE_SIZE)).toHaveLength(10_000);
  });

  it('supports independent visible counts for each section', () => {
    const records = Array.from(
      { length: 100 },
      (_, index) => record(`log-${index}`, 'task', '2026-07-24T12:00:00.000Z'),
    );

    expect(getVisibleHistoryRecords(records, 'todas', 25)).toHaveLength(25);
    expect(getVisibleHistoryRecords(records, 'todas', 50)).toHaveLength(50);
  });

  it('keeps orphaned routine records in the recurring section through their snapshot', () => {
    const archivedHabit = record('archived-habit', 'deleted-habit', '2026-07-24T12:00:00.000Z', {
      context: { id: 'deleted-routine', type: 'Rutina', text: 'Rutina archivada' },
    });

    expect(groupHistoryRecords([archivedHabit], new Map()).recurring).toEqual([archivedHabit]);
  });
});
