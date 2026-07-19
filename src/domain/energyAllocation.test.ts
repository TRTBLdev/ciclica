import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import { getEffectiveEnergyAllocation, splitEnergyDuration } from './energyAllocation';

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task',
  userId: 'user',
  text: 'Elemento',
  type: 'Tarea',
  createdAt: '2026-07-19T00:00:00.000Z',
  ...overrides
});

describe('energy allocation', () => {
  it('splits mixed durations toward investment while conserving the total', () => {
    const result = splitEnergyDuration(4, 'mixed');
    expect(result).toEqual({ support: 1, investment: 3 });
    expect(result.support + result.investment).toBe(4);
  });

  it('keeps explicit allocations and existing type defaults', () => {
    const project = task({ id: 'project', type: 'Proyecto' });
    expect(getEffectiveEnergyAllocation(task({ allocationType: 'mixed' }), [])).toBe('mixed');
    expect(getEffectiveEnergyAllocation(task({ type: 'Hábito' }), [])).toBe('fixed');
    expect(getEffectiveEnergyAllocation(task({ type: 'Rutina' }), [])).toBe('growth');
    expect(getEffectiveEnergyAllocation(task({ parentId: project.id }), [project])).toBe('growth');
  });
});
