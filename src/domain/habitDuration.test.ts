import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  buildHabitDurationSummaryIndex,
  buildRoutineDurationSummaryIndex,
  getHabitDurationSummary,
  getRoutineDurationSummary,
} from './habitDuration';

const task = (overrides: Partial<AppTask> = {}): AppTask => ({
  id: 'habit',
  userId: 'local_user',
  text: 'Hábito',
  type: 'Hábito',
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  appearanceMode: 'interval',
  appearanceFrequency: 1,
  appearanceFrequencyUnit: 'semanas',
  fechaAparicion: '2026-07-20',
  duracion: 0.5,
  ...overrides,
});

const record = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: `history-${overrides.date}`,
  userId: 'local_user',
  taskId: 'habit',
  date: '2026-07-22T14:00:00.000Z',
  createdAt: '2026-07-22T14:00:00.000Z',
  duration: 0.25,
  isCompletion: false,
  ...overrides,
});

const snapshot = (overrides: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  id: `snapshot-${overrides.createdAt}`,
  userId: 'local_user',
  kind: 'habit-period',
  taskId: 'habit',
  taskSnapshotText: 'Hábito',
  periodStart: '2026-07-20',
  periodEnd: '2026-07-26',
  progressPercent: 100,
  resultStatus: 'complete',
  resolutionSource: 'manual',
  resolvedAt: '2026-07-22',
  createdAt: '2026-07-22T15:00:00.000Z',
  ...overrides,
});

