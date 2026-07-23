import { AppTask } from '../types';
import { getProjectForTask } from './workTracking';

export type EnergyAllocation = 'fixed' | 'growth' | 'mixed';

export const MIXED_INVESTMENT_SHARE = 0.75;
export const MIXED_SUPPORT_SHARE = 0.25;

export function getEffectiveEnergyAllocation(task: AppTask, tasks: AppTask[]): EnergyAllocation {
  if (task.type === 'Hábito' || task.type === 'Pulso' || task.type === 'Rutina') return 'fixed';
  if (task.allocationType) return task.allocationType;
  if (task.type === 'Proyecto') return 'growth';
  if (getProjectForTask(task.id, tasks) || (task.parentId && getProjectForTask(task.parentId, tasks))) return 'growth';
  return 'mixed';
}

export function splitEnergyDuration(duration: number, allocation: EnergyAllocation) {
  if (allocation === 'fixed') return { support: duration, investment: 0 };
  if (allocation === 'growth') return { support: 0, investment: duration };
  return {
    support: duration * MIXED_SUPPORT_SHARE,
    investment: duration * MIXED_INVESTMENT_SHARE
  };
}

export function getTaskEnergyBreakdown(task: AppTask, tasks: AppTask[], duration: number) {
  return splitEnergyDuration(duration, getEffectiveEnergyAllocation(task, tasks));
}
