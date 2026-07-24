import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { getOmnibarSearchResults, getTrackableDescendants } from './omnibarSearch';

const task = (id: string, type: AppTask['type'], parentId?: string, completed = false): AppTask => ({
  id,
  userId: 'local_user',
  text: `Elemento ${id}`,
  type,
  parentId,
  completed,
  createdAt: '2026-07-24T12:00:00.000Z',
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

  it('expands only currently trackable descendants', () => {
    expect(getTrackableDescendants(project.id, tasks, []).map(item => item.id)).toEqual(['nested']);
    expect(getTrackableDescendants(routine.id, tasks, []).map(item => item.id)).toEqual(['habit']);
  });
});
