import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  getOmnibarSearchResults,
  getQuickTrackItems,
  getRecentTrackedTasks,
  getTrackableDescendants,
} from './omnibarSearch';

const task = (id: string, type: AppTask['type'], parentId?: string, completed = false, extra: Partial<AppTask> = {}): AppTask => ({
  id,
  userId: 'local_user',
  text: `Elemento ${id}`,
  type,
  parentId,
  completed,
  createdAt: '2026-07-24T12:00:00.000Z',
  ...extra,
});

describe('Omnibar search roles', () => {
  const project = task('project', 'Proyecto');
  const nested = task('nested', 'Tarea', project.id);
  const completed = task('completed', 'Tarea', project.id, true);
  const routine = task('routine', 'Rutina');
  const habit = task('habit', 'Hábito', routine.id);
  const pulse = task('pulse', 'Pulso');
  const tasks = [project, nested, completed, routine, habit, pulse];

  it('locates containers and pulses without treating them as trackable defaults', () => {
    expect(getOmnibarSearchResults(tasks, [], 'project').map(item => item.id)).toEqual(['project']);
    expect(getOmnibarSearchResults(tasks, [], 'routine').map(item => item.id)).toEqual(['routine']);
    expect(getOmnibarSearchResults(tasks, [], 'pulse').map(item => item.id)).toEqual(['pulse']);
    expect(getOmnibarSearchResults(tasks, [], '').map(item => item.id)).toEqual(['nested', 'habit']);
  });

  it('excludes completed items from search results when matching query', () => {
    expect(getOmnibarSearchResults(tasks, [], 'completed').map(item => item.id)).toEqual([]);
    expect(getOmnibarSearchResults(tasks, [], 'Elemento').map(item => item.id)).not.toContain('completed');
  });

  it('expands only currently trackable descendants', () => {
    expect(getTrackableDescendants(project.id, tasks, []).map(item => item.id)).toEqual(['nested']);
    expect(getTrackableDescendants(routine.id, tasks, []).map(item => item.id)).toEqual(['habit']);
  });

  it('returns pinned quickTrack items (including expandable projects) and top 3 recent tracked tasks', () => {
    const pinnedTask = task('pinned_task', 'Tarea', undefined, false, { quickTrack: true });
    const pinnedProject = task('pinned_proj', 'Proyecto', undefined, false, { quickTrack: true });
    const projChild = task('proj_child', 'Tarea', pinnedProject.id);
    const pausedPinned = task('paused_pin', 'Tarea', undefined, false, {
      quickTrack: true,
      pauseIntervals: [{ startedAt: '2026-07-01T00:00:00.000Z' }],
    });
    const recent1 = task('recent_1', 'Tarea');
    const recent2 = task('recent_2', 'Tarea');
    const recent3 = task('recent_3', 'Tarea');
    const recent4 = task('recent_4', 'Tarea');

    const all = [pinnedTask, pinnedProject, projChild, pausedPinned, recent1, recent2, recent3, recent4];
    const quick = getQuickTrackItems(all, [], '2026-07-24');
    expect(quick.map(item => item.id)).toEqual(['pinned_task', 'pinned_proj']);

    const hist: HistoryRecord[] = [
      { id: 'h0', userId: 'local_user', taskId: pinnedTask.id, date: '2026-07-24T16:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T16:00:00.000Z' },
      { id: 'h1', userId: 'local_user', taskId: recent1.id, date: '2026-07-24T15:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T15:00:00.000Z' },
      { id: 'h2', userId: 'local_user', taskId: recent2.id, date: '2026-07-24T14:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T14:00:00.000Z' },
      { id: 'h3', userId: 'local_user', taskId: recent1.id, date: '2026-07-24T13:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T13:00:00.000Z' },
      { id: 'h4', userId: 'local_user', taskId: recent3.id, date: '2026-07-24T12:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T12:00:00.000Z' },
      { id: 'h5', userId: 'local_user', taskId: recent4.id, date: '2026-07-24T11:00:00.000Z', duration: 0.5, createdAt: '2026-07-24T11:00:00.000Z' },
    ];
    const recents = getRecentTrackedTasks(all, hist, new Set(quick.map(item => item.id)), 3, '2026-07-24');
    expect(recents.map(item => item.id)).toEqual(['recent_1', 'recent_2', 'recent_3']);
  });
});
