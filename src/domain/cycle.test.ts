import { describe, expect, it } from 'vitest';
import { Config } from '../types';
import { calculateBiologicalPhase, getCyclePeriods, getImminentPeriodWarning, parseLocalDate } from './cycle';

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

  it('uses the cycle that contains a historical date instead of the latest recorded cycle', () => {
    const config = baseConfig({
      trackingType: 'menstrual',
      periodLengthDays: 3,
      cycleLengthDays: 28,
      flowLogs: {
        '2026-07-01': 2,
        '2026-07-02': 1,
        '2026-07-29': 2,
        '2026-07-30': 1,
        '2026-08-26': 2,
        '2026-08-27': 1,
        '2026-09-23': 2,
        '2026-09-24': 1,
      },
    });

    expect(calculateBiologicalPhase(config, new Date(2026, 8, 4), true)).toBe('dinamica');
    expect(calculateBiologicalPhase(config, new Date(2026, 8, 10), true)).toBe('expresiva');
    expect(calculateBiologicalPhase(config, new Date(2026, 8, 15), true)).toBe('creativa');
  });
});

describe('getImminentPeriodWarning', () => {
  const config = baseConfig({
    trackingType: 'menstrual',
    cycleLengthDays: 28,
    lastCycleStartDate: '2025-12-20T00:00:00.000Z',
    flowLogs: {
      '2026-01-01': 2,
      '2026-01-02': 1,
    },
  });

  it('prefers the latest recorded period over a stale configured start', () => {
    expect(getImminentPeriodWarning(config, new Date(2026, 0, 16))).toBeNull();
  });

  it('warns only one or two days before the next projected period', () => {
    expect(getImminentPeriodWarning(config, new Date(2026, 0, 27))).toEqual({ daysUntilPeriod: 2 });
    expect(getImminentPeriodWarning(config, new Date(2026, 0, 28))).toEqual({ daysUntilPeriod: 1 });
    expect(getImminentPeriodWarning(config, new Date(2026, 0, 26))).toBeNull();
    expect(getImminentPeriodWarning(config, new Date(2026, 0, 29))).toBeNull();
  });

  it('falls back to the configured start when no flow has been recorded', () => {
    const legacyConfig = baseConfig({
      trackingType: 'menstrual',
      cycleLengthDays: 28,
      lastCycleStartDate: '2026-01-01T00:00:00.000Z',
      flowLogs: {},
    });
    expect(getImminentPeriodWarning(legacyConfig, new Date(2026, 0, 27))).toEqual({ daysUntilPeriod: 2 });
  });

  it('does not warn for non-menstrual tracking', () => {
    expect(getImminentPeriodWarning(baseConfig({ trackingType: 'lunar' }), new Date(2026, 0, 27))).toBeNull();
  });
});
