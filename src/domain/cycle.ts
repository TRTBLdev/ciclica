import { BiologicalPhase, Config } from '../types';
import { getLunarDetailsForDate } from './lunar';

const DAY_MS = 1000 * 60 * 60 * 24;

export interface PeriodGroup {
  startDate: string;
  endDate: string;
  days: { date: string; intensity: number }[];
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
}

export function getCyclePeriods(flowLogs: Record<string, number> | undefined): PeriodGroup[] {
  if (!flowLogs) return [];
  const flowEntries = Object.entries(flowLogs)
    .filter(([_, intensity]) => intensity > 0)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  if (flowEntries.length === 0) return [];

  const periods: PeriodGroup[] = [];
  let currentGroup: PeriodGroup | null = null;

  flowEntries.forEach(([dateStr, intensity]) => {
    if (!currentGroup) {
      currentGroup = { startDate: dateStr, endDate: dateStr, days: [{ date: dateStr, intensity }] };
    } else {
      const lastDay = parseLocalDate(currentGroup.endDate);
      const thisDay = parseLocalDate(dateStr);
      const diffDays = Math.floor((thisDay.getTime() - lastDay.getTime()) / DAY_MS);
      if (diffDays >= 10) {
        periods.push(currentGroup);
        currentGroup = { startDate: dateStr, endDate: dateStr, days: [{ date: dateStr, intensity }] };
      } else {
        currentGroup.endDate = dateStr;
        currentGroup.days.push({ date: dateStr, intensity });
      }
    }
  });

  if (currentGroup) periods.push(currentGroup);
  return periods;
}

export function calculateBiologicalPhase(config: Config | null, todayDate = new Date()): BiologicalPhase {
  if (!config || !config.cycleConfig) return 'expresiva';

  const { trackingType, currentManualPhase, flowLogs, cycleLengthDays } = config.cycleConfig;

  if (currentManualPhase && currentManualPhase !== 'none' as any) {
    return currentManualPhase;
  }

  if (trackingType === 'menstrual' && flowLogs && Object.keys(flowLogs).length > 0) {
    const logEntries = Object.entries(flowLogs)
      .filter(([_, intensity]) => intensity > 0)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    if (logEntries.length === 0) return 'expresiva';

    const cycleStartDates: Date[] = [];
    let lastDate: Date | null = null;

    logEntries.forEach(([dateStr]) => {
      const currentDate = new Date(dateStr);
      if (!lastDate) {
        cycleStartDates.push(currentDate);
      } else {
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / DAY_MS);
        if (diffDays >= 10) {
          cycleStartDates.push(currentDate);
        }
      }
      lastDate = currentDate;
    });

    const activeCycleStart = new Date(cycleStartDates[cycleStartDates.length - 1].getTime());
    const today = new Date(todayDate);
    today.setHours(0, 0, 0, 0);
    activeCycleStart.setHours(0, 0, 0, 0);

    const daysIntoCycle = Math.floor((today.getTime() - activeCycleStart.getTime()) / DAY_MS);

    let calculatedCycleLength = cycleLengthDays || 28;
    if (cycleStartDates.length >= 2) {
      let totalIntervalDays = 0;
      for (let i = 1; i < cycleStartDates.length; i++) {
        totalIntervalDays += Math.floor((cycleStartDates[i].getTime() - cycleStartDates[i - 1].getTime()) / DAY_MS);
      }
      calculatedCycleLength = Math.round(totalIntervalDays / (cycleStartDates.length - 1));
    }

    const configuredPeriodLength = config.cycleConfig.periodLengthDays || 5;
    let cursor = new Date(activeCycleStart.getTime());
    let consecutiveFlowDays = 0;
    while (consecutiveFlowDays < 15) {
      const cursorStr = cursor.toISOString().slice(0, 10);
      if (flowLogs[cursorStr] && flowLogs[cursorStr] > 0) {
        consecutiveFlowDays++;
        cursor.setDate(cursor.getDate() + 1);
      } else {
        break;
      }
    }

    const menstrualPhaseLength = Math.max(configuredPeriodLength, consecutiveFlowDays);

    if (daysIntoCycle < menstrualPhaseLength) return 'reflexiva';
    if (daysIntoCycle < calculatedCycleLength * 0.40) return 'dinamica';
    if (daysIntoCycle < calculatedCycleLength * 0.58) return 'expresiva';
    return 'creativa';
  }

  if (trackingType === 'lunar') {
    const ratio = getLunarDetailsForDate(todayDate).ratio;
    if (ratio <= 0.25) return 'reflexiva';
    if (ratio <= 0.50) return 'dinamica';
    if (ratio <= 0.75) return 'expresiva';
    return 'creativa';
  }

  return 'expresiva';
}
