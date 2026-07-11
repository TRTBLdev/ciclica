import { BiologicalPhase, Config, Intention, IntentionScale } from '../types';
import { calculateBiologicalPhase, getCycleProjections } from './cycle';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
}

function formatRangeText(startStr: string, endStr: string): string {
  const startParts = startStr.split('-');
  const endParts = endStr.split('-');
  if (startParts.length !== 3 || endParts.length !== 3) return `${startStr} / ${endStr}`;

  const startYear = startParts[0];
  const startMonth = MONTH_NAMES[parseInt(startParts[1], 10) - 1];
  const startDay = parseInt(startParts[2], 10);

  const endYear = endParts[0];
  const endMonth = MONTH_NAMES[parseInt(endParts[1], 10) - 1];
  const endDay = parseInt(endParts[2], 10);

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }
  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
}

export function getCycleRange(config: Config | null, todayDate = new Date()) {
  const isFixed = !config || config.cycleConfig?.trackingType === 'none';

  if (isFixed) {
    const d = new Date(todayDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start.getTime() + 27 * DAY_MS);
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end)
    };
  }

  if (config.cycleConfig?.trackingType === 'weekly') {
    const today = new Date(todayDate);
    const epochMonday = new Date(1970, 0, 5);
    const daysSinceEpoch = Math.floor((today.getTime() - epochMonday.getTime()) / DAY_MS);
    const cycleDaysSinceEpoch = daysSinceEpoch - (daysSinceEpoch % 28);
    const start = new Date(epochMonday.getTime() + cycleDaysSinceEpoch * DAY_MS);
    const end = new Date(start.getTime() + 27 * DAY_MS);
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end)
    };
  }

  const projections = getCycleProjections(config);
  if (!projections) {
    const start = new Date(todayDate);
    const end = new Date(start.getTime() + 27 * DAY_MS);
    return { start: formatLocalDate(start), end: formatLocalDate(end) };
  }

  const todayTime = todayDate.getTime();

  // First check past cycles
  for (const c of projections.pastCycles) {
    const s = parseLocalDate(c.startDate).getTime();
    const e = parseLocalDate(c.endDate).getTime();
    if (todayTime >= s && todayTime <= e) {
      return { start: c.startDate, end: c.endDate };
    }
  }

  // Then check projected cycles
  for (const p of projections.projectedPeriods) {
    const s = p.startDate.getTime();
    const e = p.endDate.getTime();
    if (todayTime >= s && todayTime <= e) {
      return { start: formatLocalDate(p.startDate), end: formatLocalDate(p.endDate) };
    }
  }

  // Fallback to the most recent cycle if today is in a gap
  if (projections.pastCycles.length > 0) {
    const mostRecent = projections.pastCycles[0];
    return { start: mostRecent.startDate, end: mostRecent.endDate };
  }

  if (projections.projectedPeriods.length > 0) {
    const firstProj = projections.projectedPeriods[0];
    return { start: formatLocalDate(firstProj.startDate), end: formatLocalDate(firstProj.endDate) };
  }

  const start = new Date(todayDate);
  const end = new Date(start.getTime() + 27 * DAY_MS);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

export function getPhaseRange(config: Config | null, todayDate = new Date()) {
  const currentPhase = calculateBiologicalPhase(config, todayDate);
  const isFixed = !config || config.cycleConfig?.trackingType === 'none';

  if (isFixed) {
    const d = new Date(todayDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday.getTime() + 6 * DAY_MS);
    return {
      start: formatLocalDate(monday),
      end: formatLocalDate(sunday),
      phaseName: currentPhase
    };
  }

  if (config.cycleConfig?.trackingType === 'weekly') {
    const d = new Date(todayDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday.getTime() + 6 * DAY_MS);
    return {
      start: formatLocalDate(monday),
      end: formatLocalDate(sunday),
      phaseName: currentPhase
    };
  }

  const cycle = getCycleRange(config, todayDate);
  const cycleStartLimit = parseLocalDate(cycle.start);
  const cycleEndLimit = parseLocalDate(cycle.end);

  const biologicalPhase = calculateBiologicalPhase(config, todayDate, true);

  let start = new Date(todayDate);
  for (let i = 0; i < 40; i++) {
    const prev = new Date(start.getTime() - DAY_MS);
    if (prev < cycleStartLimit || calculateBiologicalPhase(config, prev, true) !== biologicalPhase) {
      break;
    }
    start = prev;
  }

  let end = new Date(todayDate);
  for (let i = 0; i < 40; i++) {
    const next = new Date(end.getTime() + DAY_MS);
    if (next > cycleEndLimit || calculateBiologicalPhase(config, next, true) !== biologicalPhase) {
      break;
    }
    end = next;
  }

  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
    phaseName: currentPhase
  };
}

