import { AppTask, Config, HistoryRecord } from '../types';
import { DEFAULT_AREAS, DEFAULT_SEPARATORS } from './defaults';
import { getFrequencyInDays } from './taskScheduling';
import { normalizePulsePolarity } from '../domain/trackingProgress';
import { getCalendarCycleRange } from '../domain/recurrenceProgress';

interface RawDatabase {
  tasks?: unknown;
  history?: unknown;
  config?: any;
}

export function normalizeConfig(rawConfig: any): Config {
  const config = { ...(rawConfig || {}) };

  if (config.theme !== 'muji' && config.theme !== 'kyoto-dusk') {
    config.theme = 'muji';
  }

  config.areas = config.areas
    ? { ...DEFAULT_AREAS, ...config.areas }
    : DEFAULT_AREAS;

  if (!Array.isArray(config.separators) || config.separators.length === 0) {
    config.separators = DEFAULT_SEPARATORS;
  }

  if (!config.cycleConfig) {
    config.cycleConfig = { trackingType: 'none' };
  } else {
    if (!config.cycleConfig.trackingType) {
      config.cycleConfig.trackingType = 'none';
    }
    if (!config.cycleConfig.flowLogs) {
      config.cycleConfig.flowLogs = {};
    }
  }

  return config as Config;
}

