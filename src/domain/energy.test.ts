import { describe, expect, it } from 'vitest';
import { getEnergyEngineDetails } from './energy';

describe('getEnergyEngineDetails', () => {
  it('returns phase limits and tracking-specific labels', () => {
    expect(getEnergyEngineDetails('dinamica')?.limit).toBe(12);
    expect(getEnergyEngineDetails('dinamica')?.label).toContain('Folicular');
    expect(getEnergyEngineDetails('dinamica', 'lunar')?.label).toContain('Luna Creciente');
  });
});
