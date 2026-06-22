import { describe, expect, it, vi } from 'vitest';
import { migrateDatabase, normalizeConfig, normalizeHistoryRecord, normalizeTask } from './migration';

describe('normalizeConfig', () => {
  it('fills missing config defaults', () => {
    const config = normalizeConfig({ userId: 'local_user', theme: 'unknown' });

    expect(config.theme).toBe('muji');
    expect(config.cycleConfig.trackingType).toBe('none');
    expect(config.separators).toHaveLength(3);
    expect(config.areas.BODY).toEqual(expect.objectContaining({ color: 'emerald' }));
  });

  it('preserves custom areas while adding missing defaults', () => {
    const config = normalizeConfig({
      userId: 'local_user',
      theme: 'kyoto-dusk',
      areas: { BODY: { color: 'red', categories: ['CUSTOM'] } },
      separators: [{ hora: '10:00', text: 'Custom', detalle: 'Block' }],
      cycleConfig: { trackingType: 'menstrual' },
    });

    expect(config.theme).toBe('kyoto-dusk');
    expect(config.areas.BODY).toEqual({ color: 'red', categories: ['CUSTOM'] });
    expect(config.areas.MIND).toEqual(expect.objectContaining({ color: 'teal' }));
    expect(config.separators).toEqual([{ hora: '10:00', text: 'Custom', detalle: 'Block' }]);
    expect(config.cycleConfig.flowLogs).toEqual({});
  });
});

describe('normalizeTask', () => {
  it('migrates legacy counter/event types to pulso defaults', () => {
    const task = normalizeTask({
      id: 'legacy_1',
      userId: 'local_user',
      text: 'Legacy counter',
      type: 'Contador',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(task.type).toBe('Pulso');
    expect(task.currentCount).toBe(0);
    expect(task.targetCount).toBe(8);
    expect(task.unitLabel).toBe('veces');
    expect(task.completed).toBe(false);
  });

  it('fills missing ids and dates with the supplied clock', () => {
    const now = new Date('2026-02-03T04:05:06.000Z');
    const task = normalizeTask({ userId: 'local_user', text: 'New task' }, now);

    expect(task).not.toBeNull();
    expect(task!.id).toMatch(/^task_migrated_/);
    expect(task!.type).toBe('Tarea');
    expect(task!.createdAt).toBe('2026-02-03T04:05:06.000Z');
  });

  it('filters out Meta tasks by returning null', () => {
    const task = normalizeTask({
      id: 'task_meta_1',
      userId: 'local_user',
      text: 'My Meta',
      type: 'Meta',
    });
    expect(task).toBeNull();
  });

  it('assigns auto completionMode for Rutina with frequency <= 7 days', () => {
    const task1 = normalizeTask({
      userId: 'local_user',
      text: 'Daily Rutina',
      type: 'Rutina',
      frecuencia: 3,
      frecuenciaUnidad: 'días',
    });
    expect(task1).not.toBeNull();
    expect(task1!.completionMode).toBe('auto');

    const task2 = normalizeTask({
      userId: 'local_user',
      text: 'Weekly Rutina',
      type: 'Rutina',
      frecuencia: 1,
      frecuenciaUnidad: 'semanas',
    });
    expect(task2).not.toBeNull();
    expect(task2!.completionMode).toBe('auto');
  });

  it('assigns manual completionMode for Rutina with frequency > 7 days', () => {
    const task1 = normalizeTask({
      userId: 'local_user',
      text: 'Fortnightly Rutina',
      type: 'Rutina',
      frecuencia: 2,
      frecuenciaUnidad: 'semanas',
    });
    expect(task1).not.toBeNull();
    expect(task1!.completionMode).toBe('manual');

    const task2 = normalizeTask({
      userId: 'local_user',
      text: 'Monthly Rutina',
      type: 'Rutina',
      frecuencia: 1,
      frecuenciaUnidad: 'meses',
    });
    expect(task2).not.toBeNull();
    expect(task2!.completionMode).toBe('manual');
  });
});

describe('normalizeHistoryRecord', () => {
  it('fills missing history fields with safe defaults', () => {
    const now = new Date('2026-02-03T04:05:06.000Z');
    const record = normalizeHistoryRecord({ userId: 'local_user', taskId: 'task_1' }, now);

    expect(record.id).toMatch(/^hist_migrated_/);
    expect(record.date).toBe('2026-02-03T04:05:06.000Z');
    expect(record.duration).toBe(0);
    expect(record.createdAt).toBe('2026-02-03T04:05:06.000Z');
  });
});

describe('migrateDatabase', () => {
  it('normalizes invalid collection shapes and logs migration counts', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = migrateDatabase({
      config: { userId: 'local_user' },
      tasks: 'not-an-array',
      history: null,
    });

    expect(result.tasks).toEqual([]);
    expect(result.history).toEqual([]);
    expect(result.config.theme).toBe('muji');
    expect(logSpy).toHaveBeenCalledWith(
      'CÍCLICA Migration Engine: Verificación exitosa. Registros migrados:',
      { tareasCount: 0, historialCount: 0, version: 1 }
    );

    logSpy.mockRestore();
  });
});
