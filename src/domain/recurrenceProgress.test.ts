import { describe, expect, it } from 'vitest';
import { AppTask, ProgressSnapshot } from '../types';
import {
  getCalendarCycleRange,
  getHabitCycleContribution,
  getNextScheduledDate,
  getRoutineAppearanceTarget,
  getRoutineCycleProgress,
  isTaskScheduledOnDate,
} from './recurrenceProgress';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task_1',
  userId: 'local_user',
  text: 'Elemento',
  type: 'Hábito',
  createdAt: '2026-01-01T00:00:00.000Z',
  completed: false,
  frecuencia: 1,
  frecuenciaUnidad: 'días',
  ...overrides,
});

const snapshot = (overrides: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  id: 'snap_1',
  userId: 'local_user',
  kind: 'habit-period',
  taskId: 'habit_1',
  taskSnapshotText: 'Hábito',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-14',
  progressPercent: 100,
  createdAt: '2026-07-14T10:00:00.000Z',
  ...overrides,
});

describe('calendar cycles', () => {
  it('uses calendar months, quarters, semesters and years', () => {
    expect(getCalendarCycleRange(1, 'meses', '2026-07-19')).toEqual({ start: '2026-07-01', end: '2026-07-31' });
    expect(getCalendarCycleRange(3, 'meses', '2026-05-10')).toEqual({ start: '2026-04-01', end: '2026-06-30' });
    expect(getCalendarCycleRange(6, 'meses', '2026-08-10')).toEqual({ start: '2026-07-01', end: '2026-12-31' });
    expect(getCalendarCycleRange(12, 'meses', '2026-08-10')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });

  it('keeps a monthly day-of-month anchor without drift', () => {
    const monthly = task({
      frecuenciaUnidad: 'meses',
      recurrenceAnchorDate: '2024-01-31',
      fechaPlanificada: '2024-01-31',
    });
    expect(getNextScheduledDate(monthly, '2024-01-31')).toBe('2024-02-29');
    expect(getNextScheduledDate(monthly, '2024-02-29')).toBe('2024-03-31');
  });
});

describe('routine appearances and progress', () => {
  const routine = task({
    id: 'routine_1',
    type: 'Rutina',
    frecuencia: 1,
    frecuenciaUnidad: 'semanas',
    recurrenceAnchorDate: '2026-07-02',
    appearanceWeekdays: [4],
    routineCycleFrequency: 1,
    routineCycleUnit: 'meses',
  });

  it('schedules weekly appearances on the selected weekday', () => {
    expect(isTaskScheduledOnDate(routine, '2026-07-09')).toBe(true);
    expect(isTaskScheduledOnDate(routine, '2026-07-10')).toBe(false);
  });

  it('caps a fifth weekly appearance at a 100 percent target', () => {
    expect(getRoutineAppearanceTarget(routine, '2026-07-02')).toBe(25);
    expect(getRoutineAppearanceTarget(routine, '2026-07-09')).toBe(50);
    expect(getRoutineAppearanceTarget(routine, '2026-07-30')).toBe(100);
  });

  it('keeps a completed biweekly occurrence when the next occurrence opens', () => {
    const habit = task({
      id: 'habit_1',
      parentId: routine.id,
      frecuencia: 2,
      frecuenciaUnidad: 'semanas',
      fechaPlanificada: '2026-07-15',
      checklist: [
        { id: 'a', text: 'A', done: true },
        { id: 'b', text: 'B', done: false },
      ],
    });
    const snapshots = [snapshot({ progressPercent: 100 })];
    const cycle = getCalendarCycleRange(1, 'meses', '2026-07-19');
    expect(getHabitCycleContribution(routine, habit, snapshots, cycle, '2026-07-19')).toBe(75);
    expect(getRoutineCycleProgress(routine, [routine, habit], snapshots, '2026-07-19')).toBe(75);
  });

  it('preserves partial checklist value from a closed occurrence', () => {
    const habit = task({
      id: 'habit_1',
      parentId: routine.id,
      frecuencia: 1,
      frecuenciaUnidad: 'meses',
      fechaPlanificada: '2026-08-01',
    });
    const snapshots = [snapshot({ progressPercent: 67 })];
    expect(getRoutineCycleProgress(routine, [routine, habit], snapshots, '2026-07-19')).toBe(67);
  });
});

