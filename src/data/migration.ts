import { AppTask, Config, HistoryRecord } from '../types';
import { DEFAULT_AREAS, DEFAULT_SEPARATORS } from './defaults';

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

export function normalizeTask(rawTask: any, now = new Date()): AppTask {
  const task = { ...rawTask };

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
  }

  task.completed = !!task.completed;
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
  const tasks = rawTasks.map(t => normalizeTask(t));
  const history = rawHistory.map(h => normalizeHistoryRecord(h));
  const config = normalizeConfig(rawData.config);

  console.log("CÍCLICA Migration Engine: Verificación exitosa. Registros migrados:", {
    tareasCount: tasks.length,
    historialCount: history.length,
    version: 1
  });

  return { tasks, history, config };
}
