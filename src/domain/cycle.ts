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
    .filter(([dateStr, intensity]) => {
      if (intensity <= 0) return false;
      const d = parseLocalDate(dateStr);
      return !isNaN(d.getTime());
    })
    .sort((a, b) => parseLocalDate(a[0]).getTime() - parseLocalDate(b[0]).getTime());

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

export interface PastCycleInfo {
  startDate: string;
  endDate: string;
  periodLength: number;
  cycleLength: number | null;
  days: { date: string; intensity: number }[];
}

export interface ProjectedCycleInfo {
  startDate: Date;
  endDate: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
}

export interface CycleProjections {
  currentCycleDay: number | null;
  daysSinceExpected: number | null;
  meanCycleLength: number;
  meanPeriodLength: number;
  pastCycles: PastCycleInfo[];
  projectedPeriods: ProjectedCycleInfo[];
}

export function getCycleProjections(config: Config | null): CycleProjections | null {
  if (!config || !config.cycleConfig) return null;
  const flowLogs = config.cycleConfig.flowLogs || {};
  const periods = getCyclePeriods(flowLogs);

  const fallbackCycleLength = config.cycleConfig.cycleLengthDays || 28;
  const fallbackPeriodLength = config.cycleConfig.periodLengthDays || 5;

  if (periods.length === 0) {
    return {
      currentCycleDay: null,
      daysSinceExpected: null,
      meanCycleLength: fallbackCycleLength,
      meanPeriodLength: fallbackPeriodLength,
      pastCycles: [],
      projectedPeriods: []
    };
  }

  // Calculate past cycles
  const pastCycles: PastCycleInfo[] = [];
  let totalCycleDays = 0;
  let cycleCountForMean = 0;
  let totalPeriodDays = 0;

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const startDate = parseLocalDate(p.startDate);
    const endDate = parseLocalDate(p.endDate);
    const periodLength = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1);
    
    totalPeriodDays += periodLength;

    let cycleLength: number | null = null;
    if (i < periods.length - 1) {
      const nextStartDate = parseLocalDate(periods[i + 1].startDate);
      cycleLength = Math.max(1, Math.floor((nextStartDate.getTime() - startDate.getTime()) / DAY_MS));
      totalCycleDays += cycleLength;
      cycleCountForMean++;
    }

    pastCycles.push({
      startDate: p.startDate,
      endDate: p.endDate,
      periodLength,
      cycleLength,
      days: p.days
    });
  }

  const meanCycleLength = cycleCountForMean > 0 ? Math.round(totalCycleDays / cycleCountForMean) : fallbackCycleLength;
  const meanPeriodLength = periods.length > 0 ? Math.round(totalPeriodDays / periods.length) : fallbackPeriodLength;

  // Reverse pastCycles so newest is first
  pastCycles.reverse();

  // Current status
  const lastPeriodStart = parseLocalDate(periods[periods.length - 1].startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriodStart.getTime()) / DAY_MS);
  const currentCycleDay = daysSinceLastPeriod + 1;
  const daysSinceExpected = daysSinceLastPeriod - meanCycleLength;

  // Projections
  const projectedPeriods: ProjectedCycleInfo[] = [];
  let nextStart = new Date(lastPeriodStart);
  
  for (let i = 0; i < 3; i++) {
    // If it's the very first projection and we are past the expected date, we still project based on last start
    // but we need to step forward by meanCycleLength each time.
    nextStart.setDate(nextStart.getDate() + meanCycleLength);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + meanPeriodLength - 1);

    const ovulationDate = new Date(nextStart);
    // Next cycle's start minus 14 days is this cycle's ovulation.
    // So ovulation for THIS upcoming cycle would be the start of the following cycle minus 14.
    // Wait, the projection is for the UPCOMING period. The ovulation we care about is BEFORE that period!
    ovulationDate.setDate(ovulationDate.getDate() - 14);

    const fertileStart = new Date(ovulationDate);
    fertileStart.setDate(fertileStart.getDate() - 5);
    
    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    projectedPeriods.push({
      startDate: new Date(nextStart),
      endDate: new Date(nextEnd),
      ovulationDate: new Date(ovulationDate),
      fertileWindowStart: new Date(fertileStart),
      fertileWindowEnd: new Date(fertileEnd)
    });
  }

  // Also include the projection for the CURRENT cycle if we haven't ovulated yet!
  // The next period is projectedPeriods[0]. Its ovulation is projectedPeriods[0].ovulationDate.
  // Actually, we can just insert the current cycle's projection at the start.
  const currentCycleOvulation = new Date(projectedPeriods[0].startDate);
  currentCycleOvulation.setDate(currentCycleOvulation.getDate() - 14);
  const currentFertileStart = new Date(currentCycleOvulation);
  currentFertileStart.setDate(currentFertileStart.getDate() - 5);
  const currentFertileEnd = new Date(currentCycleOvulation);
  currentFertileEnd.setDate(currentFertileEnd.getDate() + 1);

  const currentCycleProjection: ProjectedCycleInfo = {
    startDate: new Date(lastPeriodStart), // It already started
    endDate: new Date(lastPeriodStart.getTime() + (meanPeriodLength - 1) * DAY_MS),
    ovulationDate: currentCycleOvulation,
    fertileWindowStart: currentFertileStart,
    fertileWindowEnd: currentFertileEnd
  };

  // If we are currently BEFORE the projected next period, the 'current' projection is relevant
  // We prepend it and just take the first 3.
  projectedPeriods.unshift(currentCycleProjection);

  return {
    currentCycleDay,
    daysSinceExpected,
    meanCycleLength,
    meanPeriodLength,
    pastCycles,
    projectedPeriods: projectedPeriods.slice(0, 3)
  };
}

