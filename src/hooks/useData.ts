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

  const [initChecked, setInitChecked] = useState(false);

  useEffect(() => {
    if (loading || initChecked || tasks.length === 0) return;
    setInitChecked(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTime = todayStart.getTime();

    const getFrecuenciaInDays = (freq?: number, unit?: string) => {
      const f = freq || 1;
      const u = unit || 'días';
      if (u === 'semanas') return f * 7;
      if (u === 'meses') return f * 30;
      return f;
    };

    let hasUpdates = false;
    const updatedTasks = tasks.map(t => {
      if ((t.type === 'Rutina' || t.type === 'Hábito') && !t.completed && t.fechaPlanificada) {
        if (t.type === 'Rutina') {
          const childHabitsCount = tasks.filter(sub => sub.parentId === t.id && sub.type === 'Hábito').length;
          if (childHabitsCount > 0) return t; // Rutinas con hábitos se manejan virtualmente
        }
        
        const freqDays = getFrecuenciaInDays(t.frecuencia, t.frecuenciaUnidad);
        const plannedTime = new Date(t.fechaPlanificada).getTime();
        const cycleMs = freqDays * 24 * 60 * 60 * 1000;

        if (todayTime > plannedTime + cycleMs) {
          hasUpdates = true;
          let nextPlanned = new Date(t.fechaPlanificada);
          while (nextPlanned.getTime() + cycleMs <= todayTime) {
            nextPlanned.setDate(nextPlanned.getDate() + freqDays);
          }
          return { ...t, fechaPlanificada: nextPlanned.toISOString(), completed: false };
        }
      }
      return t;
    });

    if (hasUpdates) {
      setTasks(updatedTasks);
      setLocal(`ciclica_local_tasks_${effectiveUserId}`, updatedTasks);
    }
  }, [loading, tasks, initChecked, effectiveUserId]);

  const updateConfig = async (updates: Partial<Config>) => {
    setConfig(prev => {
      const next = prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } as Config : null;
      if (next) setLocal(`ciclica_local_config_${effectiveUserId}`, next);
      return next;
    });
  };

  const addTask = async (taskData: Omit<AppTask, 'id'>) => {
    const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTask = { id: newId, ...taskData, userId: effectiveUserId } as AppTask;
    setTasks(prev => {
      const next = [...prev, newTask];
      setLocal(`ciclica_local_tasks_${effectiveUserId}`, next);
      return next;
    });
  };

  const updateTask = async (taskId: string, updates: Partial<AppTask>) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      setLocal(`ciclica_local_tasks_${effectiveUserId}`, next);
      return next;
    });
  };

  const updateTasks = async (batchUpdates: { id: string; updates: Partial<AppTask> }[]) => {
    setTasks(prev => {
      const next = prev.map(t => {
        const found = batchUpdates.find(upd => upd.id === t.id);
        if (found) {
          return { ...t, ...found.updates, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      setLocal(`ciclica_local_tasks_${effectiveUserId}`, next);
      return next;
    });
  };

  const addHistory = async (recordData: Omit<HistoryRecord, 'id'>) => {
    const newId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRec = { id: newId, ...recordData, userId: effectiveUserId } as HistoryRecord;
    setHistory(prev => {
      const next = [...prev, newRec];
      setLocal(`ciclica_local_history_${effectiveUserId}`, next);
      return next;
    });
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId);
      setLocal(`ciclica_local_tasks_${effectiveUserId}`, next);
      return next;
    });
  };

  const updateHistory = async (historyId: string, updates: Partial<HistoryRecord>) => {
    setHistory(prev => {
      const next = prev.map(h => h.id === historyId ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h);
      setLocal(`ciclica_local_history_${effectiveUserId}`, next);
      return next;
    });
  };

  const deleteHistory = async (historyId: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== historyId);
      setLocal(`ciclica_local_history_${effectiveUserId}`, next);
      return next;
    });
  };

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config) => {
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    setLocal(`ciclica_local_tasks_${effectiveUserId}`, importedTasks);
    setLocal(`ciclica_local_history_${effectiveUserId}`, importedHistory);
    setLocal(`ciclica_local_config_${effectiveUserId}`, importedConfig);
  };

  return { config, tasks, history, loading, addTask, updateTask, updateTasks, addHistory, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData };
}
