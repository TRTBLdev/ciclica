import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { duplicateTaskTree } from './taskDuplication';

const baseTask = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task-source',
  userId: 'user-1',
  text: 'Elemento original',
  type: 'Tarea',
  createdAt: '2026-10-01T10:00:00.000Z',
  completed: true,
  notes: 'Notas',
  checklist: [{ id: 'step-source', text: 'Paso', done: true }],
  fechaAparicion: '2026-10-01',
  fechaLimite: '2026-10-30',
  recurrenceAnchorDate: '2026-10-01',
  hora: '09:00',
  currentCount: 4,
  lastExecutedAt: '2026-10-10T10:00:00.000Z',
  ...overrides,
});

function ids() {
  let taskIndex = 0;
  let checklistIndex = 0;
  return {
    createTaskId: () => `new-task-${++taskIndex}`,
    createChecklistId: () => `new-step-${++checklistIndex}`,
  };
}

describe('duplicateTaskTree', () => {
  it('copies configuration and notes while resetting operational state and dates', () => {
    const source = baseTask({ order: 10, appearanceFrequency: 2, appearanceFrequencyUnit: 'semanas' });
    const [copy] = duplicateTaskTree(source.id, [source], { now: '2026-10-11T12:00:00.000Z', ...ids() });

    expect(copy).toMatchObject({
      id: 'new-task-1',
      text: 'Elemento original (copia)',
      notes: 'Notas',
      completed: false,
      currentCount: 0,
      appearanceFrequency: 2,
      appearanceFrequencyUnit: 'semanas',
      createdAt: '2026-10-11T12:00:00.000Z',
    });
    expect(copy).not.toHaveProperty('fechaAparicion');
    expect(copy).not.toHaveProperty('fechaLimite');
    expect(copy).not.toHaveProperty('recurrenceAnchorDate');
    expect(copy).not.toHaveProperty('hora');
    expect(copy.lastExecutedAt).toBeUndefined();
    expect(copy.checklist).toEqual([{ id: 'new-step-1', text: 'Paso', done: false }]);
    expect(source).toHaveProperty('fechaAparicion', '2026-10-01');
    expect(source.checklist?.[0]).toEqual({ id: 'step-source', text: 'Paso', done: true });
  });

  it('clones a project subtree and remaps parents and internal dependencies', () => {
    const project = baseTask({ id: 'project', text: 'Proyecto', type: 'Proyecto', order: 10, checklist: undefined });
    const task = baseTask({ id: 'child', text: 'Tarea', parentId: 'project', dependencyId: 'nested', order: 20 });
    const nested = baseTask({ id: 'nested', text: 'Subtarea', parentId: 'project', order: 30 });
    const external = baseTask({ id: 'external', text: 'Externa' });
    const copy = duplicateTaskTree('project', [project, task, nested, external], { ...ids() });

    expect(copy).toHaveLength(3);
    expect(copy[0]).toMatchObject({ id: 'new-task-1', text: 'Proyecto (copia)', order: 1010 });
    expect(copy[1]).toMatchObject({ id: 'new-task-2', parentId: 'new-task-1', dependencyId: 'new-task-3' });
    expect(copy[2]).toMatchObject({ id: 'new-task-3', parentId: 'new-task-1' });
    expect(copy.every(taskCopy => taskCopy.id !== taskCopy.parentId)).toBe(true);
  });

  it('keeps an individual child inside its original routine or project', () => {
    const routine = baseTask({ id: 'routine', type: 'Rutina', text: 'Rutina', checklist: undefined });
    const habit = baseTask({ id: 'habit', type: 'Hábito', text: 'Hábito', parentId: 'routine', objetivoPorCiclo: 2 });
    const [copy] = duplicateTaskTree('habit', [routine, habit], { ...ids() });

    expect(copy).toMatchObject({ text: 'Hábito (copia)', parentId: 'routine', objetivoPorCiclo: 2, completed: false });
  });

  it('preserves pulse configuration while resetting its counter', () => {
    const pulse = baseTask({
      id: 'pulse',
      type: 'Pulso',
      targetCount: 8,
      unitLabel: 'veces',
      polaridad: 'Abandonar',
      currentCount: 5,
      checklist: undefined,
    });
    const [copy] = duplicateTaskTree('pulse', [pulse], { ...ids() });

    expect(copy).toMatchObject({ targetCount: 8, unitLabel: 'veces', polaridad: 'Abandonar', currentCount: 0 });
  });

  it('does not copy pause intervals', () => {
    const source = baseTask({ pauseIntervals: [{ startedAt: '2026-10-10T10:00:00.000Z' }] });
    const [copy] = duplicateTaskTree(source.id, [source], { ...ids() });

    expect(copy.pauseIntervals).toBeUndefined();
  });
});
