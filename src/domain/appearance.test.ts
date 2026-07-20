import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import {
  canTrackTask,
  formatCompactCalendarDate,
  getChildHabitQuotaStatus,
  getChildHabitCycleCount,
  getCompactDateTone,
  getHabitTemporalIndicators,
  getItemTemporalIndicators,
  getMinimumRoutineOpportunityCount,
  getProjectDateSummary,
  getRoutineCycleProgressFromHistory,
  getRoutineOpportunityDates,
  getRoutineTemporalIndicators,
  getStandaloneQuotaCount,
  getTaskDateSummary,
  getTaskTemporalIndicators,
  getTodayPlacement,
  isAppearanceScheduledOnDate,
  isItemAppearingOnDate,
  isRoutineCycleClosed,
  limitCardMetadata,
  shouldShowHistoryRecordInTimeline,
  wasChildHabitCompletedInAppearance,
} from './appearance';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task_1', userId: 'local_user', text: 'Elemento', type: 'Tarea',
  createdAt: '2026-07-20T12:00:00.000Z', completed: false, ...overrides,
});

const record = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: `hist_${Math.random()}`, userId: 'local_user', taskId: 'task_1',
  date: '2026-07-20T12:00:00.000Z', createdAt: '2026-07-20T12:00:00.000Z',
  isCompletion: true, ...overrides,
});

describe('appearance schedules', () => {
  it('shows a repeated task only on its concrete appearance dates', () => {
    const repeated = task({ appearanceMode: 'interval', fechaAparicion: '2026-07-20', appearanceFrequency: 3, appearanceFrequencyUnit: 'días' });
    expect(isAppearanceScheduledOnDate(repeated, '2026-07-20')).toBe(true);
    expect(isAppearanceScheduledOnDate(repeated, '2026-07-21')).toBe(false);
    expect(isAppearanceScheduledOnDate(repeated, '2026-07-23')).toBe(true);
  });

  it('removes a standalone habit from Hoy after its daily completion', () => {
    const habit = task({ id: 'habit_1', type: 'Hábito', appearanceMode: 'interval', fechaAparicion: '2026-07-20' });
    const history = [record({ taskId: habit.id })];
    expect(isItemAppearingOnDate(habit, [], '2026-07-20')).toBe(true);
    expect(isItemAppearingOnDate(habit, history, '2026-07-20')).toBe(false);
  });

  it('supports flexible standalone quotas with at most one completion per day', () => {
    const habit = task({ id: 'habit_1', type: 'Hábito', appearanceMode: 'quota', fechaAparicion: '2026-07-01', quotaTarget: 3, quotaPeriodUnit: 'semanas' });
    const history = [
      record({ taskId: habit.id, date: '2026-07-20T09:00:00.000Z' }),
      record({ id: 'hist_duplicate', taskId: habit.id, date: '2026-07-20T18:00:00.000Z' }),
      record({ id: 'hist_second', taskId: habit.id, date: '2026-07-21T09:00:00.000Z' }),
    ];
    expect(getStandaloneQuotaCount(habit, history, '2026-07-22')).toBe(2);
    expect(isItemAppearingOnDate(habit, history, '2026-07-20')).toBe(false);
    expect(isItemAppearingOnDate(habit, history, '2026-07-22')).toBe(true);
  });

  it('classifies timed, flexible and between-appearance tasks in Hoy', () => {
    const timed = task({ id: 'timed', appearanceMode: 'persistent', fechaAparicion: '2026-07-20', hora: '09:00' });
    const flexible = task({ id: 'flexible', appearanceMode: 'persistent', fechaAparicion: '2026-07-20' });
    const between = task({ id: 'between', appearanceMode: 'interval', fechaAparicion: '2026-07-20', appearanceFrequency: 3, appearanceFrequencyUnit: 'días' });
    const all = [timed, flexible, between];
    expect(getTodayPlacement(timed, all, [], [], '2026-07-20')).toBe('timeline');
    expect(getTodayPlacement(flexible, all, [], [], '2026-07-20')).toBe('flexible');
    expect(getTodayPlacement(between, all, [], [], '2026-07-21')).toBe('backlog');
  });

  it('keeps persistent tasks in their timed or flexible lane until completion', () => {
    const timed = task({ id: 'persistent_timed', appearanceMode: 'persistent', fechaAparicion: '2026-07-20', hora: '08:00' });
    const flexible = task({ id: 'persistent_flexible', appearanceMode: 'persistent', fechaAparicion: '2026-07-20' });
    expect(getTodayPlacement(timed, [timed], [], [], '2026-07-19')).toBe('backlog');
    expect(getTodayPlacement(timed, [timed], [], [], '2026-08-02')).toBe('timeline');
    expect(getTodayPlacement(flexible, [flexible], [], [], '2026-08-02')).toBe('flexible');
    expect(getTodayPlacement({ ...timed, completed: true }, [timed], [], [], '2026-08-02')).toBeNull();
  });

  it('keeps pulse records visible as Timeline logs while blocking their tracker', () => {
    const pulse = task({ id: 'pulse_1', type: 'Pulso' });
    expect(shouldShowHistoryRecordInTimeline(record({ taskId: pulse.id }), [pulse])).toBe(true);
    expect(canTrackTask(pulse, [pulse], [])).toBe(false);
  });
});

