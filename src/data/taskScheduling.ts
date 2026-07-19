import { AppTask } from '../types';
import { getNextScheduledDate } from '../domain/recurrenceProgress';

export function getFrequencyInDays(freq?: number, unit?: string) {
  const f = freq || 1;
  const u = unit || 'días';
  if (u === 'semanas') return f * 7;
  if (u === 'meses') return f * 30;
  return f;
}

export function rescheduleOverdueRecurringTasks(tasks: AppTask[], today = new Date()) {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayTime = todayStart.getTime();

  let changed = false;
  const updatedTasks = tasks.map(t => {
    if (t.type === 'Hábito' && t.lastExecutedAt && t.fechaPlanificada && new Date(t.fechaPlanificada).getTime() <= todayTime) {
      changed = true;
      return {
        ...t,
        checklist: t.checklist?.map(item => ({ ...item, done: false })),
        lastExecutedAt: ''
      };
    }
    if ((t.type === 'Rutina' || t.type === 'Hábito') && !t.completed && t.fechaPlanificada) {
      if (t.type === 'Rutina') {
        const childHabitsCount = tasks.filter(sub => sub.parentId === t.id && sub.type === 'Hábito').length;
        if (childHabitsCount > 0) return t;
      }

      let activePlanned = t.fechaPlanificada.slice(0, 10);
      let nextPlanned = getNextScheduledDate(t, activePlanned);

      if (todayTime > new Date(`${nextPlanned}T00:00:00`).getTime()) {
        changed = true;
        while (new Date(`${nextPlanned}T00:00:00`).getTime() <= todayTime) {
          activePlanned = nextPlanned;
          nextPlanned = getNextScheduledDate(t, activePlanned);
        }
        return { ...t, fechaPlanificada: `${activePlanned}T00:00:00.000Z`, completed: false };
      }
    }

    return t;
  });

  return { tasks: updatedTasks, changed };
}
