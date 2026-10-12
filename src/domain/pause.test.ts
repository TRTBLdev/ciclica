import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import {
  getPauseRootTasks,
  isTaskDirectlyPaused,
  isTaskEffectivelyPaused,
  pauseTaskRecord,
  resumeTaskRecord,
  wasTaskPausedAtPeriodEnd,
} from './pause';

const task = (id: string, overrides: Partial<AppTask> = {}): AppTask => ({
  id,
  userId: 'user',
  text: id,
  type: 'Tarea',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('pause intervals', () => {
  it('detects direct and inherited pauses without changing descendants', () => {
    const project = task('project', { type: 'Proyecto' });
    const child = task('child', { parentId: project.id });
    const paused = pauseTaskRecord(project, '2026-01-10T12:00:00.000Z');

    expect(isTaskDirectlyPaused(paused, '2026-01-10T13:00:00.000Z')).toBe(true);
    expect(isTaskEffectivelyPaused(child, [paused, child], '2026-01-10T13:00:00.000Z')).toBe(true);
    expect(child.pauseIntervals).toBeUndefined();
    expect(getPauseRootTasks([paused, child], '2026-01-10T13:00:00.000Z').map(item => item.id)).toEqual(['project']);
  });

  it('preserves an individual child pause when the parent resumes', () => {
    const project = task('project', { type: 'Proyecto' });
    const child = pauseTaskRecord(task('child', { parentId: project.id }), '2026-01-10T12:00:00.000Z');
    const pausedProject = pauseTaskRecord(project, '2026-01-11T12:00:00.000Z');
    const resumedProject = resumeTaskRecord(pausedProject, '2026-01-12T12:00:00.000Z');
    const tasks = [resumedProject, child];

    expect(isTaskEffectivelyPaused(child, tasks, '2026-01-13T12:00:00.000Z')).toBe(true);
    expect(isTaskEffectivelyPaused(resumedProject, tasks, '2026-01-13T12:00:00.000Z')).toBe(false);
  });

  it('does not recreate a period as missed when the pause covered its closing day', () => {
    const habit = pauseTaskRecord(task('habit', { type: 'Hábito' }), '2026-01-10T12:00:00.000Z');
    const resumed = resumeTaskRecord(habit, '2026-01-12T12:00:00.000Z');

    expect(wasTaskPausedAtPeriodEnd(habit, [habit], '2026-01-11')).toBe(true);
    expect(wasTaskPausedAtPeriodEnd(resumed, [resumed], '2026-01-11')).toBe(true);
    expect(wasTaskPausedAtPeriodEnd(resumed, [resumed], '2026-01-12')).toBe(false);
  });

  it('is idempotent and ignores malformed parent cycles', () => {
    const a = task('a', { parentId: 'b' });
    const b = task('b', { parentId: 'a' });
    const paused = pauseTaskRecord(a, '2026-01-10T12:00:00.000Z');

    expect(pauseTaskRecord(paused, '2026-01-10T13:00:00.000Z')).toBe(paused);
    expect(isTaskEffectivelyPaused(b, [paused, b], '2026-01-10T13:00:00.000Z')).toBe(true);
    expect(resumeTaskRecord(paused, '2026-01-10T11:00:00.000Z')).toBe(paused);
  });
});
