import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { applyRecurringHistoryContext, reconcileSnapshotsAfterHistoryEdit } from './historyEditing';

const routine: AppTask = {
  id: 'routine',
  userId: 'user',
  text: 'Rutina',
  type: 'Rutina',
  createdAt: '2026-07-01T00:00:00.000Z',
  appearanceMode: 'weekdays',
  fechaAparicion: '2026-07-01',
  appearanceWeekdays: [1],
  routineCycleFrequency: 1,
  routineCycleUnit: 'semanas',
};

const habit: AppTask = {
  id: 'habit',
  userId: 'user',
  text: 'Hábito',
  type: 'Hábito',
  parentId: routine.id,
  objetivoPorCiclo: 1,
  createdAt: '2026-07-01T00:00:00.000Z',
};

const original: HistoryRecord = {
  id: 'history',
  userId: 'user',
  taskId: habit.id,
  date: '2026-07-20T12:00:00.000Z',
  createdAt: '2026-07-20T12:00:00.000Z',
  duration: 0.5,
  isCompletion: true,
  completionPercent: 100,
  routineId: routine.id,
  routineCycleStart: '2026-07-20',
  routineAppearanceDate: '2026-07-20',
};

const snapshots: ProgressSnapshot[] = [
  {
    id: 'old-cycle',
    userId: 'user',
    kind: 'routine-cycle',
    taskId: routine.id,
    taskSnapshotText: routine.text,
    periodStart: '2026-07-20',
    periodEnd: '2026-07-26',
    progressPercent: 100,
    wasCompleted: true,
    createdAt: original.createdAt,
  },
  {
    id: 'new-cycle',
    userId: 'user',
    kind: 'routine-cycle',
    taskId: routine.id,
    taskSnapshotText: routine.text,
    periodStart: '2026-07-27',
    periodEnd: '2026-08-02',
    progressPercent: 0,
    wasCompleted: false,
    createdAt: original.createdAt,
  },
];

describe('history editing', () => {
  it('moves a recurring completion to its actual cycle without changing the schedule', () => {
    const moved = applyRecurringHistoryContext(
      { ...original, date: '2026-07-28T12:00:00.000Z' },
      habit,
      [routine, habit],
    );
    const reconciled = reconcileSnapshotsAfterHistoryEdit(
      snapshots,
      [routine, habit],
      [moved],
      original,
      moved,
    );

    expect(moved.completionPercent).toBe(100);
    expect(moved.routineAppearanceDate).toBe('2026-07-28');
    expect(moved.routineCycleStart).toBe('2026-07-27');
    expect(reconciled.find(snapshot => snapshot.id === 'old-cycle')?.progressPercent).toBe(0);
    expect(reconciled.find(snapshot => snapshot.id === 'new-cycle')?.progressPercent).toBe(100);
    expect(routine.appearanceWeekdays).toEqual([1]);
  });
});
