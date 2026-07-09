import { useState, useEffect } from 'react';
import { createDefaultConfig, createDemoTasks } from '../data/defaults';
import { getDataKeys, getLocal, setLocal } from '../data/storage';
import { rescheduleOverdueRecurringTasks } from '../data/taskScheduling';
import { AppTask, Config, HistoryRecord, Intention } from '../types';
import { migrateDatabase } from '../data/migration';

export function useData(userId: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
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
    const rawIntentions = getLocal<Intention[]>(keys.intentions, []);

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
    setIntentions(rawIntentions);

    // Persist migrated clean state.
    setLocal(keys.config, migrated.config);
    setLocal(keys.tasks, migrated.tasks);
    setLocal(keys.history, migrated.history);
    setLocal(keys.intentions, rawIntentions);

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
    if (!window.confirm("¿Estás seguro de eliminar este elemento? Perderás el vínculo con su historial pasado.")) {
      return;
    }

    // Preserve task text in history records before deleting
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      setHistory(prev => {
        let changed = false;
        const next = prev.map(h => {
          if (h.taskId === taskId && !h.taskSnapshotText) {
            changed = true;
            return { ...h, taskSnapshotText: taskToDelete.text, updatedAt: new Date().toISOString() };
          }
          return h;
        });
        if (changed) {
          setLocal(getDataKeys(effectiveUserId).history, next);
        }
        return changed ? next : prev;
      });
    }

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

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config, importedIntentions?: Intention[]) => {
    const keys = getDataKeys(effectiveUserId);
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    if (importedIntentions) setIntentions(importedIntentions);

    setLocal(keys.tasks, importedTasks);
    setLocal(keys.history, importedHistory);
    setLocal(keys.config, importedConfig);
    if (importedIntentions) setLocal(keys.intentions, importedIntentions);
  };

  const mergeLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Partial<Config> | null, importedIntentions?: Intention[]) => {
    const keys = getDataKeys(effectiveUserId);

    if (importedTasks && importedTasks.length > 0) {
      setTasks(prev => {
        const next = [...prev];
        importedTasks.forEach(impTask => {
          const idx = next.findIndex(t => t.id === impTask.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...impTask, updatedAt: new Date().toISOString() };
          } else {
            next.push(impTask);
          }
        });
        setLocal(keys.tasks, next);
        return next;
      });
    }

    if (importedHistory && importedHistory.length > 0) {
      setHistory(prev => {
        const next = [...prev];
        importedHistory.forEach(impHist => {
          const idx = next.findIndex(h => h.id === impHist.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...impHist, updatedAt: new Date().toISOString() };
          } else {
            next.push(impHist);
          }
        });
        setLocal(keys.history, next);
        return next;
      });
    }

    if (importedConfig) {
      setConfig(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (importedConfig.cycleConfig) {
          next.cycleConfig = { ...next.cycleConfig, ...importedConfig.cycleConfig };
        }
        if (importedConfig.areas) {
          next.areas = { ...next.areas, ...importedConfig.areas };
        }
        setLocal(keys.config, next);
        return next;
      });
    }

    if (importedIntentions && importedIntentions.length > 0) {
      setIntentions(prev => {
        const next = [...prev];
        importedIntentions.forEach(impIntention => {
          const idx = next.findIndex(i => i.id === impIntention.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...impIntention, updatedAt: new Date().toISOString() };
          } else {
            next.push(impIntention);
          }
        });
        setLocal(keys.intentions, next);
        return next;
      });
    }
  };

  const clearPartialData = (type: 'ciclos' | 'habitos' | 'tareas' | 'intenciones') => {
    const keys = getDataKeys(effectiveUserId);

    if (type === 'ciclos') {
      setConfig(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        next.cycleConfig = {
          ...next.cycleConfig,
          flowLogs: {}
        };
        setLocal(keys.config, next);
        return next;
      });
    } else if (type === 'habitos') {
      setTasks(prev => {
        const next = prev.filter(t => t.type !== 'Hábito' && t.type !== 'Rutina');
        setLocal(keys.tasks, next);
        return next;
      });
      // We could also clear related history, but for simplicity we'll just clear the tasks. 
      // If we want to clear history too:
      setHistory(prev => {
        // Only keep history for tasks that are NOT habits/routines. Wait, we need the tasks list.
        // It's safer to just let history be orphaned, or we can filter it based on current tasks.
        // Let's filter it by finding tasks to delete first.
        const tasksToDeleteIds = tasks.filter(t => t.type === 'Hábito' || t.type === 'Rutina').map(t => t.id);
        const next = prev.filter(h => !tasksToDeleteIds.includes(h.taskId));
        setLocal(keys.history, next);
        return next;
      });
    } else if (type === 'tareas') {
      setTasks(prev => {
        const next = prev.filter(t => t.type !== 'Tarea' && t.type !== 'Proyecto' && t.type !== 'Pulso');
        setLocal(keys.tasks, next);
        return next;
      });
      setHistory(prev => {
        const tasksToDeleteIds = tasks.filter(t => t.type === 'Tarea' || t.type === 'Proyecto' || t.type === 'Pulso').map(t => t.id);
        const next = prev.filter(h => !tasksToDeleteIds.includes(h.taskId));
        setLocal(keys.history, next);
        return next;
      });
      setConfig(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        next.areas = {}; // Reset areas
        setLocal(keys.config, next);
        return next;
      });
    } else if (type === 'intenciones') {
      setIntentions([]);
      setLocal(keys.intentions, []);
    }
  };

  const addIntention = async (intentionData: Omit<Intention, 'id'>) => {
    const newId = `int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const updatedLinkedItems = intentionData.linkedItems?.map(link => ({
      ...link,
      childIntentionId: newId
    }));
    const newIntention = {
      id: newId,
      ...intentionData,
      linkedItems: updatedLinkedItems,
      userId: effectiveUserId
    } as Intention;
    setIntentions(prev => {
      const next = [...prev, newIntention];
      setLocal(getDataKeys(effectiveUserId).intentions, next);
      return next;
    });
  };

  const updateIntention = async (intentionId: string, updates: Partial<Intention>) => {
    setIntentions(prev => {
      const next = prev.map(i => i.id === intentionId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i);
      setLocal(getDataKeys(effectiveUserId).intentions, next);
      return next;
    });
  };

  const deleteIntention = async (intentionId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este elemento? Perderás el vínculo con su historial pasado.")) {
      return;
    }
    
    setIntentions(prev => {
      const next = prev.filter(i => i.id !== intentionId);
      setLocal(getDataKeys(effectiveUserId).intentions, next);
      return next;
    });
  };

  return { config, tasks, history, intentions, loading, addTask, updateTask, updateTasks, addHistory, addHistoryRecords, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData, mergeLocalData, clearPartialData, addIntention, updateIntention, deleteIntention };
}
