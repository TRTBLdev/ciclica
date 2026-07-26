import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { resolveHabitChecklistCycleUpdate } from './habitParentChange';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'habit',
  userId: 'local_user',
  text: 'Hábito',
  type: 'Hábito',
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  ...overrides,
});

describe('habit parent changes', () => {
  it('preserves checked items and rebases only their cycle key when moving routines', () => {
    const firstRoutine = task({
      id: 'routine-a',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'semanas',
    });
    const secondRoutine = task({
      id: 'routine-b',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'meses',
    });
    const habit = task({
      parentId: firstRoutine.id,
      checklistCycleStart: '2026-07-20',
      checklist: [{ id: 'step', text: 'Paso', done: true }],
      duracion: 0.5,
      objetivoPorCiclo: 2,
      notes: 'Conservar',
    });
    const updates = {
      parentId: secondRoutine.id,
      checklist: habit.checklist,
      duracion: habit.duracion,
      objetivoPorCiclo: habit.objetivoPorCiclo,
      notes: habit.notes,
    };

    expect(resolveHabitChecklistCycleUpdate(
      habit,
      updates,
      [firstRoutine, secondRoutine, habit],
      '2026-07-26',
    )).toEqual({
      ...updates,
      checklistCycleStart: '2026-07-01',
    });
  });

  it('clears the cycle key when the moved habit has no checked items', () => {
    const routine = task({
      id: 'routine',
      type: 'Rutina',
      routineCycleFrequency: 1,
      routineCycleUnit: 'semanas',
    });
    const habit = task({
      parentId: routine.id,
      checklistCycleStart: '2026-07-20',
      checklist: [{ id: 'step', text: 'Paso', done: false }],
    });

    expect(resolveHabitChecklistCycleUpdate(
      habit,
      { parentId: undefined, checklist: habit.checklist },
      [routine, habit],
      '2026-07-26',
    )).toMatchObject({
      parentId: undefined,
      checklistCycleStart: undefined,
    });
  });
});
