import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  applyRecurringHistoryContext,
  reconcileSnapshotsAfterHistoryDelete,
  reconcileSnapshotsAfterHistoryEdit,
  sanitizeOrphanedSnapshots,
} from './historyEditing';

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
    id: 'habit-result',
    userId: 'user',
    kind: 'habit-period',
    taskId: habit.id,
    taskSnapshotText: habit.text,
    periodStart: '2026-07-20',
    periodEnd: '2026-07-26',
    resolvedAt: '2026-07-20',
    progressPercent: 100,
    resultStatus: 'complete',
    resolutionSource: 'manual',
    wasCompleted: true,
    createdAt: original.createdAt,
  },
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
    expect(reconciled.find(snapshot => snapshot.id === 'old-cycle')?.resultStatus).toBe('missed');
    expect(reconciled.find(snapshot => snapshot.id === 'new-cycle')?.progressPercent).toBe(100);
    expect(reconciled.find(snapshot => snapshot.id === 'new-cycle')?.resultStatus).toBe('complete');
    expect(reconciled.find(snapshot => snapshot.taskId === habit.id)?.resolvedAt).toBe('2026-07-28');
    expect(reconciled.find(snapshot => snapshot.taskId === habit.id)?.periodStart).toBe('2026-07-27');
    expect(routine.appearanceWeekdays).toEqual([1]);
  });

  it('removes manual habit snapshot and recalibrates parent routine cycle upon history deletion', () => {
    const reconciled = reconcileSnapshotsAfterHistoryDelete(
      snapshots,
      [routine, habit],
      [], // No history left after deletion
      original,
    );

    // Habit manual snapshot should be gone
    expect(reconciled.some(s => s.taskId === habit.id)).toBe(false);
    // Routine cycle should be updated to 0% progress / missed
    const routineSnapshot = reconciled.find(s => s.id === 'old-cycle');
    expect(routineSnapshot?.progressPercent).toBe(0);
    expect(routineSnapshot?.resultStatus).toBe('missed');
    expect(routineSnapshot?.wasCompleted).toBe(false);
  });

  it('removes standalone habit snapshot upon history deletion', () => {
    const standaloneHabit: AppTask = {
      id: 'standalone-habit',
      userId: 'user',
      text: 'Meditación',
      type: 'Hábito',
      createdAt: '2026-07-01T00:00:00.000Z',
    };
    const habitRecord: HistoryRecord = {
      id: 'record-standalone',
      userId: 'user',
      taskId: standaloneHabit.id,
      date: '2026-07-20T10:00:00.000Z',
      createdAt: '2026-07-20T10:00:00.000Z',
      isCompletion: true,
      completionPercent: 100,
    };
    const habitSnapshot: ProgressSnapshot = {
      id: 'snap-standalone',
      userId: 'user',
      kind: 'habit-period',
      taskId: standaloneHabit.id,
      periodStart: '2026-07-20',
      periodEnd: '2026-07-20',
      resolvedAt: '2026-07-20',
      progressPercent: 100,
      resultStatus: 'complete',
      resolutionSource: 'manual',
      wasCompleted: true,
      createdAt: habitRecord.createdAt,
    };

    const reconciled = reconcileSnapshotsAfterHistoryDelete(
      [habitSnapshot],
      [standaloneHabit],
      [],
      habitRecord,
    );

    expect(reconciled).toEqual([]);
  });

  it('sanitizes orphaned manual snapshots while preserving legitimate ones', () => {
    const standaloneHabit: AppTask = {
      id: 'standalone-habit',
      userId: 'user',
      text: 'Meditación',
      type: 'Hábito',
      createdAt: '2026-07-01T00:00:00.000Z',
    };
    const orphanedManualSnapshot: ProgressSnapshot = {
      id: 'orphan-manual',
      userId: 'user',
      kind: 'habit-period',
      taskId: standaloneHabit.id,
      periodStart: '2026-07-20',
      periodEnd: '2026-07-20',
      resolvedAt: '2026-07-20',
      progressPercent: 100,
      resultStatus: 'complete',
      resolutionSource: 'manual',
      wasCompleted: true,
      createdAt: '2026-07-20T10:00:00.000Z',
    };
    const legitimatePeriodEndSnapshot: ProgressSnapshot = {
      id: 'legit-period-end',
      userId: 'user',
      kind: 'habit-period',
      taskId: standaloneHabit.id,
      periodStart: '2026-07-19',
      periodEnd: '2026-07-19',
      resolvedAt: '2026-07-19',
      progressPercent: 0,
      resultStatus: 'missed',
      resolutionSource: 'period-end',
      wasCompleted: false,
      createdAt: '2026-07-19T23:59:59.000Z',
    };

    // When history is empty, the manual one has no backing log and should be removed.
    // The period-end one should be preserved.
    const sanitized = sanitizeOrphanedSnapshots(
      [orphanedManualSnapshot, legitimatePeriodEndSnapshot],
      [standaloneHabit],
      [],
    );

    expect(sanitized).toEqual([legitimatePeriodEndSnapshot]);
  });
});

