import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { getTodayPlacement } from './appearance';
import { formatDateOnly, isRoutineConfigured, parseDateOnly } from './recurrenceProgress';

/**
 * Filters pending activities scheduled for a specific date (timeline and flexible).
 * Excludes completed items, effectively paused items, and unconfigured routines.
 */
export function getDailyActivitiesForExport(
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[] = [],
  targetDate: string | Date = new Date(),
): AppTask[] {
  const dateKey = typeof targetDate === 'string' ? targetDate : formatDateOnly(targetDate);
  return tasks.filter(task => {
    if (task.type === 'Rutina' && !isRoutineConfigured(task)) return false;
    const placement = getTodayPlacement(task, tasks, history, snapshots, dateKey);
    return placement === 'timeline' || placement === 'flexible';
  });
}

export interface DateRangeExportItem {
  date: string;
  task: AppTask;
}

/**
 * Collects scheduled pending activities for each day within [startDate, endDate].
 * Evaluates day-by-day so repeating habits/routines or persistent pending tasks
 * are emitted for each date they appear in the timeline/flexible sections.
 */
export function getRangeActivitiesForExport(
  tasks: AppTask[],
  history: HistoryRecord[],
  snapshots: ProgressSnapshot[] = [],
  startDate: string | Date = new Date(),
  endDate: string | Date = new Date(),
): DateRangeExportItem[] {
  const startObj = parseDateOnly(startDate);
  const endObj = parseDateOnly(endDate);

  if (startObj > endObj) return [];

  const items: DateRangeExportItem[] = [];
  const cursor = new Date(startObj);

  while (cursor <= endObj) {
    const dateKey = formatDateOnly(cursor);
    const dayTasks = getDailyActivitiesForExport(tasks, history, snapshots, dateKey);
    for (const task of dayTasks) {
      items.push({ date: dateKey, task });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return items;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsDateTime(date: Date, hours: number, minutes: number): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(hours);
  const mm = pad2(minutes);
  return `${y}${m}${d}T${hh}${mm}00`;
}

function formatIcsDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}${m}${d}`;
}

export interface IcsExportOptions {
  defaultDurationMinutes?: number;
  now?: Date;
}

/**
 * Generates an RFC 5545 compliant .ics string for a range of scheduled items.
 */
export function generateIcsCalendarForRange(
  items: DateRangeExportItem[],
  allTasks: AppTask[],
  options: IcsExportOptions = {},
): string {
  const defaultDuration = options.defaultDurationMinutes ?? 30;
  const now = options.now ?? new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ciclica//MIND Ciclica//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Cíclica - Agenda y Planificación',
  ];

  for (const item of items) {
    const task = item.task;
    const targetDateObj = parseDateOnly(item.date);
    const dateKeyClean = formatIcsDateOnly(targetDateObj);

    // Next calendar day for non-inclusive all-day event DTEND in RFC 5545
    const nextDayObj = new Date(targetDateObj);
    nextDayObj.setDate(nextDayObj.getDate() + 1);
    const nextDateClean = formatIcsDateOnly(nextDayObj);

    const uid = `ciclica-${task.id}-${dateKeyClean}@ciclica.app`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);

    // Build event timings
    if (task.hora && /^\d{1,2}:\d{2}$/.test(task.hora)) {
      const [rawH, rawM] = task.hora.split(':').map(Number);
      const startDateTime = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), rawH, rawM, 0);
      const durationMins = task.duracion && task.duracion > 0 ? Math.round(task.duracion * 60) : defaultDuration;
      const endDateTime = new Date(startDateTime.getTime() + durationMins * 60 * 1000);

      lines.push(`DTSTART:${formatIcsDateTime(startDateTime, startDateTime.getHours(), startDateTime.getMinutes())}`);
      lines.push(`DTEND:${formatIcsDateTime(endDateTime, endDateTime.getHours(), endDateTime.getMinutes())}`);
    } else {
      // Flexible event -> All-day event
      lines.push(`DTSTART;VALUE=DATE:${dateKeyClean}`);
      lines.push(`DTEND;VALUE=DATE:${nextDateClean}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(task.text)}`);

    // Description details
    const descParts: string[] = [];
    if (task.category) {
      descParts.push(`Área: ${task.category}${task.subCategory ? ` / ${task.subCategory}` : ''}`);
    }
    if (task.allocationType) {
      descParts.push(`Asignación: ${task.allocationType === 'fixed' ? 'Soporte Vital' : 'Inversión'}`);
    }

    // If routine, list child habits
    if (task.type === 'Rutina') {
      const childHabits = allTasks.filter(t => t.parentId === task.id && t.type === 'Hábito');
      if (childHabits.length > 0) {
        descParts.push('Hábitos:');
        childHabits.forEach(h => {
          descParts.push(`- ${h.text}`);
        });
      }
    }

    // If checklist exists
    if (task.checklist && task.checklist.length > 0) {
      descParts.push('Subtareas / Checklist:');
      task.checklist.forEach(checkItem => {
        descParts.push(`[${checkItem.done ? 'x' : ' '}] ${checkItem.text}`);
      });
    }

    if (task.notes) {
      descParts.push(`Notas:\n${task.notes}`);
    }

    if (descParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`);
    }

    if (task.category) {
      lines.push(`CATEGORIES:${escapeIcsText(task.category)}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Backward compatible helper for exporting a single day.
 */
export function generateIcsCalendar(
  tasksForDay: AppTask[],
  allTasks: AppTask[],
  targetDate: string | Date,
  options: IcsExportOptions = {},
): string {
  const dateKey = typeof targetDate === 'string' ? targetDate : formatDateOnly(targetDate);
  return generateIcsCalendarForRange(
    tasksForDay.map(task => ({ date: dateKey, task })),
    allTasks,
    options,
  );
}

/**
 * Generates formatted filename for single day or date range export.
 */
export function getIcsRangeFilename(startDate: string | Date, endDate: string | Date): string {
  const startKey = typeof startDate === 'string' ? startDate : formatDateOnly(startDate);
  const endKey = typeof endDate === 'string' ? endDate : formatDateOnly(endDate);
  if (startKey === endKey) {
    return `ciclica_agenda_${startKey}.ics`;
  }
  return `ciclica_agenda_${startKey}_a_${endKey}.ics`;
}
