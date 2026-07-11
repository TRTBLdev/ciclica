import { AppTask, HistoryRecord } from '../types';

export interface DecayResult {
  text: string;
  colorClass: string; // Tailwind class name or color style
}

/**
 * Calculates raw days difference between two date/time strings or Dates.
 */
export function getDiffInDays(date1: Date | string, date2: Date | string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Finds the last execution date for a task.
 * Looks first at task.lastExecutedAt, then queries history records.
 */
export function getLastExecutionDate(task: AppTask, history: HistoryRecord[]): Date | null {
  if (task.lastExecutedAt) {
    const d = new Date(task.lastExecutedAt);
    if (!isNaN(d.getTime())) return d;
  }

  if (history && history.length > 0) {
    const taskHistory = history.filter(h => h.taskId === task.id);
    if (taskHistory.length > 0) {
      const dates = taskHistory.map(h => new Date(h.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        return new Date(Math.max(...dates));
      }
    }
  }

  return null;
}

/**
 * Finds the last activity date for a Project (by checking project history or subtask history).
 */
export function getProjectLastActivityDate(task: AppTask, allTasks: AppTask[], history: HistoryRecord[]): Date | null {
  // Get all subtasks
  const subtaskIds = allTasks.filter(t => t.parentId === task.id).map(t => t.id);
  const targetIds = [task.id, ...subtaskIds];

  if (history && history.length > 0) {
    const relevantHistory = history.filter(h => targetIds.includes(h.taskId));
    if (relevantHistory.length > 0) {
      const dates = relevantHistory.map(h => new Date(h.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        return new Date(Math.max(...dates));
      }
    }
  }

  // Fallback to task's own lastExecutedAt or subtask's lastExecutedAt
  const allRelatedTasks = [task, ...allTasks.filter(t => t.parentId === task.id)];
  const dates = allRelatedTasks
    .map(t => t.lastExecutedAt ? new Date(t.lastExecutedAt).getTime() : 0)
    .filter(t => t > 0 && !isNaN(t));

  if (dates.length > 0) {
    return new Date(Math.max(...dates));
  }

  return null;
}

/**
 * Main function to calculate the decay indicator for any task type.
 */
export function getDecayIndicator(
  task: AppTask,
  allTasks: AppTask[],
  history: HistoryRecord[],
  today: Date = new Date()
): DecayResult | null {
  const isCompleted = !!task.completed;

  // 1. HABITS & ROUTINES
  if (task.type === 'Hábito' || task.type === 'Rutina') {
    if (isCompleted) return null; // Don't show decay for completed tasks in Hoy

    const hasFreq = typeof task.frecuencia === 'number' && task.frecuencia > 0;
    const lastExec = getLastExecutionDate(task, history);

    // Common Freq Suffix representation
    const freqSuffix = task.frecuenciaUnidad === 'semanas' ? 's' : task.frecuenciaUnidad === 'meses' ? 'm' : 'd';
    const freqLabel = hasFreq ? `cada ${task.frecuencia}${freqSuffix}` : '';

    if (!lastExec) {
      return null; // Sin historial -> (no mostrar)
    }

    const diasPasados = getDiffInDays(today, lastExec);

    if (hasFreq) {
      let mult = 1;
      if (task.frecuenciaUnidad === 'semanas') mult = 7;
      else if (task.frecuenciaUnidad === 'meses') mult = 30;
      const freqInDays = (task.frecuencia || 1) * mult;

      const ratio = diasPasados / freqInDays;

      if (ratio < 0.5) {
        return {
          text: `· ${freqLabel}`,
          colorClass: 'text-text-dim/40'
        };
      } else if (ratio < 0.95) {
        return null; // Hay margen -> (no mostrar)
      } else if (ratio <= 1.05) {
        return {
          text: `${diasPasados}d · ${freqLabel}`,
          colorClass: 'text-amber-600 dark:text-amber-500 font-medium'
        };
      } else if (ratio <= 1.5) {
        return {
          text: `${diasPasados}d · ${freqLabel}`,
          colorClass: 'text-orange-500 font-medium'
        };
      } else {
        return {
          text: `${diasPasados}d · ${freqLabel}`,
          colorClass: 'text-red-500 font-bold'
        };
      }
    } else {
      // Sin frecuencia: absoluto
      if (diasPasados <= 2) {
        return null; // Fresco -> (no mostrar)
      } else if (diasPasados <= 5) {
        return { text: `${diasPasados}d`, colorClass: 'text-amber-600 dark:text-amber-500 font-medium' };
      } else if (diasPasados <= 9) {
        return { text: `${diasPasados}d`, colorClass: 'text-orange-500 font-medium' };
      } else {
        return { text: `${diasPasados}d`, colorClass: 'text-red-500 font-bold' };
      }
    }
  }

  // 2. TASKS & PROJECTS
  if (task.type === 'Tarea' || task.type === 'Proyecto') {
    // If it has fechaPlanificada, use deadline
    if (task.fechaPlanificada) {
      const diff = getDiffInDays(task.fechaPlanificada, today); // positive = future, negative = past
      const absDiff = Math.abs(diff);

      const dateObj = new Date(task.fechaPlanificada);
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const dateLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

      if (diff >= 3) {
        return null; // Queda tiempo -> (no mostrar)
      } else if (diff > 0) {
        // Próxima (1-2 días)
        return {
          text: `${diff}d · ${dateLabel}`,
          colorClass: 'text-amber-600 dark:text-amber-500'
        };
      } else if (diff === 0) {
        // Hoy
        return {
          text: `0d · ${dateLabel}`,
          colorClass: 'text-orange-500 font-medium'
        };
      } else {
        // Vencida (sin signo negativo)
        return {
          text: `${absDiff}d · ${dateLabel}`,
          colorClass: 'text-red-500 font-bold'
        };
      }
    }

    // Without fechaPlanificada: use momentum
    if (task.type === 'Proyecto') {
      const lastAct = getProjectLastActivityDate(task, allTasks, history);
      if (!lastAct) {
        return {
          text: 'por iniciar',
          colorClass: 'text-text-dim/40'
        };
      }

      const diasSinActividad = getDiffInDays(today, lastAct);

      if (diasSinActividad <= 1) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium'
        };
      } else if (diasSinActividad <= 6) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-amber-600 dark:text-amber-500'
        };
      } else if (diasSinActividad <= 13) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-orange-500'
        };
      } else {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-red-500 font-bold'
        };
      }
    }

    // Tarea sin fecha
    if (task.type === 'Tarea') {
      const lastExec = getLastExecutionDate(task, history);
      if (!lastExec) {
        return {
          text: 'por iniciar',
          colorClass: 'text-text-dim/40'
        };
      }

      const diasSinActividad = getDiffInDays(today, lastExec);

      if (diasSinActividad <= 1) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-emerald-600 dark:text-emerald-500 font-medium'
        };
      } else if (diasSinActividad <= 6) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-amber-600 dark:text-amber-500'
        };
      } else if (diasSinActividad <= 13) {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-orange-500'
        };
      } else {
        return {
          text: `${diasSinActividad}d`,
          colorClass: 'text-red-500 font-bold'
        };
      }
    }
  }

  return null;
}
