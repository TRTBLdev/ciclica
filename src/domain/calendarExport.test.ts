import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import {
  generateIcsCalendar,
  generateIcsCalendarForRange,
  getDailyActivitiesForExport,
  getIcsRangeFilename,
  getRangeActivitiesForExport,
} from './calendarExport';

const makeTask = (overrides: Partial<AppTask>): AppTask => ({
  id: 'test-1',
  userId: 'user-1',
  text: 'Actividad de prueba',
  type: 'Tarea',
  createdAt: '2026-10-25T10:00:00.000Z',
  ...overrides,
});

describe('calendarExport domain', () => {
  const targetDate = '2026-10-25';

  it('filters pending activities scheduled for the target date and excludes completed ones', () => {
    const timedPending = makeTask({
      id: 'task-timed',
      text: 'Revisión matutina',
      hora: '09:00',
      fechaAparicion: targetDate,
      appearanceMode: 'persistent',
    });
    const flexiblePending = makeTask({
      id: 'task-flexible',
      text: 'Lectura estratégica',
      fechaAparicion: targetDate,
      appearanceMode: 'persistent',
    });
    const completedTask = makeTask({
      id: 'task-completed',
      text: 'Tarea ya realizada',
      hora: '08:00',
      fechaAparicion: targetDate,
      appearanceMode: 'persistent',
      completed: true,
    });
    const pausedTask = makeTask({
      id: 'task-paused',
      text: 'Tarea pausada',
      hora: '11:00',
      fechaAparicion: targetDate,
      appearanceMode: 'persistent',
      pauseIntervals: [{ startedAt: '2026-10-20' }],
    });

    const tasks = [timedPending, flexiblePending, completedTask, pausedTask];
    const exportItems = getDailyActivitiesForExport(tasks, [], [], targetDate);

    expect(exportItems.map(t => t.id)).toEqual(['task-timed', 'task-flexible']);
  });

  it('generates compliant RFC 5545 iCalendar content with timed and flexible events', () => {
    const timedTask = makeTask({
      id: 'timed-1',
      text: 'Planificación de foco',
      hora: '10:00',
      duracion: 1.5,
      category: 'MIND',
      subCategory: 'ESTRATEGIA',
    });
    const defaultDurationTask = makeTask({
      id: 'timed-default',
      text: 'Sincronización corta',
      hora: '14:00',
      category: 'BODY',
    });
    const flexibleTask = makeTask({
      id: 'flex-1',
      text: 'Revisión presupuestaria',
      category: 'FINANCE',
    });

    const tasksForDay = [timedTask, defaultDurationTask, flexibleTask];
    const ics = generateIcsCalendar(tasksForDay, tasksForDay, targetDate, {
      now: new Date('2026-10-25T12:00:00.000Z'),
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:Cíclica - Agenda y Planificación');

    // Timed task with 1.5h duration (10:00 to 11:30)
    expect(ics).toContain('DTSTART:20261025T100000');
    expect(ics).toContain('DTEND:20261025T113000');
    expect(ics).toContain('SUMMARY:Planificación de foco');
    expect(ics).toContain('CATEGORIES:MIND');

    // Timed task with default 30 min duration (14:00 to 14:30)
    expect(ics).toContain('DTSTART:20261025T140000');
    expect(ics).toContain('DTEND:20261025T143000');
    expect(ics).toContain('SUMMARY:Sincronización corta');

    // Flexible task as all-day event
    expect(ics).toContain('DTSTART;VALUE=DATE:20261025');
    expect(ics).toContain('DTEND;VALUE=DATE:20261026');
    expect(ics).toContain('SUMMARY:Revisión presupuestaria');

    expect(ics).toContain('END:VCALENDAR');
  });

  it('includes routine child habits in routine event description', () => {
    const routine = makeTask({
      id: 'routine-morning',
      text: 'Ritual de Inicio',
      type: 'Rutina',
      hora: '07:30',
      duracion: 0.75,
      routineCycleFrequency: 1,
      routineCycleUnit: 'días',
    });
    const habit1 = makeTask({
      id: 'h1',
      text: 'Vaso de agua e hidratación',
      type: 'Hábito',
      parentId: routine.id,
    });
    const habit2 = makeTask({
      id: 'h2',
      text: 'Estiramiento 10 min',
      type: 'Hábito',
      parentId: routine.id,
    });

    const allTasks = [routine, habit1, habit2];
    const ics = generateIcsCalendar([routine], allTasks, targetDate);

    expect(ics).toContain('SUMMARY:Ritual de Inicio');
    expect(ics).toContain('Hábitos:\\n- Vaso de agua e hidratación\\n- Estiramiento 10 min');
  });

  it('properly escapes special characters in iCalendar text fields', () => {
    const task = makeTask({
      id: 'task-special',
      text: 'Revisión, notas; y proyecto \\ importante',
      hora: '16:00',
      notes: 'Línea 1\nLínea 2',
    });

    const ics = generateIcsCalendar([task], [task], targetDate);

    expect(ics).toContain('SUMMARY:Revisión\\, notas\\; y proyecto \\\\ importante');
    expect(ics).toContain('Notas:\\nLínea 1\\nLínea 2');
  });

  it('collects activities across a date range and repeats persistent pending tasks per day', () => {
    const persistentTask = makeTask({
      id: 'task-persistent',
      text: 'Hacer revisión',
      hora: '11:00',
      fechaAparicion: '2026-10-25',
      appearanceMode: 'persistent',
    });
    const weekdayHabit = makeTask({
      id: 'habit-weekday',
      text: 'Hábito solo martes',
      type: 'Hábito',
      hora: '15:00',
      fechaAparicion: '2026-10-25',
      appearanceMode: 'weekdays',
      appearanceWeekdays: [2], // 2 = martes (2026-10-27 es martes)
    });

    const tasks = [persistentTask, weekdayHabit];
    const rangeItems = getRangeActivitiesForExport(tasks, [], [], '2026-10-25', '2026-10-27');

    // 2026-10-25 (domingo): persistentTask
    // 2026-10-26 (lunes): persistentTask
    // 2026-10-27 (martes): persistentTask + habit-weekday
    expect(rangeItems).toHaveLength(4);
    expect(rangeItems.filter(item => item.task.id === 'task-persistent')).toHaveLength(3);
    expect(rangeItems.filter(item => item.task.id === 'habit-weekday')).toHaveLength(1);
    expect(rangeItems.find(item => item.task.id === 'habit-weekday')?.date).toBe('2026-10-27');
  });

  it('generates compliant .ics with distinct UIDs and dates for range export', () => {
    const persistentTask = makeTask({
      id: 'task-p',
      text: 'Hacer revisión',
      hora: '11:00',
    });
    const items = [
      { date: '2026-10-25', task: persistentTask },
      { date: '2026-10-26', task: persistentTask },
    ];

    const ics = generateIcsCalendarForRange(items, [persistentTask]);

    expect(ics).toContain('UID:ciclica-task-p-20261025@ciclica.app');
    expect(ics).toContain('UID:ciclica-task-p-20261026@ciclica.app');
    expect(ics).toContain('DTSTART:20261025T110000');
    expect(ics).toContain('DTSTART:20261026T110000');
  });

  it('formats range filenames properly', () => {
    expect(getIcsRangeFilename('2026-10-25', '2026-10-25')).toBe('ciclica_agenda_2026-10-25.ics');
    expect(getIcsRangeFilename('2026-10-25', '2026-10-31')).toBe('ciclica_agenda_2026-10-25_a_2026-10-31.ics');
  });
});
