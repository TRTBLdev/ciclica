import { describe, expect, it } from 'vitest';
import { Config } from '../types';
import { calculateBiologicalPhase, getCyclePeriods, parseLocalDate } from './cycle';

const baseConfig = (cycleConfig: Config['cycleConfig']): Config => ({
  userId: 'local_user',
  theme: 'muji',
  cycleConfig,
  areas: {},
  separators: [],
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as a local date', () => {
    const date = parseLocalDate('2026-01-15');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });
});

describe('getCyclePeriods', () => {
  it('groups flow logs into periods split by gaps of at least 10 days', () => {
    const periods = getCyclePeriods({
      '2026-01-01': 2,
      '2026-01-02': 1,
      '2026-01-14': 3,
      '2026-01-15': 1,
      '2026-01-20': 0,
    });

    expect(periods).toHaveLength(2);
    expect(periods[0]).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      days: [
        { date: '2026-01-01', intensity: 2 },
        { date: '2026-01-02', intensity: 1 },
      ],
    });
    expect(periods[1].startDate).toBe('2026-01-14');
  });
});

describe('calculateBiologicalPhase', () => {
  it('uses manual phase when configured', () => {
    const phase = calculateBiologicalPhase(baseConfig({
      trackingType: 'none',
      currentManualPhase: 'creativa',
    }));

    expect(phase).toBe('creativa');
  });

  it('returns reflexiva during the menstrual flow window', () => {
    const phase = calculateBiologicalPhase(baseConfig({
      trackingType: 'menstrual',
      periodLengthDays: 5,
      cycleLengthDays: 28,
      flowLogs: {
        '2026-01-01': 2,
        '2026-01-02': 1,
      },
    }), new Date('2026-01-03T12:00:00.000Z'));

    expect(phase).toBe('reflexiva');
  });

  it('uses adaptive cycle ratios after the flow window', () => {
    const config = baseConfig({
      trackingType: 'menstrual',
      periodLengthDays: 3,
      flowLogs: {
        '2025-12-01': 2,
        '2026-01-01': 2,
      },
    });

    expect(calculateBiologicalPhase(config, new Date('2026-01-10T12:00:00.000Z'))).toBe('dinamica');
    expect(calculateBiologicalPhase(config, new Date('2026-01-16T12:00:00.000Z'))).toBe('expresiva');
    expect(calculateBiologicalPhase(config, new Date('2026-01-25T12:00:00.000Z'))).toBe('creativa');
  });
});
