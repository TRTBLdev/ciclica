import { useState, useEffect } from 'react';
import { createDefaultConfig, createDemoTasks } from '../data/defaults';
import { getDataKeys, getLocal, setLocal } from '../data/storage';
import { rescheduleOverdueRecurringTasks } from '../data/taskScheduling';
import { AppTask, Config, HistoryRecord } from '../types';
import { migrateDatabase } from '../data/migration';

export function useData(userId: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [initChecked, setInitChecked] = useState(false);

  // In local-first mode, all users store data in localStorage under 'local_user' namespace or their specific userId.
  const effectiveUserId = userId || 'local_user';

  useEffect(() => {
    // --- LOCAL-FIRST OFFLINE MODE ---
    const keys = getDataKeys(effectiveUserId);
    let rawTasks = getLocal<any[]>(keys.tasks, []);
    const rawConfig = getLocal<any>(keys.config, null);
    const rawHistory = getLocal<any[]>(keys.history, []);

    if (rawTasks.length === 0 && !rawConfig) {
      // Pre-load clean defaults on absolute first run.
      rawTasks = createDemoTasks(effectiveUserId);
    }

    const migrated = migrateDatabase({
      config: rawConfig || createDefaultConfig(effectiveUserId),
      tasks: rawTasks,
      history: rawHistory
    });

    setConfig(migrated.config);
    setTasks(migrated.tasks);
    setHistory(migrated.history);

    // Persist migrated clean state.
    setLocal(keys.config, migrated.config);
    setLocal(keys.tasks, migrated.tasks);
    setLocal(keys.history, migrated.history);

    setLoading(false);
  }, [effectiveUserId]);

  useEffect(() => {
    if (loading || initChecked || tasks.length === 0) return;
    setInitChecked(true);

    const { tasks: updatedTasks, changed } = rescheduleOverdueRecurringTasks(tasks);

    if (changed) {
      setTasks(updatedTasks);
      setLocal(getDataKeys(effectiveUserId).tasks, updatedTasks);
    }
  }, [loading, tasks, initChecked, effectiveUserId]);

  const updateConfig = async (updates: Partial<Config>) => {
    setConfig(prev => {
      const next = prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } as Config : null;
      if (next) setLocal(getDataKeys(effectiveUserId).config, next);
      return next;
    });
  };

  const addTask = async (taskData: Omit<AppTask, 'id'>) => {
    const newId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTask = { id: newId, ...taskData, userId: effectiveUserId } as AppTask;
    setTasks(prev => {
      const next = [...prev, newTask];
      setLocal(getDataKeys(effectiveUserId).tasks, next);
      return next;
    });
  };

  const updateTask = async (taskId: string, updates: Partial<AppTask>) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      setLocal(getDataKeys(effectiveUserId).tasks, next);
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
      setLocal(getDataKeys(effectiveUserId).tasks, next);
      return next;
    });
  };

  const addHistory = async (recordData: Omit<HistoryRecord, 'id'>) => {
    const newId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRec = { id: newId, ...recordData, userId: effectiveUserId } as HistoryRecord;
    setHistory(prev => {
      const next = [...prev, newRec];
      setLocal(getDataKeys(effectiveUserId).history, next);
      return next;
    });
  };

  const addHistoryRecords = async (recordsData: Omit<HistoryRecord, 'id'>[]) => {
    const newRecs = recordsData.map(r => ({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(Math.random() * 1000)}`,
      ...r,
      userId: effectiveUserId
    } as HistoryRecord));
    setHistory(prev => {
      const next = [...prev, ...newRecs];
      setLocal(getDataKeys(effectiveUserId).history, next);
      return next;
    });
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId);
      setLocal(getDataKeys(effectiveUserId).tasks, next);
      return next;
    });
  };

  const updateHistory = async (historyId: string, updates: Partial<HistoryRecord>) => {
    setHistory(prev => {
      const next = prev.map(h => h.id === historyId ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h);
      setLocal(getDataKeys(effectiveUserId).history, next);
      return next;
    });
  };

  const deleteHistory = async (historyId: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== historyId);
      setLocal(getDataKeys(effectiveUserId).history, next);
      return next;
    });
  };

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config) => {
    const keys = getDataKeys(effectiveUserId);
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    setLocal(keys.tasks, importedTasks);
    setLocal(keys.history, importedHistory);
    setLocal(keys.config, importedConfig);
  };

  return { config, tasks, history, loading, addTask, updateTask, updateTasks, addHistory, addHistoryRecords, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData };
}