export function calculateBiologicalPhase(config: Config | null, todayDate = new Date(), ignoreManual = false): BiologicalPhase {
  if (!config || !config.cycleConfig) return 'expresiva';

  const { trackingType, currentManualPhase, flowLogs, cycleLengthDays } = config.cycleConfig;

  if (!ignoreManual && currentManualPhase && currentManualPhase !== 'none' as any) {
    return currentManualPhase;
  }

  if (trackingType === 'menstrual' && flowLogs && Object.keys(flowLogs).length > 0) {
    const logEntries = Object.entries(flowLogs)
      .filter(([dateStr, intensity]) => {
        if (intensity <= 0) return false;
        const d = parseLocalDate(dateStr);
        return !isNaN(d.getTime()); // Ensure it's a valid date
      })
      .sort((a, b) => parseLocalDate(a[0]).getTime() - parseLocalDate(b[0]).getTime());

    if (logEntries.length === 0) return 'expresiva';

    const cycleStartDates: Date[] = [];
    let lastDate: Date | null = null;

    logEntries.forEach(([dateStr]) => {
      const currentDate = parseLocalDate(dateStr);
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

    // Wraparound: if days exceed cycle length, project into current cycle using modulo
    const effectiveDays = daysIntoCycle >= calculatedCycleLength
      ? daysIntoCycle % calculatedCycleLength
      : daysIntoCycle;

    if (effectiveDays < menstrualPhaseLength) return 'reflexiva';
    if (effectiveDays < calculatedCycleLength * 0.40) return 'dinamica';
    if (effectiveDays < calculatedCycleLength * 0.58) return 'expresiva';
    return 'creativa';
  }

  if (trackingType === 'lunar') {
    const ratio = getLunarDetailsForDate(todayDate).ratio;
    if (ratio <= 0.25) return 'reflexiva';
    if (ratio <= 0.50) return 'dinamica';
    if (ratio <= 0.75) return 'expresiva';
    return 'creativa';
  }

  // Weekly mode: auto-rotate phases every 7 days (Mon-Sun)
  if (trackingType === 'weekly') {
    const today = new Date(todayDate);
    // Get the Monday of the current week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    // Calculate which week of the 4-week rotation we're in
    // Use epoch Monday (Jan 5, 1970) as reference point for consistent rotation
    const epochMonday = new Date(1970, 0, 5); // First Monday of epoch
    const weeksSinceEpoch = Math.floor((monday.getTime() - epochMonday.getTime()) / (7 * DAY_MS));
    const weekInCycle = weeksSinceEpoch % 4;
    
    const phases: BiologicalPhase[] = ['reflexiva', 'dinamica', 'expresiva', 'creativa'];
    return phases[weekInCycle];
  }

  return 'expresiva';
}
