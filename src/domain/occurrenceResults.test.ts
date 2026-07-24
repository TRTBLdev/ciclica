import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  createHabitResultSnapshot,
  getAutomaticHabitProgress,
  getExpiredHabitOccurrenceRanges,
  getHabitOccurrenceRange,
  getRoutineCycleProgress,
  isSameRecurringClosureSlot,
  isRoutineReadyToClose,
} from './occurrenceResults';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'habit',
  userId: 'local_user',
  text: 'Hábito',
  type: 'Hábito',
  completed: false,
  createdAt: '2026-07-01T09:00:00',
  ...overrides,
});

const record = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: `record_${Math.random()}`,
  userId: 'local_user',
  taskId: 'habit',
  date: '2026-07-20T09:00:00',
  createdAt: '2026-07-20T09:00:00',
  ...overrides,
});

describe('recurring occurrence results', () => {
  it('keeps a weekly occurrence open until the next scheduled date', () => {
    const habit = task({
      appearanceMode: 'weekdays',
      fechaAparicion: '2026-07-20',
      appearanceFrequency: 1,
      appearanceWeekdays: [1],
    });
    expect(getHabitOccurrenceRange(habit, [habit], '2026-07-22')).toEqual({
      start: '2026-07-20',
      end: '2026-07-26',
    });
  });

  it('keeps monthly, quarterly and semiannual periods on local calendar dates', () => {
    const monthly = task({
      appearanceMode: 'interval',
      fechaAparicion: '2026-01-31',
      appearanceFrequencyUnit: 'meses',
    });
    expect(getHabitOccurrenceRange(monthly, [monthly], '2026-02-15')).toEqual({
      start: '2026-01-31',
      end: '2026-02-27',
    });

    const quarterly = { ...monthly, appearanceFrequency: 3 };
    expect(getHabitOccurrenceRange(quarterly, [quarterly], '2026-04-12')).toEqual({
      start: '2026-01-31',
      end: '2026-04-29',
    });

    const semiannual = { ...monthly, appearanceFrequency: 6 };
    expect(getHabitOccurrenceRange(semiannual, [semiannual], '2026-06-30')).toEqual({
      start: '2026-01-31',
      end: '2026-07-30',
    });
  });

  it('uses checklist progress before tracked time', () => {
    const habit = task({
      duracion: 2,
      checklist: [
        { id: 'one', text: 'Uno', done: true },
        { id: 'two', text: 'Dos', done: false },
      ],
    });
    const history = [record({ duration: 2, isCompletion: false })];
    expect(getAutomaticHabitProgress(habit, history, { start: '2026-07-20', end: '2026-07-20' })).toBe(50);
  });

  it('uses estimated time only when there is no checklist', () => {
    const habit = task({ duracion: 2 });
    const history = [record({ duration: 1, isCompletion: false })];
    expect(getAutomaticHabitProgress(habit, history, { start: '2026-07-20', end: '2026-07-20' })).toBe(50);
    expect(getAutomaticHabitProgress({ ...habit, duracion: undefined }, history, { start: '2026-07-20', end: '2026-07-20' })).toBe(0);
  });

  it('uses only activity after the latest closure in an occurrence', () => {
    const habit = task({ duracion: 2 });
    const history = [
      record({ id: 'before', date: '2026-07-20T08:00:00', duration: 2, isCompletion: false }),
      record({ id: 'closure', date: '2026-07-20T09:00:00', duration: 0, isCompletion: true }),
      record({ id: 'after', date: '2026-07-20T10:00:00', duration: 0.5, isCompletion: false }),
    ];
    expect(getAutomaticHabitProgress(habit, history, { start: '2026-07-20', end: '2026-07-20' })).toBe(25);
  });

  it('classifies manual zero as partial and automatic zero as missed', () => {
    const habit = task({});
    expect(createHabitResultSnapshot(habit, { start: '2026-07-20', end: '2026-07-20' }, 0, '2026-07-20', 'manual').resultStatus).toBe('partial');
    expect(createHabitResultSnapshot(habit, { start: '2026-07-20', end: '2026-07-20' }, 0, '2026-07-20', 'period-end').resultStatus).toBe('missed');
  });

  it('weights partial appearances while keeping equal habit weights', () => {
    const routine = task({
      id: 'routine',
      text: 'Rutina',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'semanas',
    });
    const first = task({ id: 'first', parentId: routine.id, objetivoPorCiclo: 1 });
    const second = task({ id: 'second', parentId: routine.id, objetivoPorCiclo: 2 });
    const snapshots: ProgressSnapshot[] = [
      { ...createHabitResultSnapshot(first, { start: '2026-07-20', end: '2026-07-26' }, 100, '2026-07-20', 'manual'), id: 'first' },
      { ...createHabitResultSnapshot(second, { start: '2026-07-20', end: '2026-07-26' }, 100, '2026-07-20', 'manual'), id: 'second_one' },
      { ...createHabitResultSnapshot(second, { start: '2026-07-20', end: '2026-07-26' }, 50, '2026-07-23', 'manual'), id: 'second_two' },
    ];
    expect(getRoutineCycleProgress(routine, [routine, first, second], [], snapshots, '2026-07-23')).toBe(88);
    expect(isRoutineReadyToClose(routine, [routine, first, second], [], snapshots, '2026-07-23')).toBe(true);
  });

  it('enumerates expired occurrences once so rollover can remain idempotent', () => {
    const habit = task({
      appearanceMode: 'interval',
      fechaAparicion: '2026-07-20',
      appearanceFrequency: 2,
      appearanceFrequencyUnit: 'días',
    });
    expect(getExpiredHabitOccurrenceRanges(habit, [habit], '2026-07-23')).toEqual([
      { start: '2026-07-20', end: '2026-07-21' },
      { start: '2026-07-22', end: '2026-07-23' },
    ]);
  });

  it('detects duplicate closure slots without blocking flexible cycle quotas', () => {
    const weekly = task({
      appearanceMode: 'weekdays',
      fechaAparicion: '2026-07-20',
      appearanceWeekdays: [1],
    });
    expect(isSameRecurringClosureSlot(weekly, [weekly], '2026-07-20', '2026-07-24')).toBe(true);
    expect(isSameRecurringClosureSlot(weekly, [weekly], '2026-07-20', '2026-07-27')).toBe(false);

    const quota = task({ appearanceMode: 'quota', quotaTarget: 3 });
    expect(isSameRecurringClosureSlot(quota, [quota], '2026-07-20', '2026-07-21')).toBe(false);
    expect(isSameRecurringClosureSlot(quota, [quota], '2026-07-20', '2026-07-20')).toBe(true);
  });
});
