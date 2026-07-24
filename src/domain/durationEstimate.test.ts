import { describe, expect, it } from 'vitest';
import {
  decimalHoursToDurationParts,
  durationPartsToDecimalHours,
  resolveDurationForSave,
} from './durationEstimate';

describe('duration estimate conversion', () => {
  it('stores hours and arbitrary minutes as decimal hours rounded to two decimals', () => {
    expect(durationPartsToDecimalHours(0, 0)).toBe(0);
    expect(durationPartsToDecimalHours(0, 1)).toBe(0.02);
    expect(durationPartsToDecimalHours(1, 14)).toBe(1.23);
    expect(durationPartsToDecimalHours(2, 59)).toBe(2.98);
  });

  it('loads decimal hours as hours and rounded minutes', () => {
    expect(decimalHoursToDurationParts(0)).toEqual({ hours: 0, minutes: 0 });
    expect(decimalHoursToDurationParts(1.5)).toEqual({ hours: 1, minutes: 30 });
    expect(decimalHoursToDurationParts(1.234)).toEqual({ hours: 1, minutes: 14 });
  });

  it('carries rounded 60 minutes into the next hour', () => {
    expect(decimalHoursToDurationParts(1.999)).toEqual({ hours: 2, minutes: 0 });
  });

  it('matches the timer rounding for the same whole number of minutes', () => {
    for (const totalMinutes of [1, 14, 30, 59, 60, 90]) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timerHours = Number((totalMinutes / 60).toFixed(2));

      expect(durationPartsToDecimalHours(hours, minutes)).toBe(timerHours);
    }
  });
});

describe('duration estimate compatibility', () => {
  it('keeps a legacy value exactly when the field was not edited', () => {
    expect(resolveDurationForSave(1.234567, null)).toBe(1.234567);
  });

  it('uses the normalized value after an edit and defaults an untouched new item to zero', () => {
    expect(resolveDurationForSave(1.234567, durationPartsToDecimalHours(1, 14))).toBe(1.23);
    expect(resolveDurationForSave(undefined, null)).toBe(0);
  });
});