describe('routine quotas', () => {
  const routine = task({
    id: 'routine_1', type: 'Rutina', appearanceMode: 'interval', fechaAparicion: '2026-07-20',
    appearanceFrequency: 3, appearanceFrequencyUnit: 'días',
    routineCycleFrequency: 1, routineCycleUnit: 'semanas',
  });
  const habitA = task({ id: 'habit_a', type: 'Hábito', parentId: routine.id, objetivoPorCiclo: 1 });
  const habitB = task({ id: 'habit_b', type: 'Hábito', parentId: routine.id, objetivoPorCiclo: 1 });
  const habitC = task({ id: 'habit_c', type: 'Hábito', parentId: routine.id, objetivoPorCiclo: 2 });
const completion = (taskId: string, appearance: string) => record({
    id: `${taskId}_${appearance}`, taskId, date: `${appearance}T12:00:00.000Z`,
    routineId: routine.id, routineCycleStart: '2026-07-20', routineAppearanceDate: appearance,
  });

  it('counts 1/1, 1/1 and 2/2 across two appearances', () => {
    const history = [
      completion(habitA.id, '2026-07-20'), completion(habitC.id, '2026-07-20'),
      completion(habitB.id, '2026-07-23'), completion(habitC.id, '2026-07-23'),
    ];
    expect(getChildHabitCycleCount(routine, habitC, history, '2026-07-23')).toBe(2);
    expect(getRoutineCycleProgressFromHistory(routine, [routine, habitA, habitB, habitC], history, '2026-07-23')).toBe(100);
  });

  it('does not count the same child twice in one routine appearance', () => {
    const history = [completion(habitC.id, '2026-07-20'), { ...completion(habitC.id, '2026-07-20'), id: 'duplicate' }];
    expect(getChildHabitCycleCount(routine, habitC, history, '2026-07-20')).toBe(1);
    expect(wasChildHabitCompletedInAppearance(routine, habitC, history, '2026-07-20')).toBe(true);
  });

  it('does not turn progress sessions or incomplete checklists into quota closures', () => {
    const checklistHabit = { ...habitA, checklist: [
      { id: 'step_1', text: 'Paso uno', done: true },
      { id: 'step_2', text: 'Paso dos', done: false },
    ] };
    const progressSession = completion(checklistHabit.id, '2026-07-20');
    progressSession.isCompletion = false;
    const unverifiedClosure = completion(checklistHabit.id, '2026-07-20');
    expect(getChildHabitCycleCount(routine, checklistHabit, [progressSession, unverifiedClosure], '2026-07-20')).toBe(0);
    expect(getChildHabitCycleCount(routine, checklistHabit, [
      { ...unverifiedClosure, completionPercent: 100 },
    ], '2026-07-20')).toBe(1);
  });

  it('blocks tracker for pulses and already-used child opportunities', () => {
    const pulse = task({ id: 'pulse_1', type: 'Pulso' });
    const history = [completion(habitC.id, '2026-07-20')];
    expect(canTrackTask(pulse, [pulse], [], '2026-07-20')).toBe(false);
    expect(canTrackTask(habitC, [routine, habitC], [], '2026-07-20')).toBe(true);
    expect(canTrackTask(habitC, [routine, habitC], history, '2026-07-20')).toBe(false);
    expect(canTrackTask(habitC, [routine, habitC], [], '2026-07-21')).toBe(false);
  });

  it('enumerates real opportunities and recognizes a manually closed cycle', () => {
    expect(getRoutineOpportunityDates(routine, '2026-07-20')).toEqual(['2026-07-20', '2026-07-23', '2026-07-26']);
    const snapshot: ProgressSnapshot = {
      id: 'snapshot_1', userId: 'local_user', kind: 'routine-cycle', taskId: routine.id,
      taskSnapshotText: routine.text, periodStart: '2026-07-20', periodEnd: '2026-07-26',
      progressPercent: 100, wasCompleted: true, createdAt: '2026-07-23T12:00:00.000Z',
    };
    expect(isRoutineCycleClosed(routine, [snapshot], '2026-07-23')).toBe(true);
  });

  it('uses the minimum capacity of upcoming variable monthly cycles', () => {
    const monthlyRoutine = task({
      id: 'routine_monthly', type: 'Rutina', appearanceMode: 'interval', fechaAparicion: '2026-01-01',
      appearanceFrequency: 3, appearanceFrequencyUnit: 'días', routineCycleFrequency: 1, routineCycleUnit: 'meses',
    });
    expect(getMinimumRoutineOpportunityCount(monthlyRoutine, '2026-01-01', 2)).toBe(9);
  });
});

