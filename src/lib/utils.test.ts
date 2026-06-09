import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFutureDate, isSameDay, isTodayOrBefore } from './utils';

describe('calendar date comparisons', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats UTC-midnight ISO strings as calendar dates, not shifted local instants', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T12:00:00.000-04:00'));

    expect(isFutureDate('2026-06-10T00:00:00.000Z')).toBe(true);
    expect(isTodayOrBefore('2026-06-10T00:00:00.000Z')).toBe(false);
    expect(isSameDay('2026-06-10T00:00:00.000Z', new Date('2026-06-09T12:00:00.000-04:00'))).toBe(false);
  });

  it('keeps same-day checks true for plain date strings', () => {
    expect(isSameDay('2026-06-09', new Date('2026-06-09T20:00:00.000-04:00'))).toBe(true);
  });
});
