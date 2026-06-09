import { AppTask } from '../types';

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
    if ((t.type === 'Rutina' || t.type === 'Hábito') && !t.completed && t.fechaPlanificada) {
      if (t.type === 'Rutina') {
        const childHabitsCount = tasks.filter(sub => sub.parentId === t.id && sub.type === 'Hábito').length;
        if (childHabitsCount > 0) return t;
      }

      const freqDays = getFrequencyInDays(t.frecuencia, t.frecuenciaUnidad);
      const plannedTime = new Date(t.fechaPlanificada).getTime();
      const cycleMs = freqDays * 24 * 60 * 60 * 1000;

      if (todayTime > plannedTime + cycleMs) {
        changed = true;
        let nextPlanned = new Date(t.fechaPlanificada);
        while (nextPlanned.getTime() + cycleMs <= todayTime) {
          nextPlanned.setDate(nextPlanned.getDate() + freqDays);
        }
        return { ...t, fechaPlanificada: nextPlanned.toISOString(), completed: false };
      }
    }

    return t;
  });

  return { tasks: updatedTasks, changed };
}