describe('project date summaries', () => {
  it('derives start, last activity and next descendant appearance', () => {
    const project = task({ id: 'project_1', type: 'Proyecto', fechaLimite: '2026-08-01' });
    const child = task({ id: 'child_1', parentId: project.id, appearanceMode: 'persistent', fechaAparicion: '2026-07-25' });
    const grandchild = task({ id: 'child_2', parentId: child.id, appearanceMode: 'persistent', fechaAparicion: '2026-07-24' });
    const history = [record({ taskId: child.id, date: '2026-07-20T09:00:00.000Z', isCompletion: false })];
    const summary = getProjectDateSummary(project, [project, child, grandchild], history, '2026-07-21');
    expect(summary.startDate).toBe('2026-07-20');
    expect(summary.lastActivityDate).toBe('2026-07-20');
    expect(summary.nextTask?.id).toBe(grandchild.id);
    expect(summary.deadline).toBe('2026-08-01');
  });
});

describe('compact card dates and metadata', () => {
  it('derives task start and last activity from its own history', () => {
    const currentTask = task({ fechaInicio: '2026-01-01' });
    const history = [
      record({ taskId: currentTask.id, date: '2026-07-22T15:00:00.000Z', isCompletion: true }),
      record({ taskId: currentTask.id, date: '2026-07-20T09:00:00.000Z', isCompletion: false }),
    ];
    expect(getTaskDateSummary(currentTask, history)).toEqual({
      startDate: '2026-07-20',
      lastActivityDate: '2026-07-22',
    });
  });

  it('formats compact dates and applies urgency at the exact limits', () => {
    const today = '2026-07-20';
    expect(formatCompactCalendarDate('2026-07-20', today)).toBe('20 jul · hoy');
    expect(formatCompactCalendarDate('2026-07-24', today)).toBe('24 jul · 4d');
    expect(formatCompactCalendarDate('2026-07-18', today)).toBe('18 jul · venc. 2d');
    expect(getCompactDateTone('2026-07-24', today)).toBe('neutral');
    expect(getCompactDateTone('2026-07-23', today)).toBe('soon');
    expect(getCompactDateTone('2026-07-19', today)).toBe('overdue');
    expect(getCompactDateTone('2026-07-19', today, true)).toBe('neutral');
  });

  it('caps contextual card metadata at three meaningful values', () => {
    expect(limitCardMetadata(['hora', null, 'cuota', false, 'tiempo', 'extra'])).toEqual(['hora', 'cuota', 'tiempo']);
  });

  it('prioritizes activity, deadline and start with independent tones', () => {
    const currentTask = task({ appearanceMode: 'persistent', fechaAparicion: '2026-07-01', fechaLimite: '2026-07-23' });
    const history = [record({ taskId: currentTask.id, date: '2026-07-18T09:00:00.000Z', isCompletion: false })];
    expect(getTaskTemporalIndicators(currentTask, history, '2026-07-22')).toEqual([
      expect.objectContaining({ kind: 'activity', text: 'Últ. 4d', tone: 'red' }),
      expect.objectContaining({ kind: 'deadline', text: 'Lím. 1d', tone: 'amber' }),
      expect.objectContaining({ kind: 'start', text: 'Inicio 4d', tone: 'neutral' }),
    ]);
  });

  it('colors activity only after scheduled appearances have passed', () => {
    const persistent = task({ appearanceMode: 'persistent', fechaAparicion: '2026-07-01' });
    const interval = task({ appearanceMode: 'interval', fechaAparicion: '2026-07-01', appearanceFrequency: 3, appearanceFrequencyUnit: 'días' });
    const weekdays = task({ appearanceMode: 'weekdays', fechaAparicion: '2026-07-01', appearanceWeekdays: [1, 3, 5] });
    const log = [record({ date: '2026-07-20T09:00:00.000Z', isCompletion: false })];

    expect(getTaskTemporalIndicators(persistent, log, '2026-07-21')[0].tone).toBe('neutral');
    expect(getTaskTemporalIndicators(persistent, log, '2026-07-22')[0].tone).toBe('amber');
    expect(getTaskTemporalIndicators(persistent, log, '2026-07-23')[0].tone).toBe('orange');
    expect(getTaskTemporalIndicators(interval, log, '2026-07-22')[0].tone).toBe('neutral');
    expect(getTaskTemporalIndicators(interval, log, '2026-07-23')[0].tone).toBe('amber');
    expect(getTaskTemporalIndicators(weekdays, log, '2026-07-23')[0].tone).toBe('amber');
    expect(getTaskTemporalIndicators(weekdays, log, '2026-07-24')[0].tone).toBe('orange');
    expect(getTaskTemporalIndicators(weekdays, log, '2026-07-25')[0].tone).toBe('red');
  });

  it('uses daily inactivity for an active persistent task even when its anchor is newer than its last session', () => {
    const persistent = task({ appearanceMode: 'persistent', fechaAparicion: '2026-07-22' });
    const log = [record({ date: '2026-07-20T09:00:00.000Z', isCompletion: false })];
    expect(getTaskTemporalIndicators(persistent, log, '2026-07-22')[0]).toEqual(
      expect.objectContaining({ text: 'Últ. 2d', tone: 'amber' }),
    );
  });

  it('keeps activity neutral for tasks without a schedule and completed tasks', () => {
    const log = [record({ date: '2026-07-01T09:00:00.000Z', isCompletion: false })];
    expect(getTaskTemporalIndicators(task({}), log, '2026-07-20')[0].tone).toBe('neutral');
    expect(getTaskTemporalIndicators(task({ appearanceMode: 'persistent', fechaAparicion: '2026-07-01', completed: true }), log, '2026-07-20')[0].tone).toBe('neutral');
  });

  it('derives standalone habit activity from its own schedule', () => {
    const habit = task({ id: 'habit_1', type: 'Hábito', appearanceMode: 'interval', fechaAparicion: '2026-07-01', appearanceFrequency: 1, appearanceFrequencyUnit: 'días' });
    const log = [record({ taskId: habit.id, date: '2026-07-20T09:00:00.000Z', isCompletion: true })];
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-07-22')[0]).toEqual(
      expect.objectContaining({ text: 'Últ. 2d', tone: 'amber' }),
    );
  });

  it('keeps child activity neutral and places feasibility color on its quota', () => {
    const routine = task({
      id: 'routine_risk', type: 'Rutina', appearanceMode: 'interval', fechaAparicion: '2026-07-20',
      appearanceFrequency: 3, appearanceFrequencyUnit: 'días', routineCycleFrequency: 1, routineCycleUnit: 'semanas',
    });
    const habit = task({ id: 'habit_risk', type: 'Hábito', parentId: routine.id, objetivoPorCiclo: 2 });
    const progress = [record({ taskId: habit.id, date: '2026-07-20T09:00:00.000Z', isCompletion: false })];
    expect(getHabitTemporalIndicators(habit, [routine, habit], progress, '2026-07-24')[0].tone).toBe('neutral');
    expect(getChildHabitQuotaStatus(routine, habit, progress, '2026-07-23').tone).toBe('amber');
    expect(getChildHabitQuotaStatus(routine, habit, progress, '2026-07-24').tone).toBe('red');
  });

  it('derives routine activity from child history without exposing start', () => {
    const routine = task({
      id: 'routine_dates', type: 'Rutina', appearanceMode: 'interval', fechaAparicion: '2026-07-20',
      appearanceFrequency: 3, appearanceFrequencyUnit: 'días', routineCycleFrequency: 1, routineCycleUnit: 'semanas',
    });
    const habit = task({ id: 'habit_dates', type: 'Hábito', parentId: routine.id });
    const log = [record({ taskId: habit.id, date: '2026-07-20T09:00:00.000Z' })];
    expect(getRoutineTemporalIndicators(routine, [routine, habit], log, '2026-07-24')).toEqual([
      expect.objectContaining({ kind: 'activity', text: 'Últ. 4d', tone: 'amber' }),
    ]);
    expect(getHabitTemporalIndicators(habit, [routine, habit], log, '2026-07-24').some(indicator => indicator.kind === 'start')).toBe(false);
  });

  it('advances monthly activity color by overdue days while keeping elapsed text in days', () => {
    const habit = task({
      id: 'monthly_habit', type: 'Hábito', appearanceMode: 'interval', fechaAparicion: '2026-01-01',
      appearanceFrequency: 1, appearanceFrequencyUnit: 'meses',
    });
    const log = [record({ taskId: habit.id, date: '2026-01-01T09:00:00.000Z' })];
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-02-02')[0]).toEqual(expect.objectContaining({ text: 'Últ. 32d', tone: 'amber' }));
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-02-03')[0].tone).toBe('orange');
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-02-04')[0].tone).toBe('red');
  });

  it('keeps a reached flexible quota neutral and restarts urgency in the next period', () => {
    const habit = task({ id: 'quota_habit', type: 'Hábito', appearanceMode: 'quota', fechaAparicion: '2026-07-01', quotaTarget: 1, quotaPeriodUnit: 'semanas' });
    const log = [record({ taskId: habit.id, date: '2026-07-20T09:00:00.000Z', isCompletion: true })];
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-07-24')[0].tone).toBe('neutral');
    expect(getHabitTemporalIndicators(habit, [habit], log, '2026-07-28')[0]).toEqual(expect.objectContaining({ text: 'Últ. 8d', tone: 'amber' }));
  });

  it('uses the universal presenter for project start and deadline without a next-task indicator', () => {
    const project = task({ id: 'project_temporal', type: 'Proyecto', fechaLimite: '2026-07-25' });
    const child = task({ id: 'project_child', parentId: project.id });
    const log = [record({ taskId: child.id, date: '2026-07-20T09:00:00.000Z', isCompletion: false })];
    expect(getItemTemporalIndicators(project, [project, child], log, '2026-07-22')).toEqual([
      expect.objectContaining({ kind: 'start', text: 'Inicio 2d', tone: 'neutral' }),
      expect.objectContaining({ kind: 'deadline', text: 'Lím. 3d', tone: 'amber' }),
    ]);
  });
});

