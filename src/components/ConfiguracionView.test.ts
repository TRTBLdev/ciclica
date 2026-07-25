import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getExportFilename } from './ConfiguracionView';

describe('configuration exports', () => {
  it('uses the device-local calendar day in every JSON filename', () => {
    const localEvening = new Date(2026, 6, 24, 22, 37, 38, 843);

    expect(getExportFilename('all', localEvening)).toBe('ciclica_vault_2026-07-24.json');
    expect(getExportFilename('ciclos', localEvening)).toBe('ciclica_ciclos_2026-07-24.json');
    expect(getExportFilename('habitos', localEvening)).toBe('ciclica_habitos_2026-07-24.json');
    expect(getExportFilename('tareas', localEvening)).toBe('ciclica_tareas_2026-07-24.json');
    expect(getExportFilename('intenciones', localEvening)).toBe('ciclica_intenciones_2026-07-24.json');
  });

  it('prevents UTC day slicing from returning to history events and JSON exports', () => {
    const taskItemSource = readFileSync(new URL('./TaskItem.tsx', import.meta.url), 'utf8');
    const appearanceSource = readFileSync(new URL('../domain/appearance.ts', import.meta.url), 'utf8');
    const migrationSource = readFileSync(new URL('../data/migration.ts', import.meta.url), 'utf8');
    const configurationSource = readFileSync(new URL('./ConfiguracionView.tsx', import.meta.url), 'utf8');

    expect(taskItemSource).not.toMatch(/\b(?:record|h)\.date\.(?:slice|substring)\(0,\s*10\)/);
    expect(taskItemSource).toContain('.map(getHistoryDateKey)');
    expect(taskItemSource).toContain('formatDateOnly(new Date(task.lastExecutedAt))');
    expect(appearanceSource).not.toContain('toDateKey(record.date)');
    expect(migrationSource).not.toMatch(/record\.date\.(?:slice|substring)\(0,\s*10\)/);
    expect(configurationSource).not.toMatch(/new Date\(\)\.toISOString\(\)\.(?:slice|substring)\(0,\s*10\)/);
  });
});
