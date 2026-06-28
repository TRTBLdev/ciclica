import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, IntentionItem } from '../types';
import {
  getTaskIdsForItem,
  calculateHoursProgress,
  calculateConsistencyProgress,
  calculateCompletionProgress,
  calculateItemProgress
} from './intentionProgress';

describe('getTaskIdsForItem', () => {
  const mockTasks: AppTask[] = [
    { id: 't1', userId: 'user', text: 'Meditación', type: 'Hábito', category: 'MIND', createdAt: '' },
    { id: 't2', userId: 'user', text: 'Leer libro', type: 'Hábito', category: 'MIND', subCategory: 'APRENDIZAJE', createdAt: '' },
    { id: 't3', userId: 'user', text: 'Ejercicio', type: 'Rutina', category: 'BODY', createdAt: '' },
    { id: 'proj1', userId: 'user', text: 'Proyecto X', type: 'Proyecto', category: 'FINANCE', createdAt: '' },
    { id: 'subt1', userId: 'user', text: 'Subtarea 1', type: 'Tarea', parentId: 'proj1', category: 'FINANCE', createdAt: '' },
  ];

  it('resolves at Area level', () => {
    const item: IntentionItem = { id: 'ii1', targetType: 'hours', areaName: 'MIND' };
    const ids = getTaskIdsForItem(item, mockTasks);
    expect(ids).toContain('t1');
    expect(ids).toContain('t2');
    expect(ids).not.toContain('t3');
  });

  it('resolves at Subcategory level', () => {
    const item: IntentionItem = { id: 'ii2', targetType: 'hours', areaName: 'MIND', subCategory: 'APRENDIZAJE' };
    const ids = getTaskIdsForItem(item, mockTasks);
    expect(ids).toContain('t2');
    expect(ids).not.toContain('t1');
  });

  it('resolves at Project level including subtareas', () => {
    const item: IntentionItem = { id: 'ii3', targetType: 'hours', projectId: 'proj1' };
    const ids = getTaskIdsForItem(item, mockTasks);
    expect(ids).toContain('proj1');
    expect(ids).toContain('subt1');
    expect(ids).not.toContain('t1');
  });

  it('resolves at Task level', () => {
    const item: IntentionItem = { id: 'ii4', targetType: 'hours', taskId: 't1' };
    const ids = getTaskIdsForItem(item, mockTasks);
    expect(ids).toEqual(['t1']);
  });
});

describe('calculateHoursProgress', () => {
  const mockTasks: AppTask[] = [
    { id: 't1', userId: 'user', text: 'Meditación', type: 'Hábito', category: 'MIND', createdAt: '' },
  ];

  const mockHistory: HistoryRecord[] = [
    { id: 'h1', userId: 'user', taskId: 't1', date: '2026-06-15T08:00:00Z', duration: 1.5, createdAt: '' },
    { id: 'h2', userId: 'user', taskId: 't1', date: '2026-06-16T08:00:00Z', duration: 2.0, createdAt: '' },
    // Outside date range
    { id: 'h3', userId: 'user', taskId: 't1', date: '2026-06-30T08:00:00Z', duration: 5.0, createdAt: '' },
    // No duration or duration <= 0
    { id: 'h4', userId: 'user', taskId: 't1', date: '2026-06-17T08:00:00Z', duration: 0, createdAt: '' },
  ];

  it('sums hours only inside date range and for positive duration', () => {
    const item: IntentionItem = { id: 'ii1', targetType: 'hours', taskId: 't1', targetHours: 5.0 };
    const result = calculateHoursProgress(item, mockTasks, mockHistory, '2026-06-14', '2026-06-20');
    expect(result.current).toBe(3.5); // 1.5 + 2.0
    expect(result.target).toBe(5.0);
    expect(result.percent).toBe(70);
  });
});

describe('calculateConsistencyProgress', () => {
  const mockTasks: AppTask[] = [
    { id: 't1', userId: 'user', text: 'Meditación', type: 'Hábito', category: 'MIND', createdAt: '' },
  ];

  const mockHistory: HistoryRecord[] = [
    { id: 'h1', userId: 'user', taskId: 't1', date: '2026-06-15T08:00:00Z', createdAt: '' },
    { id: 'h2', userId: 'user', taskId: 't1', date: '2026-06-15T18:00:00Z', createdAt: '' }, // same day
    { id: 'h3', userId: 'user', taskId: 't1', date: '2026-06-16T08:00:00Z', createdAt: '' }, // diff day
    { id: 'h4', userId: 'user', taskId: 't1', date: '2026-06-30T08:00:00Z', createdAt: '' }, // outside
  ];

  it('counts unique days inside date range', () => {
    const item: IntentionItem = { id: 'ii1', targetType: 'consistency', taskId: 't1', targetDays: 4 };
    const result = calculateConsistencyProgress(item, mockTasks, mockHistory, '2026-06-14', '2026-06-20');
    expect(result.current).toBe(2); // June 15 and 16
    expect(result.target).toBe(4);
    expect(result.percent).toBe(50);
  });
});

describe('calculateCompletionProgress', () => {
  const mockTasks: AppTask[] = [
    { id: 'proj1', userId: 'user', text: 'App MVP', type: 'Proyecto', completed: true, createdAt: '' },
    { id: 't1', userId: 'user', text: 'Subtarea', type: 'Tarea', completed: false, createdAt: '' },
  ];

  it('checks completion for projects', () => {
    const item: IntentionItem = { id: 'ii1', targetType: 'completion', projectId: 'proj1' };
    const result = calculateCompletionProgress(item, mockTasks);
    expect(result.completed).toBe(true);
    expect(result.taskName).toBe('App MVP');
  });

  it('checks completion for tasks', () => {
    const item: IntentionItem = { id: 'ii2', targetType: 'completion', taskId: 't1' };
    const result = calculateCompletionProgress(item, mockTasks);
    expect(result.completed).toBe(false);
    expect(result.taskName).toBe('Subtarea');
  });
});