export function normalizeTask(rawTask: any, now = new Date()): AppTask | null {
  const task = { ...rawTask };
  const dateOnly = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;

  if (task.type === 'Meta') {
    return null;
  }

  if (!task.id) {
    task.id = `task_migrated_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  if (task.type === 'Contador' || task.type === 'Evento') {
    task.type = 'Pulso';
  }

  if (!task.type) {
    task.type = 'Tarea';
  }

  if (task.type === 'Pulso') {
    task.currentCount = typeof task.currentCount === 'number' ? task.currentCount : 0;
    task.targetCount = typeof task.targetCount === 'number' ? task.targetCount : 8;
    task.unitLabel = typeof task.unitLabel === 'string' ? task.unitLabel : 'veces';
    task.polaridad = normalizePulsePolarity(task.polaridad);
  }

  if (task.type === 'Rutina' && !task.completionMode) {
    const days = getFrequencyInDays(task.frecuencia, task.frecuenciaUnidad);
    task.completionMode = days <= 7 ? 'auto' : 'manual';
  }

  if ((task.type === 'Rutina' || task.type === 'Hábito') && !task.recurrenceAnchorDate) {
    task.recurrenceAnchorDate = task.fechaPlanificada || task.createdAt || now.toISOString();
  }

  if (task.type === 'Proyecto') {
    task.fechaLimite = dateOnly(task.fechaLimite || task.fechaPlanificada);
  } else if (task.type !== 'Pulso') {
    task.fechaAparicion = dateOnly(task.fechaAparicion || task.fechaPlanificada);
    if (task.type === 'Hábito' || task.type === 'Rutina') {
      task.fechaAparicion ||= dateOnly(task.recurrenceAnchorDate || task.createdAt || now.toISOString());
    }
    task.fechaLimite = dateOnly(task.fechaLimite);
    task.recurrenceAnchorDate = dateOnly(task.recurrenceAnchorDate || task.fechaAparicion);
    task.appearanceFrequency = Math.max(1, task.appearanceFrequency || task.frecuencia || 1);
    task.appearanceFrequencyUnit = task.appearanceFrequencyUnit || task.frecuenciaUnidad || 'días';
    if (!task.appearanceMode && task.fechaAparicion) {
      task.appearanceMode = task.appearanceWeekdays?.length
        ? 'weekdays'
        : (task.type === 'Tarea' && !task.frecuencia ? 'persistent' : 'interval');
    }
    if (task.type === 'Tarea' && task.appearanceMode === 'once') task.appearanceMode = 'persistent';
  }

  if (!task.allocationType) {
    if (task.type === 'Rutina' || task.type === 'Hábito' || task.type === 'Pulso') {
      task.allocationType = 'fixed';
    } else {
      task.allocationType = 'growth';
    }
  }

  task.completed = !!task.completed;
  if (task.type === 'Rutina') task.completed = false;
  task.createdAt = task.createdAt || now.toISOString();

  return task as AppTask;
}

export function normalizeHistoryRecord(rawRecord: any, now = new Date()): HistoryRecord {
  const hist = { ...rawRecord };

  if (!hist.id) {
    hist.id = `hist_migrated_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  hist.date = hist.date || now.toISOString();
  hist.duration = typeof hist.duration === 'number' ? hist.duration : 0;
  hist.createdAt = hist.createdAt || now.toISOString();

  return hist as HistoryRecord;
}

export function migrateDatabase(rawData: RawDatabase): { tasks: AppTask[]; history: HistoryRecord[]; config: Config } {
  console.log("CÍCLICA Migration Engine: Iniciando verificación de esquema local-first...");

  const rawTasks = Array.isArray(rawData.tasks) ? rawData.tasks : [];
  const rawHistory = Array.isArray(rawData.history) ? rawData.history : [];
  let tasks = rawTasks
    .map(t => normalizeTask(t))
    .filter((t): t is AppTask => t !== null);

  // Subtask Migration: flatten the hierarchy and maintain order
  const childrenMap = new Map<string, AppTask[]>();
  tasks.forEach(t => {
    let pId = t.parentId;
    if (!pId || !tasks.find(pt => pt.id === pId)) {
      pId = 'root';
    }
    if (!childrenMap.has(pId)) childrenMap.set(pId, []);
    childrenMap.get(pId)!.push(t);
  });

  childrenMap.forEach(children => {
    children.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });

  const migratedTasks: AppTask[] = [];
  
  const dfs = (task: AppTask, effectiveProjectId: string | undefined) => {
    let newParentId = task.parentId;
    if (task.parentId) {
      const originalParent = tasks.find(t => t.id === task.parentId);
      if (originalParent && originalParent.type === 'Tarea') {
        newParentId = effectiveProjectId;
      }
    }

    let nextEffectiveProjectId = effectiveProjectId;
    if (task.type === 'Proyecto' || task.type === 'Rutina') {
      nextEffectiveProjectId = task.id;
    } else if (!task.parentId || (task.parentId && !tasks.find(pt => pt.id === task.parentId))) {
      nextEffectiveProjectId = undefined; 
    }
    
    const newTask = { ...task };
    if (newParentId) {
      newTask.parentId = newParentId;
    } else {
      delete newTask.parentId;
    }
    
    newTask.order = (migratedTasks.length + 1) * 1000;
    migratedTasks.push(newTask);

    const children = childrenMap.get(task.id) || [];
    children.forEach(child => dfs(child, nextEffectiveProjectId));
  };

  const rootTasks = childrenMap.get('root') || [];
  rootTasks.forEach(rootTask => dfs(rootTask, undefined));
  
  tasks = migratedTasks;

  tasks = tasks.map(task => {
    if (task.type !== 'Hábito' || !task.parentId || task.objetivoPorCiclo) return task;
    const routine = tasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina');
    if (!routine) return task;
    const cycleDays = getFrequencyInDays(routine.routineCycleFrequency, routine.routineCycleUnit);
    const habitDays = getFrequencyInDays(task.frecuencia, task.frecuenciaUnidad);
    return {
      ...task,
      objetivoPorCiclo: Math.max(1, Math.floor(cycleDays / Math.max(1, habitDays))),
      appearanceMode: undefined,
      fechaAparicion: undefined,
    };
  });

  const history = rawHistory.map(h => {
    const record = normalizeHistoryRecord(h);
    if (record.routineId && record.routineCycleStart && record.routineAppearanceDate) return record;
    const habit = tasks.find(task => task.id === record.taskId && task.type === 'Hábito' && !!task.parentId);
    const routine = habit ? tasks.find(task => task.id === habit.parentId && task.type === 'Rutina') : undefined;
    if (!routine) return record;
    const appearanceDate = record.date.slice(0, 10);
    const cycle = getCalendarCycleRange(routine.routineCycleFrequency || 1, routine.routineCycleUnit || 'semanas', appearanceDate);
    return {
      ...record,
      routineId: record.routineId || routine.id,
      routineCycleStart: record.routineCycleStart || cycle.start,
      routineAppearanceDate: record.routineAppearanceDate || appearanceDate,
    };
  });
  const config = normalizeConfig(rawData.config);

  console.log("CÍCLICA Migration Engine: Verificación exitosa. Registros migrados:", {
    tareasCount: tasks.length,
    historialCount: history.length,
    version: 1
  });

  return { tasks, history, config };
}
