import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { getPulseLogValue, getPulseOccurrenceCount, getPulseState, getRecentDates, hasPulseSafeDayConfirmation, getTaskTrackingSummary } from './trackingProgress';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task_1',
  userId: 'local_user',
  text: 'Elemento',
  type: 'Hábito',
  createdAt: '2026-01-01T00:00:00.000Z',
  completed: false,
  frecuencia: 1,
  frecuenciaUnidad: 'días',
  recurrenceAnchorDate: '2026-01-01',
  ...overrides,
});

const historyRecord = (date: string): HistoryRecord => ({
  id: `history_${date}`,
  userId: 'local_user',
  taskId: 'habit_1',
  date: `${date}T12:00:00.000Z`,
  createdAt: `${date}T12:00:00.000Z`,
  isCompletion: true,
});

describe('tracking progress', () => {
  it('uses today as the first day in the recent range', () => {
    expect(getRecentDates(3, '2026-07-19').map(date => date.toISOString().slice(0, 10))).toEqual([
      '2026-07-19', '2026-07-18', '2026-07-17',
    ]);
  });

  it('interprets reinforce and abandon pulse targets in opposite directions', () => {
    const reinforce = task({ type: 'Pulso', targetCount: 2, polaridad: 'Reforzar' });
    const abandon = task({ type: 'Pulso', targetCount: 2, polaridad: 'Abandonar' });

    expect([0, 1, 2, 3].map(count => getPulseState(reinforce, count))).toEqual([
      'absent', 'partial', 'complete', 'exceeded',
    ]);
    expect([0, 1, 2, 3].map(count => getPulseState(abandon, count))).toEqual([
      'unconfirmed', 'partial', 'failed', 'exceeded',
    ]);
    expect([0, 6, 7, 9].map(count => getPulseState({ ...abandon, targetCount: 7, polaridad: 'abandonar' as any }, count))).toEqual([
      'unconfirmed', 'partial', 'failed', 'exceeded',
    ]);
    expect(getPulseState(abandon, 0, true)).toBe('complete');
  });

  it('keeps safe-day confirmations out of pulse occurrence counts', () => {
    const history: HistoryRecord[] = [
      { id: 'occurrence', userId: 'local_user', taskId: 'pulse_1', date: '2026-07-19T10:00:00.000Z', createdAt: '2026-07-19T10:00:00.000Z' },
      { id: 'safe-day', userId: 'local_user', taskId: 'pulse_1', date: '2026-07-19T20:00:00.000Z', createdAt: '2026-07-19T20:00:00.000Z', pulseOutcome: 'safe-day' },
    ];

    expect(getPulseOccurrenceCount(history, 'pulse_1', '2026-07-19')).toBe(1);
    expect(hasPulseSafeDayConfirmation(history, 'pulse_1', '2026-07-19')).toBe(true);
  });

  it('describes pulse occurrences and safe days as distinct timeline events', () => {
    const pulse = task({ id: 'pulse_1', type: 'Pulso', unitLabel: 'vasos' });
    const occurrence: HistoryRecord = { id: 'one', userId: 'local_user', taskId: pulse.id, date: '2026-07-19T10:00:00.000Z', createdAt: '2026-07-19T10:00:00.000Z' };
    expect(getPulseLogValue(pulse, occurrence)).toBe('+1 vasos');
    expect(getPulseLogValue(pulse, { ...occurrence, pulseOutcome: 'safe-day' })).toBe('Día seguro');
  });

  it('reports annual habit compliance and the latest pending occurrence', () => {
    const habit = task({ id: 'habit_1' });
    const summary = getTaskTrackingSummary(
      habit,
      [historyRecord('2026-01-01'), historyRecord('2026-01-02')],
      [],
      '2026-01-03',
    );

    expect(summary).toMatchObject({
      compliancePercent: 67,
      dueCount: 3,
      lastActivityDate: '2026-01-02',
      pendingDate: '2026-01-03',
      nextDate: '2026-01-04',
    });
  });

  it('weights routine appearances with their stored progress', () => {
    const routine = task({
      id: 'routine_1',
      type: 'Rutina',
      frecuencia: 1,
      frecuenciaUnidad: 'semanas',
      recurrenceAnchorDate: '2026-01-01',
      appearanceWeekdays: [4],
      routineCycleFrequency: 1,
      routineCycleUnit: 'meses',
    });
    const snapshots: ProgressSnapshot[] = [
      { id: 'one', userId: 'local_user', kind: 'routine-appearance', taskId: routine.id, taskSnapshotText: routine.text, periodStart: '2026-01-01', periodEnd: '2026-01-01', targetPercent: 25, progressPercent: 25, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'two', userId: 'local_user', kind: 'routine-appearance', taskId: routine.id, taskSnapshotText: routine.text, periodStart: '2026-01-08', periodEnd: '2026-01-08', targetPercent: 50, progressPercent: 25, createdAt: '2026-01-08T00:00:00.000Z' },
    ];

    const summary = getTaskTrackingSummary(routine, [], snapshots, '2026-01-08');
    expect(summary).toMatchObject({ compliancePercent: 75, dueCount: 2, lastActivityDate: '2026-01-08', pendingDate: '2026-01-08' });
  });
});
