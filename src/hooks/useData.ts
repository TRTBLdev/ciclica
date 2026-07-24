import { useState, useEffect } from 'react';
import { createDefaultConfig, createDemoTasks } from '../data/defaults';
import { getDataKeys, getLocal, setLocal } from '../data/storage';
import { AppTask, Config, HistoryRecord, Intention, ProgressSnapshot } from '../types';
import { migrateDatabase } from '../data/migration';
import { formatDateOnly, getCalendarCycleRange, isRoutineConfigured, parseDateOnly } from '../domain/recurrenceProgress';
import { applyRecurringHistoryContext, reconcileSnapshotsAfterHistoryEdit } from '../domain/historyEditing';
import {
  createHabitResultSnapshot,
  getAutomaticHabitProgress,
  getExpiredHabitOccurrenceRanges,
  getHabitOccurrenceRange,
  getHabitResultsInRange,
  getRoutineCycleProgress,
} from '../domain/occurrenceResults';

export function useData(userId: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<AppTask[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [progressSnapshots, setProgressSnapshots] = useState<ProgressSnapshot[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotRollDay, setSnapshotRollDay] = useState('');
  const [calendarDay, setCalendarDay] = useState(() => formatDateOnly(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setCalendarDay(formatDateOnly(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // In local-first mode, all users store data in localStorage under 'local_user' namespace or their specific userId.
  const effectiveUserId = userId || 'local_user';

  useEffect(() => {
    // --- LOCAL-FIRST OFFLINE MODE ---
    const keys = getDataKeys(effectiveUserId);
    let rawTasks = getLocal<any[]>(keys.tasks, []);
    const rawConfig = getLocal<any>(keys.config, null);
    const rawHistory = getLocal<any[]>(keys.history, []);
    const rawProgressSnapshots = getLocal<ProgressSnapshot[]>(keys.progressSnapshots, []);
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
    setProgressSnapshots(rawProgressSnapshots);
    setIntentions(rawIntentions);

    // Persist migrated clean state.
    setLocal(keys.config, migrated.config);
    setLocal(keys.tasks, migrated.tasks);
    setLocal(keys.history, migrated.history);
    setLocal(keys.progressSnapshots, rawProgressSnapshots);
    setLocal(keys.intentions, rawIntentions);

    setLoading(false);
  }, [effectiveUserId]);

  useEffect(() => {
    if (loading || snapshotRollDay === calendarDay || tasks.length === 0) return;
    setSnapshotRollDay(calendarDay);
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateOnly(yesterday);
    const additions: ProgressSnapshot[] = [];
    const changes: { id: string; updates: Partial<AppTask> }[] = [];
    const existing = new Set(progressSnapshots.map(snapshot => (
      `${snapshot.kind}:${snapshot.taskId}:${snapshot.periodStart}:${snapshot.periodEnd}:${snapshot.resolvedAt || snapshot.periodEnd}`
    )));
    const addSnapshot = (snapshot: Omit<ProgressSnapshot, 'id'>, id: string) => {
      const key = `${snapshot.kind}:${snapshot.taskId}:${snapshot.periodStart}:${snapshot.periodEnd}:${snapshot.resolvedAt || snapshot.periodEnd}`;
      if (existing.has(key)) return;
      additions.push({ id, ...snapshot });
      existing.add(key);
    };

    tasks
      .filter(task => task.type === 'Hábito' && !task.parentId && task.appearanceMode !== 'quota' && !task.quotaTarget)
      .forEach(habit => {
        const ranges = getExpiredHabitOccurrenceRanges(habit, tasks, yesterday);
        ranges.forEach((range, index) => {
          if (progressSnapshots.some(snapshot => snapshot.kind === 'habit-period'
            && snapshot.taskId === habit.id
            && snapshot.periodStart === range.start
            && snapshot.periodEnd === range.end)) return;
          const checklistBelongsToRange = habit.checklistCycleStart === range.start
            || (!habit.checklistCycleStart
              && !!habit.checklist?.some(item => item.done)
              && index === ranges.length - 1);
          const progress = habit.checklist?.length && !checklistBelongsToRange
            ? 0
            : getAutomaticHabitProgress(habit, history, range);
          addSnapshot(
            createHabitResultSnapshot(habit, range, progress, range.end, 'period-end'),
            `progress_roll_${habit.id}_${range.start}_${range.end}`,
          );
        });

        if (habit.checklistCycleStart && habit.checklistCycleStart < calendarDay) {
          const currentRange = getHabitOccurrenceRange(habit, tasks, calendarDay);
          if (habit.checklistCycleStart !== currentRange.start) {
            changes.push({
              id: habit.id,
              updates: {
                checklistCycleStart: undefined,
                checklist: habit.checklist?.map(item => ({ ...item, done: false })),
              },
            });
          }
        }
      });

    tasks.filter(isRoutineConfigured).forEach(routine => {
      const anchor = parseDateOnly(routine.routineCycleAnchorDate || new Date());
      const cursor = new Date(anchor);
      let safety = 0;
      while (cursor <= yesterday && safety < 7300) {
        const dateKey = formatDateOnly(cursor);
        const cycle = getCalendarCycleRange(routine.routineCycleFrequency, routine.routineCycleUnit, cursor);
        if (cycle.end === dateKey) {
          const habits = tasks.filter(task => task.type === 'Hábito' && task.parentId === routine.id);
          habits.forEach(habit => {
            const target = Math.max(1, habit.objetivoPorCiclo || 1);
            const cycleSnapshots = [...progressSnapshots, ...additions];
            const closed = getHabitResultsInRange(habit, history, cycleSnapshots, cycle)
              .filter(result => result.status !== 'missed').length;
            const checklistBelongsToCycle = habit.checklistCycleStart === cycle.start
              || (!habit.checklistCycleStart && !!habit.checklist?.some(item => item.done));
            const progress = habit.checklist?.length && !checklistBelongsToCycle
              ? 0
              : getAutomaticHabitProgress(habit, history, cycle);
            if (closed < target && progress > 0) {
              addSnapshot(
                createHabitResultSnapshot(habit, cycle, progress, cycle.end, 'period-end'),
                `progress_roll_${routine.id}_${habit.id}_${cycle.end}`,
              );
            }
            if (habit.checklistCycleStart === cycle.start && cycle.end <= yesterdayKey) {
              changes.push({
                id: habit.id,
                updates: {
                  checklistCycleStart: undefined,
                  checklist: habit.checklist?.map(item => ({ ...item, done: false })),
                },
              });
            }
          });

          const alreadyClosed = progressSnapshots.some(snapshot => snapshot.kind === 'routine-cycle'
            && snapshot.taskId === routine.id
            && snapshot.periodStart === cycle.start
            && snapshot.periodEnd === cycle.end);
          if (!alreadyClosed) {
            const progress = getRoutineCycleProgress(
              routine,
              tasks,
              history,
              [...progressSnapshots, ...additions],
              cycle.end,
            );
            addSnapshot({
              userId: effectiveUserId,
              kind: 'routine-cycle',
              taskId: routine.id,
              taskSnapshotText: routine.text,
              periodStart: cycle.start,
              periodEnd: cycle.end,
              resolvedAt: cycle.end,
              progressPercent: progress,
              resultStatus: progress >= 100 ? 'complete' : progress > 0 ? 'partial' : 'missed',
              resolutionSource: 'period-end',
              wasCompleted: progress > 0,
              createdAt: `${cycle.end}T23:59:59`,
            }, `progress_roll_${routine.id}_${cycle.end}_cycle`);
          }
        }
        cursor.setDate(cursor.getDate() + 1);
        safety += 1;
      }
    });

    if (additions.length > 0) {
      setProgressSnapshots(prev => {
        const next = [...prev, ...additions];
        setLocal(getDataKeys(effectiveUserId).progressSnapshots, next);
        return next;
      });
    }
    if (changes.length > 0) {
      const uniqueChanges = new Map(changes.map(change => [change.id, change]));
      setTasks(previous => {
        const next = previous.map(task => {
          const change = uniqueChanges.get(task.id);
          return change ? { ...task, ...change.updates, updatedAt: new Date().toISOString() } : task;
        });
        setLocal(getDataKeys(effectiveUserId).tasks, next);
        return next;
      });
    }
  }, [calendarDay, loading, snapshotRollDay, tasks, history, progressSnapshots, effectiveUserId]);

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

  const addProgressSnapshots = async (snapshotData: Omit<ProgressSnapshot, 'id'>[]) => {
    const timestamp = Date.now();
    const snapshots = snapshotData.map((snapshot, index) => ({
      id: `progress_${timestamp}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      ...snapshot,
      userId: effectiveUserId
    } as ProgressSnapshot));
    setProgressSnapshots(prev => {
      const next = [...prev, ...snapshots];
      setLocal(getDataKeys(effectiveUserId).progressSnapshots, next);
      return next;
    });
  };

  const deleteTask = async (taskId: string) => {

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
    const original = history.find(record => record.id === historyId);
    if (!original) return;

    const originalTask = tasks.find(task => task.id === original.taskId);
    const merged = applyRecurringHistoryContext({
      ...original,
      ...updates,
      updatedAt: new Date().toISOString(),
    }, originalTask, tasks);

    const nextHistory = history.map(record => record.id === historyId ? merged : record);
    setHistory(nextHistory);
    setLocal(getDataKeys(effectiveUserId).history, nextHistory);

    setProgressSnapshots(previous => {
      const next = reconcileSnapshotsAfterHistoryEdit(previous, tasks, nextHistory, original, merged);
      setLocal(getDataKeys(effectiveUserId).progressSnapshots, next);
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

  const importLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Config, importedIntentions?: Intention[], importedSnapshots?: ProgressSnapshot[]) => {
    const keys = getDataKeys(effectiveUserId);
    setTasks(importedTasks);
    setHistory(importedHistory);
    setConfig(importedConfig);
    if (importedIntentions) setIntentions(importedIntentions);
    if (importedSnapshots) setProgressSnapshots(importedSnapshots);

    setLocal(keys.tasks, importedTasks);
    setLocal(keys.history, importedHistory);
    setLocal(keys.config, importedConfig);
    if (importedIntentions) setLocal(keys.intentions, importedIntentions);
    if (importedSnapshots) setLocal(keys.progressSnapshots, importedSnapshots);
  };

  const mergeLocalData = (importedTasks: AppTask[], importedHistory: HistoryRecord[], importedConfig: Partial<Config> | null, importedIntentions?: Intention[], importedSnapshots?: ProgressSnapshot[]) => {
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

    if (importedSnapshots && importedSnapshots.length > 0) {
      setProgressSnapshots(prev => {
        const byId = new Map(prev.map(snapshot => [snapshot.id, snapshot]));
        importedSnapshots.forEach(snapshot => byId.set(snapshot.id, snapshot));
        const next = Array.from(byId.values());
        setLocal(keys.progressSnapshots, next);
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
      const tasksToDeleteIds = tasks
        .filter(t => t.type === 'Hábito' || t.type === 'Rutina')
        .map(t => t.id);
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
      setProgressSnapshots(prev => {
        const next = prev.filter(snapshot => !tasksToDeleteIds.includes(snapshot.taskId));
        setLocal(keys.progressSnapshots, next);
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

  return { config, tasks, history, progressSnapshots, intentions, loading, addTask, updateTask, updateTasks, addHistory, addHistoryRecords, addProgressSnapshots, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData, mergeLocalData, clearPartialData, addIntention, updateIntention, deleteIntention };
}
