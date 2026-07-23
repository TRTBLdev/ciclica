import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  canCloseProject,
  getInheritedProjectContext,
  getProjectPresentation,
  getProjectScheduleLabel,
  projectMatchesEnergyFilter,
} from './projectPresentation';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task',
  userId: 'local_user',
  text: 'Elemento',
  type: 'Tarea',
  createdAt: '2026-07-20T12:00:00.000Z',
  completed: false,
  ...overrides,
});

const record = (overrides: Partial<HistoryRecord>): HistoryRecord => ({
  id: 'record',
  userId: 'local_user',
  taskId: 'task',
  date: '2026-07-20T12:00:00.000Z',
  createdAt: '2026-07-20T12:00:00.000Z',
  ...overrides,
});

describe('project presentation', () => {
  it('aggregates deep task progress, estimates and energy without using project allocation', () => {
    const project = task({ id: 'project', type: 'Proyecto', allocationType: 'fixed' });
    const investment = task({
      id: 'investment',
      parentId: project.id,
      duracion: 2,
      allocationType: 'growth',
    });
    const support = task({
      id: 'support',
      parentId: investment.id,
      duracion: 1,
      allocationType: 'fixed',
    });
    const completed = task({
      id: 'completed',
      parentId: project.id,
      duracion: 3,
      allocationType: 'fixed',
      completed: true,
    });
    const tasks = [project, investment, support, completed];
    const presentation = getProjectPresentation(project, tasks, [
      record({ taskId: support.id, duration: 1.25 }),
    ]);

    expect(presentation.pendingCount).toBe(2);
    expect(presentation.completedCount).toBe(1);
    expect(presentation.progress).toBe(33);
    expect(presentation.openEstimate).toBe(3);
    expect(presentation.totalEstimate).toBe(6);
    expect(presentation.trackedHours).toBe(1.25);
    expect(presentation.energy).toEqual({
      support: 1,
      investment: 2,
      total: 3,
      allocation: 'mixed',
    });
    expect(projectMatchesEnergyFilter(project, tasks, 'mixed')).toBe(true);
    expect(projectMatchesEnergyFilter(project, tasks, 'fixed')).toBe(false);
    expect(getInheritedProjectContext(support, tasks)?.id).toBe(project.id);
    expect(canCloseProject(project.id, tasks)).toBe(false);
    expect(canCloseProject(project.id, tasks.map(item => ({ ...item, completed: item.type === 'Tarea' ? true : item.completed })))).toBe(true);
  });

  it('formats project schedules and exposes inherited context without changing child data', () => {
    const project = task({
      id: 'project',
      type: 'Proyecto',
      appearanceMode: 'weekdays',
      fechaAparicion: '2026-07-20',
      appearanceWeekdays: [1, 4],
      hora: '10:00',
      category: 'MIND',
      subCategory: 'DEEP WORK',
    });
    const child = task({
      id: 'child',
      parentId: project.id,
      hora: '16:00',
      category: 'HOME',
    });

    expect(getProjectScheduleLabel(project)).toBe('Lun · Jue');
    expect(getInheritedProjectContext(child, [project, child])?.id).toBe(project.id);
    expect(child.hora).toBe('16:00');
    expect(child.category).toBe('HOME');
  });

  it('shows the next scheduled appearance after activity on the current appearance', () => {
    const project = task({
      id: 'project',
      type: 'Proyecto',
      appearanceMode: 'weekdays',
      fechaAparicion: '2026-07-20',
      appearanceWeekdays: [1, 4],
    });
    const child = task({ id: 'child', parentId: project.id });
    const presentation = getProjectPresentation(
      project,
      [project, child],
      [record({ taskId: child.id, date: '2026-07-23T15:00:00.000Z', duration: 1 })],
      '2026-07-23',
    );

    expect(presentation.lastActivityDate).toBe('2026-07-23');
    expect(presentation.nextAppearanceDate).toBe('2026-07-27');
  });
});
