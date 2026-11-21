import { describe, expect, it } from 'vitest';
import { AppTask, Separator } from '../types';
import {
  getDefaultExpandedMomentId,
  getMomentsForDate,
  getStableMomentId,
  resolveTaskMomentId,
} from './moments';

const sep = (overrides: Partial<Separator>): Separator => ({
  hora: '08:00',
  text: 'Mañana',
  detalle: '',
  ...overrides,
});

const task = (overrides: Partial<AppTask>): AppTask => ({
  id: 'task_1',
  userId: 'local_user',
  text: 'Acción',
  type: 'Tarea',
  createdAt: '2026-11-21T12:00:00.000Z',
  ...overrides,
});

describe('moments domain', () => {
  it('assigns deterministic stable IDs and filters by ISO weekday', () => {
    const separators: Separator[] = [
      sep({ hora: '07:30', text: 'Al despertar', kind: 'trigger' }),
      sep({ hora: '10:00', text: 'Mantenimiento', weekdays: [1, 3, 5] }),
      sep({ id: 'custom_evening', hora: '20:30', text: 'Cierre' }),
    ];

    expect(getStableMomentId(separators[0], 0)).toBe('mom_0730_al_despertar');
    expect(getStableMomentId(separators[2], 2)).toBe('custom_evening');

    // Saturday 2026-11-21 is ISO weekday 6 -> Mantenimiento [1,3,5] excluded
    const satMoments = getMomentsForDate(separators, '2026-11-21');
    expect(satMoments.map(m => m.text)).toEqual(['Al despertar', 'Cierre']);
    expect(satMoments[0].kind).toBe('trigger');
    expect(satMoments[1].kind).toBe('time');

    // Monday 2026-11-23 is ISO weekday 1 -> all 3 present
    const monMoments = getMomentsForDate(separators, '2026-11-23');
    expect(monMoments.map(m => m.text)).toEqual(['Al despertar', 'Mantenimiento', 'Cierre']);
  });

  it('resolves explicit momentId, legacy hora fallback, early-morning fallback, and null', () => {
    const moments = getMomentsForDate([
      sep({ id: 'm_morning', hora: '07:30', text: 'Soma' }),
      sep({ id: 'm_mid', hora: '10:00', text: 'Mantenimiento' }),
      sep({ id: 'm_night', hora: '20:30', text: 'Cierre' }),
    ], '2026-11-21');

    // Explicit momentId wins even if hora points elsewhere
    expect(resolveTaskMomentId(task({ momentId: 'm_night', hora: '08:00' }), moments)).toBe('m_night');

    // Legacy hora falls back to closest preceding moment
    expect(resolveTaskMomentId(task({ hora: '08:50' }), moments)).toBe('m_morning');
    expect(resolveTaskMomentId(task({ hora: '14:30' }), moments)).toBe('m_mid');
    expect(resolveTaskMomentId(task({ hora: '22:45' }), moments)).toBe('m_night');

    // Earlier than first moment falls into first moment (never Cuando pueda)
    expect(resolveTaskMomentId(task({ hora: '06:30' }), moments)).toBe('m_morning');

    // No momentId and no valid hora -> Cuando pueda (null)
    expect(resolveTaskMomentId(task({ hora: '' }), moments)).toBeNull();
    expect(resolveTaskMomentId(task({}), moments)).toBeNull();
  });

  it('picks the first moment with due items as default expanded, or current clock moment', () => {
    const moments = getMomentsForDate([
      sep({ id: 'm1', hora: '07:30', text: 'Soma' }),
      sep({ id: 'm2', hora: '12:00', text: 'Mediodía' }),
      sep({ id: 'm3', hora: '20:30', text: 'Cierre' }),
    ], '2026-11-21');

    expect(getDefaultExpandedMomentId([
      { moment: moments[0], dueCount: 0, optionalCount: 1 },
      { moment: moments[1], dueCount: 2, optionalCount: 0 },
      { moment: moments[2], dueCount: 1, optionalCount: 0 },
    ], 8 * 60)).toBe('m2');

    // When all moments have 0 due items, expand current moment by clock
    expect(getDefaultExpandedMomentId([
      { moment: moments[0], dueCount: 0, optionalCount: 0 },
      { moment: moments[1], dueCount: 0, optionalCount: 1 },
      { moment: moments[2], dueCount: 0, optionalCount: 0 },
    ], 15 * 60)).toBe('m2');
  });
});
