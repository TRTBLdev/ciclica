import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { getFrequencyInDays, rescheduleOverdueRecurringTasks } from './taskScheduling';

const baseTask = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task_1',
  userId: 'local_user',
  text: 'Recurring task',
  type: 'Hábito',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('getFrequencyInDays', () => {
  it('uses days as the default unit', () => {
    expect(getFrequencyInDays()).toBe(1);
    expect(getFrequencyInDays(3, 'días')).toBe(3);
  });

  it('converts weeks and months to days', () => {
    expect(getFrequencyInDays(2, 'semanas')).toBe(14);
    expect(getFrequencyInDays(2, 'meses')).toBe(60);
  });
});

describe('rescheduleOverdueRecurringTasks', () => {
  it('reschedules an overdue daily habit to the current active date', () => {
    const task = baseTask({
      fechaPlanificada: '2026-01-01T00:00:00.000Z',
      frecuencia: 1,
      frecuenciaUnidad: 'días',
    });

    const result = rescheduleOverdueRecurringTasks([task], new Date('2026-01-05T12:00:00.000Z'));

    expect(result.changed).toBe(true);
    expect(result.tasks[0].fechaPlanificada).toBe('2026-01-05T00:00:00.000Z');
    expect(result.tasks[0].completed).toBe(false);
  });

  it('does not change a recurring task that is not overdue', () => {
    const task = baseTask({
      fechaPlanificada: '2026-01-04T12:00:00.000Z',
      frecuencia: 1,
      frecuenciaUnidad: 'días',
    });

    const result = rescheduleOverdueRecurringTasks([task], new Date('2026-01-05T12:00:00.000Z'));

    expect(result.changed).toBe(false);
    expect(result.tasks[0]).toBe(task);
  });

  it('does not directly reschedule routines that have child habits', () => {
    const routine = baseTask({
      id: 'routine_1',
      type: 'Rutina',
      fechaPlanificada: '2026-01-01T00:00:00.000Z',
      frecuencia: 1,
      frecuenciaUnidad: 'días',
    });
    const childHabit = baseTask({
      id: 'habit_1',
      parentId: 'routine_1',
      fechaPlanificada: '2026-01-04T00:00:00.000Z',
      frecuencia: 1,
      frecuenciaUnidad: 'días',
    });

    const result = rescheduleOverdueRecurringTasks([routine, childHabit], new Date('2026-01-04T12:00:00.000Z'));

    expect(result.changed).toBe(false);
    expect(result.tasks[0]).toBe(routine);
  });

  it('reschedules weekly habits using the configured frequency', () => {
    const task = baseTask({
      fechaPlanificada: '2026-01-01T00:00:00.000Z',
      frecuencia: 1,
      frecuenciaUnidad: 'semanas',
    });

    const result = rescheduleOverdueRecurringTasks([task], new Date('2026-01-20T12:00:00.000Z'));

    expect(result.changed).toBe(true);
    expect(result.tasks[0].fechaPlanificada).toBe('2026-01-15T00:00:00.000Z');
  });
});