describe('unstarted temporal state', () => {
  it('labels active leaf items without lifetime history', () => {
    const currentTask = task({ id: 'new_task' });
    const habit = task({ id: 'new_habit', type: 'Hábito' });
    const routine = task({ id: 'new_routine', type: 'Rutina' });
    const project = task({ id: 'new_project', type: 'Proyecto' });
    const pulse = task({ id: 'new_pulse', type: 'Pulso' });
    expect(getItemTemporalIndicators(currentTask, [currentTask], [])[0]).toEqual(expect.objectContaining({ kind: 'unstarted', text: 'Sin iniciar', tone: 'neutral' }));
    expect(getItemTemporalIndicators(habit, [habit], [])[0]).toEqual(expect.objectContaining({ kind: 'unstarted', text: 'Sin iniciar' }));
    expect(getItemTemporalIndicators(routine, [routine], [])[0]).toEqual(expect.objectContaining({ kind: 'unstarted', text: 'Sin iniciar' }));
    expect(getItemTemporalIndicators(project, [project], [])[0]).toEqual(expect.objectContaining({ kind: 'unstarted', text: 'Sin iniciar' }));
    expect(getItemTemporalIndicators(pulse, [pulse], [])[0]).toEqual(expect.objectContaining({ kind: 'unstarted', text: 'Sin registros' }));
  });

  it('removes the state permanently after the first own record', () => {
    const habit = task({ id: 'started_habit', type: 'Hábito', appearanceMode: 'quota', quotaTarget: 2, quotaPeriodUnit: 'semanas' });
    const log = [record({ taskId: habit.id, date: '2026-01-10T09:00:00.000Z' })];
    expect(getItemTemporalIndicators(habit, [habit], log, '2026-07-20').some(indicator => indicator.kind === 'unstarted')).toBe(false);
  });

  it('starts routines from child history and projects from deep descendant history', () => {
    const routine = task({ id: 'new_routine', type: 'Rutina' });
    const childHabit = task({ id: 'routine_child', type: 'Hábito', parentId: routine.id });
    const project = task({ id: 'new_project', type: 'Proyecto' });
    const childTask = task({ id: 'project_child', parentId: project.id });
    const grandchild = task({ id: 'project_grandchild', parentId: childTask.id });
    const logs = [
      record({ taskId: childHabit.id, date: '2026-07-20T09:00:00.000Z' }),
      record({ taskId: grandchild.id, date: '2026-07-20T10:00:00.000Z' }),
    ];
    expect(getItemTemporalIndicators(routine, [routine, childHabit], logs).some(indicator => indicator.kind === 'unstarted')).toBe(false);
    expect(getItemTemporalIndicators(project, [project, childTask, grandchild], logs).some(indicator => indicator.kind === 'unstarted')).toBe(false);
  });

  it('does not start a child habit from its routine or a sibling', () => {
    const routine = task({ id: 'routine_parent', type: 'Rutina' });
    const untouched = task({ id: 'untouched_habit', type: 'Hábito', parentId: routine.id });
    const sibling = task({ id: 'sibling_habit', type: 'Hábito', parentId: routine.id });
    const logs = [record({ taskId: sibling.id }), record({ id: 'routine_log', taskId: routine.id })];
    expect(getItemTemporalIndicators(untouched, [routine, untouched, sibling], logs)[0].kind).toBe('unstarted');
  });

  it('excludes completed legacy items without history', () => {
    const completed = task({ id: 'completed_without_log', completed: true, fechaLimite: '2026-08-01' });
    expect(getItemTemporalIndicators(completed, [completed], []).some(indicator => indicator.kind === 'unstarted')).toBe(false);
  });
});
