import { describe, expect, it } from 'vitest';
import { getLunarArchetype, getLunarDetailsForDate } from './lunar';

describe('getLunarDetailsForDate', () => {
  it('returns a new moon near the reference date', () => {
    const details = getLunarDetailsForDate('2000-01-06T18:14:00');

    expect(details.phaseName).toBe('Luna Nueva');
    expect(details.ratio).toBeCloseTo(0, 5);
  });
});

describe('getLunarArchetype', () => {
  it('maps day-one moon ratios to archetypes', () => {
    expect(getLunarArchetype(0.01).archetype).toBe('Luna Blanca');
    expect(getLunarArchetype(0.50).archetype).toBe('Luna Roja');
    expect(getLunarArchetype(0.20).archetype).toBe('Luna Rosa (Creciente)');
    expect(getLunarArchetype(0.75).archetype).toBe('Luna Violeta (Menguante)');
  });
});
