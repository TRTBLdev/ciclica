import { AppTask, MomentKind, Separator } from '../types';
import { extractSafeTime, timeToMins } from '../lib/utils';
import { getIsoWeekday, parseDateOnly } from './recurrenceProgress';

export interface ResolvedMoment extends Separator {
  id: string;
  kind: MomentKind;
}

function slugifyMomentText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getStableMomentId(separator: Separator, index: number): string {
  if (separator.id && separator.id.trim()) return separator.id.trim();
  const timeKey = separator.hora.replace(/[^0-9]/g, '') || '0000';
  const slug = slugifyMomentText(separator.text);
  return `mom_${timeKey}_${slug || index}`;
}

export function getAllMoments(separators: Separator[] | undefined): ResolvedMoment[] {
  if (!separators?.length) return [];
  return separators
    .map((separator, index) => ({
      ...separator,
      id: getStableMomentId(separator, index),
      kind: separator.kind || 'time',
    }))
    .sort((a, b) => timeToMins(a.hora) - timeToMins(b.hora));
}

export function getMomentsForDate(
  separators: Separator[] | undefined,
  at: string | Date = new Date(),
): ResolvedMoment[] {
  if (!separators?.length) return [];
  const isoWeekday = getIsoWeekday(parseDateOnly(at));
  return separators
    .map((separator, index) => ({
      ...separator,
      id: getStableMomentId(separator, index),
      kind: separator.kind || 'time',
    }))
    .filter(moment => !moment.weekdays?.length || moment.weekdays.includes(isoWeekday))
    .sort((a, b) => timeToMins(a.hora) - timeToMins(b.hora));
}

export function resolveTaskMomentId(
  task: Pick<AppTask, 'momentId' | 'hora'>,
  moments: ResolvedMoment[],
): string | null {
  if (moments.length === 0) return null;

  if (task.momentId && moments.some(moment => moment.id === task.momentId)) {
    return task.momentId;
  }

  const safeTime = extractSafeTime(task.hora)?.trim();
  if (!safeTime || !/^\d{1,2}:\d{2}$/.test(safeTime)) {
    return null;
  }

  const taskMins = timeToMins(safeTime);
  let matched: ResolvedMoment | undefined;
  for (const moment of moments) {
    if (timeToMins(moment.hora) <= taskMins) {
      matched = moment;
    } else {
      break;
    }
  }

  // Tasks earlier than the first configured moment fall into the first moment.
  return matched ? matched.id : moments[0].id;
}

export function getDefaultExpandedMomentId(
  groups: Array<{ moment: ResolvedMoment; dueCount: number; optionalCount: number }>,
  nowMins: number,
): string | null {
  if (groups.length === 0) return null;

  const firstWithDue = groups.find(group => group.dueCount > 0);
  if (firstWithDue) return firstWithDue.moment.id;

  let currentGroup = groups[0];
  for (const group of groups) {
    if (timeToMins(group.moment.hora) <= nowMins) {
      currentGroup = group;
    } else {
      break;
    }
  }
  return currentGroup.moment.id;
}