export function getQuarterRange(configOrDate?: Config | Date | null, todayDate = new Date()) {
  let config: Config | null = null;
  let today = todayDate;

  if (configOrDate instanceof Date) {
    today = configOrDate;
  } else if (configOrDate !== undefined) {
    config = configOrDate;
  }

  // If custom config is personal and defined
  if (config?.quarterConfig?.type === 'personal') {
    const Y = today.getFullYear();
    const qc = config.quarterConfig;
    const quarters: Array<{ key: 'Q1' | 'Q2' | 'Q3' | 'Q4'; range?: { start: string; end: string } }> = [
      { key: 'Q1', range: qc.q1 },
      { key: 'Q2', range: qc.q2 },
      { key: 'Q3', range: qc.q3 },
      { key: 'Q4', range: qc.q4 },
    ];

    for (const q of quarters) {
      if (!q.range) continue;
      const [startM, startD] = q.range.start.split('-').map(Number);
      const [endM, endD] = q.range.end.split('-').map(Number);

      if (startM <= endM) {
        // Range does not cross year boundary
        const startCand = new Date(Y, startM - 1, startD);
        const endCand = new Date(Y, endM - 1, endD, 23, 59, 59, 999);
        if (today >= startCand && today <= endCand) {
          return {
            start: formatLocalDate(startCand),
            end: formatLocalDate(endCand),
            qKey: q.key
          };
        }
      } else {
        // Range crosses year boundary
        // Candidate 1: starts in Y-1, ends in Y
        const startCand1 = new Date(Y - 1, startM - 1, startD);
        const endCand1 = new Date(Y, endM - 1, endD, 23, 59, 59, 999);
        if (today >= startCand1 && today <= endCand1) {
          return {
            start: formatLocalDate(startCand1),
            end: formatLocalDate(endCand1),
            qKey: q.key
          };
        }

        // Candidate 2: starts in Y, ends in Y+1
        const startCand2 = new Date(Y, startM - 1, startD);
        const endCand2 = new Date(Y + 1, endM - 1, endD, 23, 59, 59, 999);
        if (today >= startCand2 && today <= endCand2) {
          return {
            start: formatLocalDate(startCand2),
            end: formatLocalDate(endCand2),
            qKey: q.key
          };
        }
      }
    }
  }

  // Fallback to standard calendar quarters
  const year = today.getFullYear();
  const month = today.getMonth();
  let startMonth = 0;
  let endMonth = 2;
  let qKey: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q1';

  if (month >= 3 && month <= 5) {
    startMonth = 3;
    endMonth = 5;
    qKey = 'Q2';
  } else if (month >= 6 && month <= 8) {
    startMonth = 6;
    endMonth = 8;
    qKey = 'Q3';
  } else if (month >= 9 && month <= 11) {
    startMonth = 9;
    endMonth = 11;
    qKey = 'Q4';
  }

  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, endMonth + 1, 0);

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate),
    qKey
  };
}

export function getCalendarWeekRange(todayDate = new Date()) {
  const d = new Date(todayDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end)
  };
}

export function getCalendarMonthRange(todayDate = new Date()) {
  const start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const end = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end)
  };
}

export function getYearRange(todayDate = new Date()) {
  const year = todayDate.getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate)
  };
}

export function generatePeriodLabel(scale: IntentionScale, start: string, end: string, phaseName?: BiologicalPhase, qKey?: string): string {
  if (scale === 'phase') {
    return `Semana · ${formatRangeText(start, end)}`;
  }
  if (scale === 'cycle') {
    return `Mes · ${formatRangeText(start, end)}`;
  }
  if (scale === 'quarter') {
    if (qKey) {
      return `${qKey} ${start.split('-')[0]}`;
    }
    const startParts = start.split('-');
    const year = startParts[0];
    const month = parseInt(startParts[1], 10);
    let q = 'Q1';
    if (month === 4) q = 'Q2';
    else if (month === 7) q = 'Q3';
    else if (month === 10) q = 'Q4';
    return `${q} ${year}`;
  }
  if (scale === 'year') {
    return start.split('-')[0];
  }
  return `${start} / ${end}`;
}

export function getCurrentPeriod(scale: IntentionScale | 'free', config: Config | null, todayDate = new Date()) {
  if (scale === 'free') {
    return { start: '', end: '', label: 'Todo el tiempo' };
  }
  if (scale === 'phase') {
    const range = getCalendarWeekRange(todayDate);
    const label = generatePeriodLabel('phase', range.start, range.end);
    return { start: range.start, end: range.end, label };
  }
  if (scale === 'cycle') {
    const range = getCalendarMonthRange(todayDate);
    const label = generatePeriodLabel('cycle', range.start, range.end);
    return { start: range.start, end: range.end, label };
  }
  if (scale === 'quarter') {
    const range = getQuarterRange(config, todayDate);
    const label = generatePeriodLabel('quarter', range.start, range.end, undefined, range.qKey);
    return { start: range.start, end: range.end, label };
  }
  // scale === 'year'
  const range = getYearRange(todayDate);
  const label = generatePeriodLabel('year', range.start, range.end);
  return { start: range.start, end: range.end, label };
}

export function findIntentionForPeriod(intentions: Intention[], scale: IntentionScale, start: string, end: string): Intention | undefined {
  return intentions.find(i => i.scale === scale && i.periodStart === start && i.periodEnd === end);
}
