import { useState, useEffect } from 'react';
import { AppTask, Config, HistoryRecord } from '../types';
import { migrateDatabase } from '../lib/utils';

// Helper to get local data
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = <T>(key: string, val: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Local storage save failed", e);
  }
};

const DEFAULT_AREAS = {
  BODY: { color: 'emerald', categories: ['EJERCICIO', 'DESCANSO', 'NUTRICIÓN'] },
  MIND: { color: 'teal', categories: ['MEDITACIÓN', 'APRENDIZAJE', 'CREATIVIDAD'] },
  FINANCE: { color: 'amber', categories: ['FINANZAS', 'PLANIFICACIÓN', 'TRABAJO'] },
  HOME: { color: 'slate', categories: ['LIMPIEZA', 'MANTENIMIENTO', 'ORDEN'] }
};

export function useData(userId: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // In local-first mode, all users store data in localStorage under 'local_user' namespace or their specific userId
  const effectiveUserId = userId || 'local_user';

  useEffect(() => {
    // --- LOCAL-FIRST OFFLINE MODE ---
    let rawTasks = getLocal<any[]>(`ciclica_local_tasks_${effectiveUserId}`, []);
    const rawConfig = getLocal<any>(`ciclica_local_config_${effectiveUserId}`, null);
    const rawHistory = getLocal<any[]>(`ciclica_local_history_${effectiveUserId}`, []);

    if (rawTasks.length === 0 && !rawConfig) {
      // Pre-load clean defaults on absolute first run
      rawTasks = [
        {
          id: 'task_demo_1',
          userId: effectiveUserId,
          text: 'Movimiento adaptado a mi energía',
          type: 'Hábito',
          category: 'BODY',
          subCategory: 'EJERCICIO',
          completed: false,
          fechaPlanificada: new Date().toISOString(),
          frecuencia: 1,
          frecuenciaUnidad: 'días',
          duracion: 1,
          createdAt: new Date().toISOString()
        },
        {
          id: 'task_demo_2',
          userId: effectiveUserId,
          text: 'Revisión de prioridades y finanzas',
          type: 'Hábito',
          category: 'FINANCE',
          subCategory: 'FINANZAS',
          completed: false,
          fechaPlanificada: new Date().toISOString(),
          frecuencia: 7,
          frecuenciaUnidad: 'días',
          duracion: 0.5,
          createdAt: new Date().toISOString()
        }
      ];
    }

    // Execute migration to guarantee complete backward compatibility on startup!
    const migrated = migrateDatabase({
      config: rawConfig || {
        userId: effectiveUserId,
        theme: 'muji',
        cycleConfig: { trackingType: 'none' },
        areas: DEFAULT_AREAS,
        separators: [
          { hora: "08:00", text: "Mañana", detalle: "Foco e inicio" },
          { hora: "14:00", text: "Tarde", detalle: "Bloque operativo" },
          { hora: "20:00", text: "Noche", detalle: "Descanso y desconexión" }
        ],
        createdAt: new Date().toISOString()
      },
      tasks: rawTasks,
      history: rawHistory
    });

    setConfig(migrated.config);
    setTasks(migrated.tasks);
    setHistory(migrated.history);

    // Persist migrated clean state
    setLocal(`ciclica_local_config_${effectiveUserId}`, migrated.config);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, migrated.tasks);
    setLocal(`ciclica_local_history_${effectiveUserId}`, migrated.history);

    setLoading(false);
  }, [effectiveUserId]);

  const updateConfig = async (updates: Partial<Config>) => {
    const newConf = { ...config, ...updates, updatedAt: new Date().toISOString() } as Config;
    setConfig(newConf);
    setLocal(`ciclica_local_config_${effectiveUserId}`, newConf);
  };

  const addTask = async (taskData: Omit<AppTask, 'id'>) => {
    const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTask = { id: newId, ...taskData, userId: effectiveUserId } as AppTask;
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, newTasks);
  };

  const updateTask = async (taskId: string, updates: Partial<AppTask>) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, newTasks);
  };

  const addHistory = async (recordData: Omit<HistoryRecord, 'id'>) => {
    const newId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRec = { id: newId, ...recordData, userId: effectiveUserId } as HistoryRecord;
    const newHist = [...history, newRec];
    setHistory(newHist);
    setLocal(`ciclica_local_history_${effectiveUserId}`, newHist);
  };

  const deleteTask = async (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, newTasks);
  };

  const updateHistory = async (historyId: string, updates: Partial<HistoryRecord>) => {
    const newHist = history.map(h => h.id === historyId ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h);
    setHistory(newHist);
    setLocal(`ciclica_local_history_${effectiveUserId}`, newHist);
  };

  const deleteHistory = async (historyId: string) => {
    const newHist = history.filter(h => h.id !== historyId);
    setHistory(newHist);
    setLocal(`ciclica_local_history_${effectiveUserId}`, newHist);
  };

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config) => {
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, importedTasks);
    setLocal(`ciclica_local_history_${effectiveUserId}`, importedHistory);
    setLocal(`ciclica_local_config_${effectiveUserId}`, importedConfig);
  };

  return { config, tasks, history, loading, addTask, updateTask, addHistory, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData };
}
