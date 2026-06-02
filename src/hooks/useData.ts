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

export function useData(userId: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // We enforce local offline mode always using the user ID (e.g. 'local_user')
  const activeUserId = userId || 'local_user';

  useEffect(() => {
    let rawTasks = getLocal<any[]>(`ciclica_local_tasks_${activeUserId}`, []);
    const rawConfig = getLocal<any>(`ciclica_local_config_${activeUserId}`, null);
    const rawHistory = getLocal<any[]>(`ciclica_local_history_${activeUserId}`, []);

    // Execute migration to guarantee complete backward compatibility on startup!
    const migrated = migrateDatabase({
      config: rawConfig || { userId: activeUserId, theme: 'muji', cycleConfig: { trackingType: 'none' }, createdAt: new Date().toISOString() },
      tasks: rawTasks,
      history: rawHistory
    });

    setConfig(migrated.config);
    setTasks(migrated.tasks);
    setHistory(migrated.history);

    // Persist migrated clean state
    setLocal(`ciclica_local_config_${activeUserId}`, migrated.config);
    setLocal(`ciclica_local_tasks_${activeUserId}`, migrated.tasks);
    setLocal(`ciclica_local_history_${activeUserId}`, migrated.history);

    setLoading(false);
  }, [activeUserId]);

  const updateConfig = async (updates: Partial<Config>) => {
    const newConf = { ...config, ...updates, updatedAt: new Date().toISOString() } as Config;
    setConfig(newConf);
    setLocal(`ciclica_local_config_${activeUserId}`, newConf);
  };

  const addTask = async (taskData: Omit<AppTask, 'id'>) => {
    const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTask = { id: newId, ...taskData, userId: activeUserId } as AppTask;
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${activeUserId}`, newTasks);
  };

  const updateTask = async (taskId: string, updates: Partial<AppTask>) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${activeUserId}`, newTasks);
  };

  const addHistory = async (recordData: Omit<HistoryRecord, 'id'>) => {
    const newId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRec = { id: newId, ...recordData, userId: activeUserId } as HistoryRecord;
    const newHist = [...history, newRec];
    setHistory(newHist);
    setLocal(`ciclica_local_history_${activeUserId}`, newHist);
  };

  const deleteTask = async (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    setLocal(`ciclica_local_tasks_${activeUserId}`, newTasks);
  };

  const updateHistory = async (historyId: string, updates: Partial<HistoryRecord>) => {
    const newHist = history.map(h => h.id === historyId ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h);
    setHistory(newHist);
    setLocal(`ciclica_local_history_${activeUserId}`, newHist);
  };

  const deleteHistory = async (historyId: string) => {
    const newHist = history.filter(h => h.id !== historyId);
    setHistory(newHist);
    setLocal(`ciclica_local_history_${activeUserId}`, newHist);
  };

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config) => {
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    setLocal(`ciclica_local_tasks_${activeUserId}`, importedTasks);
    setLocal(`ciclica_local_history_${activeUserId}`, importedHistory);
    setLocal(`ciclica_local_config_${activeUserId}`, importedConfig);
  };

  return { config, tasks, history, loading, addTask, updateTask, addHistory, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData };
}