describe('habit duration summaries', () => {
  it('groups progress and final tracker sessions into one completed execution', () => {
    const habit = task();
    const records = [
      record({ id: 'progress', date: '2026-07-22T14:00:00.000Z' }),
      record({
        id: 'completion',
        date: '2026-07-22T15:00:00.000Z',
        createdAt: '2026-07-22T15:00:00.000Z',
        isCompletion: true,
      }),
    ];

    const summary = getHabitDurationSummary(
      habit,
      [habit],
      records,
      [snapshot({})],
      '2026-07-22T18:00:00.000Z',
    );

    expect(summary).toEqual({
      currentActualHours: 0.5,
      estimatedHours: 0.5,
      completedCycleAverageHours: 0.5,
      completedCycleCount: 1,
    });
  });

  it('averages complete executions and excludes partial and open work', () => {
    const habit = task();
    const records = [
      record({ id: 'complete-a-progress', date: '2026-07-08T14:00:00.000Z', duration: 0.25 }),
      record({ id: 'complete-a', date: '2026-07-08T15:00:00.000Z', duration: 0.25, isCompletion: true }),
      record({ id: 'partial-progress', date: '2026-07-15T14:00:00.000Z', duration: 0.2 }),
      record({ id: 'complete-b-progress', date: '2026-07-22T13:00:00.000Z', duration: 0.75 }),
      record({ id: 'complete-b', date: '2026-07-22T15:00:00.000Z', duration: 0.25, isCompletion: true }),
      record({ id: 'open', date: '2026-07-23T15:00:00.000Z', duration: 0.1 }),
    ];
    const snapshots = [
      snapshot({
        id: 'complete-a-snapshot',
        periodStart: '2026-07-06',
        periodEnd: '2026-07-12',
        resolvedAt: '2026-07-08',
        createdAt: '2026-07-08T15:00:00.000Z',
      }),
      snapshot({
        id: 'partial-snapshot',
        periodStart: '2026-07-13',
        periodEnd: '2026-07-19',
        resolvedAt: '2026-07-19',
        createdAt: '2026-07-19T23:59:59',
        progressPercent: 40,
        resultStatus: 'partial',
        resolutionSource: 'period-end',
      }),
      snapshot({ id: 'complete-b-snapshot' }),
    ];

    const summary = getHabitDurationSummary(
      habit,
      [habit],
      records,
      snapshots,
      '2026-07-23T18:00:00.000Z',
    );

    expect(summary.currentActualHours).toBe(0.1);
    expect(summary.completedCycleAverageHours).toBe(0.75);
    expect(summary.completedCycleCount).toBe(2);
  });

  it('keeps one estimate for a child habit with a multi-execution target', () => {
    const routine = task({
      id: 'routine',
      text: 'Rutina',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'meses',
    });
    const habit = task({ parentId: routine.id, objetivoPorCiclo: 3 });
    const summary = getHabitDurationSummary(habit, [routine, habit], [], [], '2026-07-22');

    expect(summary.estimatedHours).toBe(0.5);
  });

  it('keeps the latest child execution until the next routine opportunity, then resets it', () => {
    const routine = task({
      id: 'routine',
      text: 'Rutina',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'meses',
    });
    const habit = task({ parentId: routine.id, objetivoPorCiclo: 2 });
    const records = [
      record({ id: 'progress', date: '2026-07-22T14:00:00.000Z' }),
      record({ id: 'completion', date: '2026-07-22T15:00:00.000Z', isCompletion: true }),
    ];
    const snapshots = [snapshot({
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
    })];

    expect(getHabitDurationSummary(
      habit,
      [routine, habit],
      records,
      snapshots,
      '2026-07-23',
    ).currentActualHours).toBe(0.5);
    expect(getHabitDurationSummary(
      habit,
      [routine, habit],
      records,
      snapshots,
      '2026-07-27',
    ).currentActualHours).toBe(0);
  });

  it('uses stored closure boundaries even after the current schedule changes', () => {
    const rescheduledHabit = task({
      appearanceFrequency: 1,
      appearanceFrequencyUnit: 'días',
      fechaAparicion: '2026-07-25',
    });
    const records = [
      record({ id: 'legacy-progress', date: '2026-07-08T14:00:00.000Z', duration: 0.4 }),
      record({ id: 'legacy-completion', date: '2026-07-08T15:00:00.000Z', duration: 0.2, isCompletion: true }),
    ];
    const snapshots = [snapshot({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      resolvedAt: '2026-07-08',
      createdAt: '2026-07-08T15:00:00.000Z',
    })];

    const summary = getHabitDurationSummary(
      rescheduledHabit,
      [rescheduledHabit],
      records,
      snapshots,
      '2026-07-26',
    );

    expect(summary.completedCycleAverageHours).toBe(0.6);
  });

  it('does not duplicate an edited completion whose snapshot kept its original timestamp', () => {
    const habit = task();
    const records = [
      record({ id: 'edited-progress', date: '2026-07-10T14:00:00.000Z', duration: 0.25 }),
      record({
        id: 'edited-completion',
        date: '2026-07-10T15:00:00.000Z',
        createdAt: '2026-07-08T15:00:00.000Z',
        duration: 0.25,
        isCompletion: true,
      }),
    ];
    const snapshots = [snapshot({
      periodStart: '2026-07-06',
      periodEnd: '2026-07-12',
      resolvedAt: '2026-07-10',
      createdAt: '2026-07-08T15:00:00.000Z',
    })];

    const summary = getHabitDurationSummary(
      habit,
      [habit],
      records,
      snapshots,
      '2026-07-11',
    );

    expect(summary.completedCycleAverageHours).toBe(0.5);
    expect(summary.completedCycleCount).toBe(1);
  });

  it('sums current values, one estimate per child and child averages for a routine', () => {
    const first = task({ id: 'first', duracion: 0.5 });
    const second = task({ id: 'second', duracion: 0.33 });
    const summaries = new Map([
      ['first', {
        currentActualHours: 0.17,
        estimatedHours: 0.5,
        completedCycleAverageHours: 0.5,
        completedCycleCount: 2,
      }],
      ['second', {
        currentActualHours: 0.42,
        estimatedHours: 0.33,
        completedCycleAverageHours: 0.42,
        completedCycleCount: 1,
      }],
    ]);

    expect(getRoutineDurationSummary([first, second], summaries)).toEqual({
      currentActualHours: 0.59,
      estimatedHours: 0.83,
      combinedAverageHours: 0.92,
      contributingHabitCount: 2,
    });
  });

  it('builds one indexed summary for each habit', () => {
    const first = task({ id: 'first' });
    const second = task({ id: 'second' });
    const summaries = buildHabitDurationSummaryIndex([first, second], [], [], '2026-07-22');

    expect([...summaries.keys()]).toEqual(['first', 'second']);
  });

  it('builds routine summaries from the indexed child habits', () => {
    const routine = task({ id: 'routine', type: 'Rutina' });
    const habit = task({ id: 'child', parentId: routine.id });
    const habitSummaries = new Map([
      ['child', {
        currentActualHours: 0.25,
        estimatedHours: 0.5,
        completedCycleAverageHours: 0.4,
        completedCycleCount: 2,
      }],
    ]);

    expect(buildRoutineDurationSummaryIndex([routine, habit], habitSummaries).get(routine.id))
      .toEqual({
        currentActualHours: 0.25,
        estimatedHours: 0.5,
        combinedAverageHours: 0.4,
        contributingHabitCount: 1,
      });
  });
});
