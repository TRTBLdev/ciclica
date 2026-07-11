import { describe, expect, it } from 'vitest';
import { Config, Intention } from '../types';
import { 
  getQuarterRange, 
  getYearRange, 
  generatePeriodLabel, 
  findIntentionForPeriod, 
  getPhaseRange,
  getCycleRange,
  formatLocalDate
} from './periodUtils';

const baseConfig = (cycleConfig: Config['cycleConfig']): Config => ({
  userId: 'local_user',
  theme: 'muji',
  cycleConfig,
  areas: {},
  separators: [],
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('getQuarterRange', () => {
  it('returns local date ranges for standard calendar quarters', () => {
    // Q1
    const q1 = getQuarterRange(new Date(2026, 0, 15));
    expect(q1.start).toBe('2026-01-01');
    expect(q1.end).toBe('2026-03-31');

    // Q2
    const q2 = getQuarterRange(new Date(2026, 4, 15));
    expect(q2.start).toBe('2026-04-01');
    expect(q2.end).toBe('2026-06-30');

    // Q3
    const q3 = getQuarterRange(new Date(2026, 7, 15));
    expect(q3.start).toBe('2026-07-01');
    expect(q3.end).toBe('2026-09-30');

    // Q4
    const q4 = getQuarterRange(new Date(2026, 11, 15));
    expect(q4.start).toBe('2026-10-01');
    expect(q4.end).toBe('2026-12-31');
  });

  it('supports custom range quarters from config', () => {
    const config: Config = {
      userId: 'user',
      theme: 'muji',
      cycleConfig: { trackingType: 'none' },
      areas: {},
      separators: [],
      quarterConfig: {
        type: 'personal',
        q1: { start: '03-01', end: '05-31' },
        q2: { start: '06-01', end: '08-31' },
        q3: { start: '09-01', end: '11-30' },
        q4: { start: '12-01', end: '02-28' }
      },
      createdAt: ''
    };

    // Test a date in custom Q1: April 15, 2026
    const res1 = getQuarterRange(config, new Date(2026, 3, 15));
    expect(res1.start).toBe('2026-03-01');
    expect(res1.end).toBe('2026-05-31');
    expect(res1.qKey).toBe('Q1');

    // Test a date in custom Q4: January 15, 2026 (spans Dec 2025 - Feb 2026)
    const res4 = getQuarterRange(config, new Date(2026, 0, 15));
    expect(res4.start).toBe('2025-12-01');
    expect(res4.end).toBe('2026-02-28');
    expect(res4.qKey).toBe('Q4');

    // Test a date in custom Q4: December 15, 2026 (spans Dec 2026 - Feb 2027)
    const res4_dec = getQuarterRange(config, new Date(2026, 11, 15));
    expect(res4_dec.start).toBe('2026-12-01');
    expect(res4_dec.end).toBe('2027-02-28');
    expect(res4_dec.qKey).toBe('Q4');
  });
});

describe('getYearRange', () => {
  it('returns the full year date range', () => {
    const range = getYearRange(new Date(2026, 5, 15));
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-12-31');
  });
});

describe('generatePeriodLabel', () => {
  it('formats labels for all temporal scales correctly', () => {
    expect(generatePeriodLabel('phase', '2026-06-15', '2026-06-22')).toBe('Semana · Jun 15-22, 2026');
    expect(generatePeriodLabel('cycle', '2026-06-01', '2026-06-28')).toBe('Mes · Jun 1-28, 2026');
    expect(generatePeriodLabel('quarter', '2026-04-01', '2026-06-30')).toBe('Q2 2026');
    expect(generatePeriodLabel('year', '2026-01-01', '2026-12-31')).toBe('2026');
  });
});

describe('findIntentionForPeriod', () => {
  it('locates the correct intention matching scale and dates', () => {
    const intentions: Intention[] = [
      {
        id: 'int_1',
        userId: 'local_user',
        scale: 'quarter',
        periodStart: '2026-04-01',
        periodEnd: '2026-06-30',
        items: [],
        createdAt: '2026-04-01T00:00:00Z',
      },
      {
        id: 'int_2',
        userId: 'local_user',
        scale: 'phase',
        periodStart: '2026-06-15',
        periodEnd: '2026-06-22',
        items: [],
        createdAt: '2026-06-15T00:00:00Z',
      }
    ];

    expect(findIntentionForPeriod(intentions, 'quarter', '2026-04-01', '2026-06-30')).toBe(intentions[0]);
    expect(findIntentionForPeriod(intentions, 'phase', '2026-06-15', '2026-06-22')).toBe(intentions[1]);
    expect(findIntentionForPeriod(intentions, 'year', '2026-01-01', '2026-12-31')).toBeUndefined();
  });
});

describe('getPhaseRange', () => {
  it('returns a 7-day range for weekly or fixed config', () => {
    const config = baseConfig({
      trackingType: 'weekly'
    });
    // Let's pass a specific date (Wednesday, 2026-01-07)
    // Jan 5, 2026 was Monday. So the week range should be Mon Jan 5 - Sun Jan 11.
    const range = getPhaseRange(config, new Date(2026, 0, 7));
    expect(range.start).toBe('2026-01-05');
    expect(range.end).toBe('2026-01-11');
  });

  it('scans and returns the correct range for menstrual phase', () => {
    const config = baseConfig({
      trackingType: 'menstrual',
      periodLengthDays: 5,
      cycleLengthDays: 28,
      flowLogs: {
        '2026-01-01': 2,
        '2026-01-02': 1,
        '2026-01-03': 1,
      }
    });

    // On Jan 3, it should be in reflexiva phase (menstrual flow)
    // The flow starts on Jan 1 and periodLengthDays is 5. So reflexiva goes Jan 1 - Jan 5.
    const range = getPhaseRange(config, new Date(2026, 0, 3));
    expect(range.phaseName).toBe('reflexiva');
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2026-01-05');
  });
});

describe('getCycleRange', () => {
  it('returns correct cycle bounds for weekly or fixed config', () => {
    const config = baseConfig({
      trackingType: 'weekly'
    });
    // Wednesday, 2026-01-07
    // Jan 5, 2026 is Monday. Cycle starts Monday Jan 5 and ends 28 days later.
    const range = getCycleRange(config, new Date(2026, 0, 7));
    expect(range.start).toBe('2025-12-22');
    expect(range.end).toBe('2026-01-18');
  });
});
