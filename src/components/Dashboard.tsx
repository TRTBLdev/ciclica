import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useData } from '../hooks/useData';
import { Target, Compass, Layers, Calendar, Loader, Shapes, LogOut, CheckCircle2, Repeat, BarChart3, Download, Upload, BookOpen, HelpCircle, Settings, Plus, Zap } from 'lucide-react';
import Omnibar from './Omnibar';
import Onboarding from './Onboarding';
import { calculateBiologicalPhase } from '../domain/cycle';
import { cn, isSameDay } from '../lib/utils';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { isPulseSafeDayConfirmation, normalizePulsePolarity } from '../domain/trackingProgress';
import { UserSession } from '../App';
import { ToastProvider } from './ToastProvider';
import { formatDateOnly, getChecklistProgress } from '../domain/recurrenceProgress';
import { canTrackTask, getAppearanceMode, getChildHabitCycleCount, getRoutineCycleRangeForTask, isRoutineCycleClosed, wasChildHabitCompletedInAppearance } from '../domain/appearance';
import { resolveCompletionDuration } from '../domain/workTracking';
import { canCloseProject, getProjectPresentation } from '../domain/projectPresentation';
import {
  createHabitResultSnapshot,
  getHabitOccurrenceRange,
  getRoutineCycleProgress,
  isRoutineReadyToClose,
} from '../domain/occurrenceResults';

const HoyView = lazy(() => import('./HoyView'));
const SintoniaView = lazy(() => import('./SintoniaView'));
const EstrategiaView = lazy(() => import('./EstrategiaView'));
const BitacoraView = lazy(() => import('./BitacoraView'));
const ConfiguracionView = lazy(() => import('./ConfiguracionView'));
const IntentionForm = lazy(() => import('./IntentionForm'));

export default function Dashboard({ user, onSignOut }: { user: UserSession; onSignOut: () => void }) {
  const [currentView, setCurrentView] = useState<'hoy' | 'sintonia' | 'estrategia' | 'bitacora' | 'configuracion'>('hoy');
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const [showIntentionForm, setShowIntentionForm] = useState(false);
  const [showOmnibar, setShowOmnibar] = useState(false);
  const completionLocksRef = useRef(new Set<string>());

  const handleNavigate = (view: string, taskId?: string) => {
    let targetView: typeof currentView = 'hoy';
    if (view === 'hoy' || view === 'foco') targetView = 'hoy';
    else if (view === 'sintonia' || view === 'brujula' || view === 'syllabus') targetView = 'sintonia';
    else if (view === 'estrategia' || view === 'areas' || view === 'proyectos' || view === 'rutinas') targetView = 'estrategia';
    else if (view === 'bitacora' || view === 'calendario' || view === 'reportes' || view === 'completadas') targetView = 'bitacora';
    else if (view === 'configuracion' || view === 'ajustes') targetView = 'configuracion';

    setCurrentView(targetView);
    setShowOmnibar(false);
    if (taskId) {
      setFocusTaskId(taskId);
      setTimeout(() => setFocusTaskId(null), 3000);
    }
  };

  const { config, tasks, history, progressSnapshots, intentions, loading, addTask, updateTask, updateTasks, addHistory, addHistoryRecords, addProgressSnapshots, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData, mergeLocalData, clearPartialData, addIntention, updateIntention, deleteIntention } = useData(user.uid);

  useEffect(() => {
    if (config?.theme === 'kyoto-dusk') {
      document.body.classList.add('theme-kyoto-dusk');
    } else {
      document.body.classList.remove('theme-kyoto-dusk');
    }
  }, [config?.theme]);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('ciclica_onboarding_done') !== 'true';
  });

  // Timer persistent state
  const [activeTimer, setActiveTimer] = useState<{
    taskId: string;
    startTime: string;
    sessionStart?: string;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(`active_timer_${user.uid}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem(`active_timer_${user.uid}`, JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem(`active_timer_${user.uid}`);
    }
  }, [activeTimer, user.uid]);

  const handleStartTimer = (taskId: string) => {
    const task = tasks.find(candidate => candidate.id === taskId);
    if (!task || !canTrackTask(task, tasks, history)) return;

    setShowOmnibar(true);
    if (activeTimer) return;

    const nowStr = new Date().toISOString();
    setActiveTimer({
      taskId,
      startTime: nowStr,
      sessionStart: nowStr,
      elapsedSeconds: 0,
      isRunning: true
    });
  };

  const handleUpdateTimerStartTime = (newStartTimeIso: string) => {
    if (!activeTimer) return;
    setActiveTimer({
      ...activeTimer,
      sessionStart: newStartTimeIso,
      startTime: newStartTimeIso,
      elapsedSeconds: 0
    });
  };

  const handlePauseTimer = () => {
    if (!activeTimer) return;
    const now = new Date().getTime();
    const start = new Date(activeTimer.startTime).getTime();
    const currentElapsed = Math.floor((now - start) / 1000);
    setActiveTimer({
      ...activeTimer,
      elapsedSeconds: activeTimer.elapsedSeconds + currentElapsed,
      isRunning: false
    });
  };

  const handleResumeTimer = () => {
    if (!activeTimer) return;
    setActiveTimer({
      ...activeTimer,
      startTime: new Date().toISOString(),
      isRunning: true
    });
  };

  const handleStopTimer = (completeTask: boolean) => {
    if (!activeTimer) return;

    let totalSecs = activeTimer.elapsedSeconds;
    if (activeTimer.isRunning) {
      const now = new Date().getTime();
      const start = new Date(activeTimer.startTime).getTime();
      totalSecs += Math.floor((now - start) / 1000);
    }

    const finalHours = Math.max(0.01, parseFloat((totalSecs / 3600).toFixed(2)));
    const targetTask = tasks.find(t => t.id === activeTimer.taskId);

    if (targetTask) {
      const sessionStart = activeTimer.sessionStart || activeTimer.startTime;
      const endTime = new Date().toISOString();
      if (completeTask && targetTask.type !== 'Rutina') {
        // Complete the task and add a single custom history log
        handleToggleTask(targetTask, finalHours, sessionStart, endTime);
      } else {
        // Just record history log and keep task open
        addHistory({
          userId: user.uid,
          taskId: targetTask.id,
          date: endTime,
          duration: finalHours,
          createdAt: new Date().toISOString(),
          startTime: sessionStart,
          endTime: endTime,
          isCompletion: false
        });
      }
    }

    setActiveTimer(null);
  };

  const handleDiscardTimer = () => {
    setActiveTimer(null);
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-slate-50/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
        <Loader className="animate-spin text-slate-900 w-8 h-8 mb-4" />
      </div>
    );
  }

  const handleToggleTask = async (task: AppTask, overrideDuration?: number, overrideStartTime?: string, overrideEndTime?: string) => {
    const now = new Date();
    const todayKey = formatDateOnly(now);
    const occurrenceKey = overrideEndTime ? formatDateOnly(new Date(overrideEndTime)) : todayKey;
    const parentRoutine = task.type === 'Hábito' && task.parentId
      ? tasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina')
      : undefined;

    if (task.type === 'Proyecto' && !task.completed) {
      const pendingCount = getProjectPresentation(task, tasks, history, now).pendingCount;
      if (!canCloseProject(task.id, tasks)) {
        window.alert(`No puedes cerrar este proyecto: quedan ${pendingCount} tareas pendientes. Complétalas o muévelas a otro proyecto.`);
        return;
      }
    }

    if (task.type === 'Rutina') {
      if (!isRoutineReadyToClose(task, tasks, history, progressSnapshots, now) || isRoutineCycleClosed(task, progressSnapshots, now)) return;
      const cycle = getRoutineCycleRangeForTask(task, now);
      const progress = getRoutineCycleProgress(task, tasks, history, progressSnapshots, now);
      const lockKey = `routine:${task.id}:${cycle.start}`;
      if (completionLocksRef.current.has(lockKey)) return;
      completionLocksRef.current.add(lockKey);
      try {
        await addHistory({
          userId: user.uid, taskId: task.id, date: now.toISOString(), duration: 0,
          createdAt: now.toISOString(), isCompletion: true, completionPercent: progress,
          routineId: task.id, routineCycleStart: cycle.start, routineAppearanceDate: todayKey,
        });
        await addProgressSnapshots([{
          userId: user.uid, kind: 'routine-cycle', taskId: task.id, taskSnapshotText: task.text,
          periodStart: cycle.start, periodEnd: cycle.end, resolvedAt: todayKey,
          progressPercent: progress,
          resultStatus: progress >= 100 ? 'complete' : 'partial',
          resolutionSource: 'manual', wasCompleted: true, createdAt: now.toISOString(),
        }]);
      } finally {
        completionLocksRef.current.delete(lockKey);
      }
      return;
    }

    if (parentRoutine && (
      wasChildHabitCompletedInAppearance(parentRoutine, task, history, occurrenceKey)
      || getChildHabitCycleCount(parentRoutine, task, history, occurrenceKey, progressSnapshots) >= Math.max(1, task.objetivoPorCiclo || 1)
    )) return;
    const habitOccurrence = task.type === 'Hábito'
      ? getHabitOccurrenceRange(task, tasks, occurrenceKey)
      : undefined;
    if (
      task.type === 'Hábito'
      && !parentRoutine
      && getAppearanceMode(task) !== 'quota'
      && habitOccurrence
      && progressSnapshots.some(snapshot => snapshot.kind === 'habit-period'
        && snapshot.taskId === task.id
        && snapshot.periodStart === habitOccurrence.start
        && snapshot.periodEnd === habitOccurrence.end)
    ) return;
    const habitLockKey = task.type === 'Hábito' ? `habit:${task.id}:${occurrenceKey}` : undefined;
    if (habitLockKey && completionLocksRef.current.has(habitLockKey)) return;
    if (habitLockKey) completionLocksRef.current.add(habitLockKey);
    try {
    const isCompleted = task.type === 'Hábito' ? true : !task.completed;
    const tasksToUpdate: { id: string; updates: Partial<AppTask> }[] = [];
    const historyToAdd: Omit<HistoryRecord, 'id'>[] = [];
    const snapshotsToAdd: Omit<ProgressSnapshot, 'id'>[] = [];

    let effectiveDuration = overrideDuration;
    let effectiveStartTime = overrideStartTime;
    let effectiveEndTime = overrideEndTime;
    const closesActiveTimer = isCompleted && activeTimer?.taskId === task.id && overrideDuration === undefined;
    if (closesActiveTimer && activeTimer) {
      let totalSecs = activeTimer.elapsedSeconds;
      if (activeTimer.isRunning) {
        totalSecs += Math.floor((now.getTime() - new Date(activeTimer.startTime).getTime()) / 1000);
      }
      effectiveDuration = Math.max(0.01, parseFloat((totalSecs / 3600).toFixed(2)));
      effectiveStartTime = activeTimer.sessionStart || activeTimer.startTime;
      effectiveEndTime = now.toISOString();
    }

    const processToggle = (t: AppTask, isComp: boolean, dur?: number, startT?: string, endT?: string) => {
      const sessionEnd = endT || new Date().toISOString();
      const duration = resolveCompletionDuration(t, history, sessionEnd, dur);
      const sessionStart = startT || new Date(new Date(sessionEnd).getTime() - duration * 3600000).toISOString();
      const occurrenceDate = formatDateOnly(new Date(sessionEnd));

      if (isComp) {
        const historyRecord: Omit<HistoryRecord, 'id'> = {
          userId: user.uid,
          taskId: t.id,
          date: sessionEnd,
          duration,
          createdAt: new Date().toISOString(),
          startTime: sessionStart,
          endTime: sessionEnd,
          isCompletion: true,
          completionPercent: t.type === 'Hábito' && t.checklist?.length ? getChecklistProgress(t) : 100,
        };
        if (t.type === 'Hábito' && t.parentId) {
          const routine = tasks.find(candidate => candidate.id === t.parentId && candidate.type === 'Rutina');
          if (routine) {
            const cycle = getRoutineCycleRangeForTask(routine, occurrenceDate);
            historyRecord.routineId = routine.id;
            historyRecord.routineCycleStart = cycle.start;
            historyRecord.routineAppearanceDate = formatDateOnly(new Date(sessionEnd));
          }
        }
        historyToAdd.push(historyRecord);
      }

      if (t.type === 'Hábito') {
        if (isComp) {
          const range = getHabitOccurrenceRange(t, tasks, occurrenceDate);
          snapshotsToAdd.push({
            ...createHabitResultSnapshot(
              t,
              range,
              t.checklist?.length ? getChecklistProgress(t) : 100,
              occurrenceDate,
              'manual',
            ),
            userId: user.uid,
            createdAt: sessionEnd,
          });
          tasksToUpdate.push({
            id: t.id,
            updates: {
              completed: false,
              checklist: t.checklist?.map(item => ({ ...item, done: false })),
              checklistCycleStart: undefined,
              lastExecutedAt: sessionEnd,
            }
          });
        }
      } else if (t.type !== 'Pulso') {
        tasksToUpdate.push({
          id: t.id,
          updates: { completed: isComp, view: isComp ? '' : t.view, lastExecutedAt: isComp ? new Date().toISOString() : '' }
        });

        if (isComp && t.parentId) {
          const parent = tasks.find(p => p.id === t.parentId);
          if (parent && parent.type !== 'Proyecto' && parent.type !== 'Rutina') {
            const siblings = tasks.filter(s => s.parentId === parent.id);
            const allSiblingsDone = siblings.every(s => {
              if (s.id === t.id) return true;
              const updated = tasksToUpdate.find(up => up.id === s.id);
              return updated ? !!updated.updates.completed : s.completed;
            });
            if (allSiblingsDone && !parent.completed) {
              processToggle(parent, true);
            }
          }
        }
      }
    };

    processToggle(task, isCompleted, effectiveDuration, effectiveStartTime, effectiveEndTime);

    if (tasksToUpdate.length > 0) {
      await updateTasks(tasksToUpdate);
    }
    if (historyToAdd.length > 0) {
      await addHistoryRecords(historyToAdd);
    }
    if (snapshotsToAdd.length > 0) {
      await addProgressSnapshots(snapshotsToAdd);
    }
    if (closesActiveTimer) setActiveTimer(null);
    } finally {
      if (habitLockKey) completionLocksRef.current.delete(habitLockKey);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<AppTask>) => {
    // Intercept Pulso daily count increments/decrements to manage history logs
    const task = tasks.find(t => t.id === taskId);
    const effectiveUpdates = task?.type === 'Hábito'
      && updates.checklist?.some(item => item.done)
      && !task.checklistCycleStart
      ? {
        ...updates,
        checklistCycleStart: getHabitOccurrenceRange(task, tasks, new Date()).start,
      }
      : updates;
    if (task && task.type === 'Pulso' && 'currentCount' in updates) {
      const todayLogs = history.filter(h => h.taskId === task.id && isSameDay(h.date, new Date().toISOString()));
      const occurrenceLogs = todayLogs.filter(record => !isPulseSafeDayConfirmation(record));
      const safeDayLogs = todayLogs.filter(isPulseSafeDayConfirmation);
      const oldCount = occurrenceLogs.length;
      const newCount = updates.currentCount || 0;

      if (newCount > oldCount) {
        for (const record of safeDayLogs) await deleteHistory(record.id);
        const diff = newCount - oldCount;
        for (let i = 0; i < diff; i++) {
          await addHistory({
            userId: user.uid,
            taskId: task.id,
            date: new Date().toISOString(),
            duration: 0,
            createdAt: new Date().toISOString()
          });
        }
      } else if (newCount < oldCount) {
        const diff = oldCount - newCount;
        const sortedOccurrences = [...occurrenceLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (let i = 0; i < Math.min(diff, sortedOccurrences.length); i++) {
          await deleteHistory(sortedOccurrences[i].id);
        }
      }
    }
    await updateTask(taskId, effectiveUpdates);
  };

  const handleTogglePulseSafeDay = async (taskId: string) => {
    const task = tasks.find(item => item.id === taskId);
    if (!task || task.type !== 'Pulso' || normalizePulsePolarity(task.polaridad) !== 'Abandonar') return;
    const todayLogs = history.filter(record => record.taskId === taskId && isSameDay(record.date, new Date().toISOString()));
    const confirmation = todayLogs.find(isPulseSafeDayConfirmation);
    if (confirmation) {
      await deleteHistory(confirmation.id);
      return;
    }
    if (todayLogs.some(record => !isPulseSafeDayConfirmation(record))) return;
    const now = new Date().toISOString();
    await addHistory({ userId: user.uid, taskId, date: now, duration: 0, createdAt: now, pulseOutcome: 'safe-day' });
  };

  const handleAddEvent = (task: AppTask) => {
    const endISO = new Date().toISOString();
    const duration = task.duracion || 0;
    const startISO = new Date(new Date().getTime() - duration * 3600000).toISOString();
    addHistory({
      userId: user.uid,
      taskId: task.id,
      date: endISO,
      duration: duration,
      createdAt: new Date().toISOString(),
      startTime: startISO,
      endTime: endISO
    });
  };

  return (
    <ToastProvider>
      <div className={cn(
        "font-sans h-screen w-full flex overflow-hidden transition-all duration-500",
        config?.theme === 'kyoto-dusk' ? "theme-kyoto-dusk bg-[#181512] text-[#f3eae1]" : "bg-[#fbf9f4] text-[#2d2d2d]"
      )}>
        {/* Navigation Sidebar */}
        <div className="hidden md:flex w-[200px] flex-shrink-0 flex-col h-screen border-r border-border-line bg-base z-10 transition-colors duration-500">
          <div className="p-6 border-b border-border-line flex flex-col gap-2 transition-colors duration-500">
            <div>
              <h1 className="text-title mb-1">CICLICA</h1>
              <p className="text-xs text-[#5d5d5d] tracking-wide whitespace-nowrap">
                Gestión Operativa v4.0.0-beta.1
              </p>
            </div>

            {/* Minimal Theme Switcher */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => updateConfig({ theme: 'muji' })}
                className={cn(
                  "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
                  config?.theme === 'muji' ? "bg-[#fbf9f4] border-[#2d2d2d] scale-110 shadow-sm" : "bg-[#fbf9f4] border-[#e4e2dd] hover:scale-105"
                )}
                title="Tema Muji Neutro"
              />
              <button
                onClick={() => updateConfig({ theme: 'kyoto-dusk' })}
                className={cn(
                  "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
                  config?.theme === 'kyoto-dusk' ? "bg-[#181512] border-[#d4af37] scale-110 shadow-sm" : "bg-[#181512] border-[#e4e2dd] hover:scale-105"
                )}
                title="Tema Kyoto Dusk (Premium)"
              />
              <span className="text-[9px] font-mono text-[#a2b29f] uppercase tracking-wider ml-1">
                {config?.theme === 'kyoto-dusk' ? 'Kyoto Dusk' : 'Muji Neutro'}
              </span>
            </div>
          </div>

          <div className="flex flex-col flex-1 py-2 gap-0 overflow-y-auto no-scrollbar">
            <NavButton
              active={showOmnibar}
              icon={<Zap className={cn("w-4 h-4", activeTimer?.isRunning && !showOmnibar ? "text-accent" : "")} />}
              label="Acción"
              onClick={() => setShowOmnibar(!showOmnibar)}
              rightElement={
                activeTimer?.isRunning && !showOmnibar && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-sm ml-auto mr-2" />
                )
              }
            />
            <NavButton
              active={currentView === 'hoy' && !showOmnibar}
              icon={<Target className="w-4 h-4" />}
              label="Foco"
              onClick={() => { setCurrentView('hoy'); setShowOmnibar(false); }}
            />
            <NavButton
              active={currentView === 'sintonia' && !showOmnibar}
              icon={<Compass className="w-4 h-4" />}
              label="Sintonía"
              onClick={() => { setCurrentView('sintonia'); setShowOmnibar(false); }}
            />
            <NavButton
              active={currentView === 'estrategia' && !showOmnibar}
              icon={<Layers className="w-4 h-4" />}
              label="Estrategia y Plan"
              onClick={() => { setCurrentView('estrategia'); setShowOmnibar(false); }}
            />
            <NavButton
              active={currentView === 'bitacora' && !showOmnibar}
              icon={<Calendar className="w-4 h-4" />}
              label="Bitácora"
              onClick={() => { setCurrentView('bitacora'); setShowOmnibar(false); }}
            />
            <NavButton
              active={currentView === 'configuracion' && !showOmnibar}
              icon={<Settings className="w-4 h-4" />}
              label="Ajustes"
              onClick={() => { setCurrentView('configuracion'); setShowOmnibar(false); }}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {showOmnibar && (
            <>
              {/* Desktop Panel */}
              <div className="hidden md:flex fixed top-[10vh] left-[200px] w-[600px] max-h-[80vh] bg-base shadow-2xl z-50 overflow-hidden flex-col animate-in fade-in zoom-in-95 duration-200">
                <Omnibar
                  activeTimer={activeTimer}
                  tasks={tasks}
                  history={history}
                  config={config}
                  onPause={handlePauseTimer}
                  onResume={handleResumeTimer}
                  onStop={handleStopTimer}
                  onDiscard={handleDiscardTimer}
                  onStartTimer={handleStartTimer}
                  onToggleTask={handleToggleTask}
                  onUpdateStartTime={handleUpdateTimerStartTime}
                  onAddTask={addTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={deleteTask}
                  onNavigate={handleNavigate}
                />
              </div>

              {/* Mobile Panel (Bottom Sheet) */}
              <div className="md:hidden fixed bottom-[50px] left-0 right-0 max-h-[85vh] bg-base shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex-col animate-in slide-in-from-bottom duration-300">
                <Omnibar
                  activeTimer={activeTimer}
                  tasks={tasks}
                  history={history}
                  config={config}
                  onPause={handlePauseTimer}
                  onResume={handleResumeTimer}
                  onStop={handleStopTimer}
                  onDiscard={handleDiscardTimer}
                  onStartTimer={handleStartTimer}
                  onToggleTask={handleToggleTask}
                  onUpdateStartTime={handleUpdateTimerStartTime}
                  onAddTask={addTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={deleteTask}
                  onNavigate={handleNavigate}
                />
              </div>

              {/* Backdrop */}
              <div className="fixed inset-0 bg-black/5 z-40 backdrop-blur-[1px]" onClick={() => setShowOmnibar(false)} />
            </>
          )}

          {/* Content */}
          <div className={cn(
            "flex-1 h-screen bg-base overflow-y-auto w-full",
            activeTimer && !showOmnibar
              ? "pb-[80px] md:pb-0"
              : "pb-[100px] md:pb-0"
          )}>
            <Suspense fallback={<ViewLoader />}>
              {currentView === 'hoy' && (
                <HoyView
                  config={config}
                  tasks={tasks}
                  history={history}
                  progressSnapshots={progressSnapshots}
                  onToggleTask={handleToggleTask}
                  onAddEvent={handleAddEvent}
                  onDeleteTask={deleteTask}
                  onUpdateTask={handleUpdateTask}
                  onTogglePulseSafeDay={handleTogglePulseSafeDay}
                  onAddTask={addTask}
                  activeTimer={activeTimer}
                  onStartTimer={handleStartTimer}
                  onUpdateConfig={updateConfig}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'sintonia' && (
                <SintoniaView
                  config={config}
                  onUpdateConfig={updateConfig}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'estrategia' && (
                <EstrategiaView
                  config={config}
                  tasks={tasks}
                  history={history}
                  progressSnapshots={progressSnapshots}
                  intentions={intentions}
                  onUpdateConfig={updateConfig}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={deleteTask}
                  onAddTask={addTask}
                  onUpdateTask={handleUpdateTask}
                  activeTimer={activeTimer}
                  onStartTimer={handleStartTimer}
                  focusTaskId={focusTaskId}
                  onNavigate={handleNavigate}
                />
              )}
              {currentView === 'bitacora' && (
                <BitacoraView
                  config={config}
                  tasks={tasks}
                  history={history}
                  progressSnapshots={progressSnapshots}
                  intentions={intentions}
                  onAddIntention={addIntention}
                  onUpdateIntention={updateIntention}
                  onDeleteIntention={deleteIntention}
                  onOpenIntentions={() => setShowIntentionForm(true)}
                  onToggleTask={handleToggleTask}
                  onDeleteTask={deleteTask}
                  onAddTask={addTask}
                  onUpdateTask={handleUpdateTask}
                  onUpdateConfig={updateConfig}
                  onUpdateHistory={updateHistory}
                  onDeleteHistory={deleteHistory}
                  onAddHistory={addHistory}
                />
              )}
              {currentView === 'configuracion' && (
                <ConfiguracionView
                  config={config}
                  onUpdateConfig={updateConfig}
                  tasks={tasks}
                  history={history}
                  progressSnapshots={progressSnapshots}
                  intentions={intentions}
                  onSignOut={onSignOut}
                  importLocalData={importLocalData}
                  mergeLocalData={mergeLocalData}
                  clearPartialData={clearPartialData}
                  onNavigate={handleNavigate}
                />
              )}
            </Suspense>
          </div>

          {/* Mobile Tabs fixed at the bottom */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-[50px] flex bg-base border-t border-border-line overflow-x-auto no-scrollbar z-50 shadow-md">
            <NavButton
              isMobile
              active={showOmnibar}
              icon={<Zap className={cn("w-4 h-4", activeTimer?.isRunning && !showOmnibar ? "text-accent" : "")} />}
              label="Acción"
              onClick={() => setShowOmnibar(!showOmnibar)}
              rightElement={
                activeTimer?.isRunning && !showOmnibar && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-sm absolute right-2" />
                )
              }
            />
            <NavButton
              isMobile
              active={currentView === 'hoy' && !showOmnibar}
              icon={<Target className="w-4 h-4" />}
              label="Foco"
              onClick={() => { setCurrentView('hoy'); setShowOmnibar(false); }}
            />
            <NavButton
              isMobile
              active={currentView === 'sintonia' && !showOmnibar}
              icon={<Compass className="w-4 h-4" />}
              label="Sintonía"
              onClick={() => { setCurrentView('sintonia'); setShowOmnibar(false); }}
            />
            <NavButton
              isMobile
              active={currentView === 'estrategia' && !showOmnibar}
              icon={<Layers className="w-4 h-4" />}
              label="Estrategia"
              onClick={() => { setCurrentView('estrategia'); setShowOmnibar(false); }}
            />
            <NavButton
              isMobile
              active={currentView === 'bitacora' && !showOmnibar}
              icon={<Calendar className="w-4 h-4" />}
              label="Bitácora"
              onClick={() => { setCurrentView('bitacora'); setShowOmnibar(false); }}
            />
            <NavButton
              isMobile
              active={currentView === 'configuracion' && !showOmnibar}
              icon={<Settings className="w-4 h-4" />}
              label="Ajustes"
              onClick={() => { setCurrentView('configuracion'); setShowOmnibar(false); }}
            />
          </div>
        </div>

        {showOnboarding && (
          <Onboarding
            config={config}
            onUpdateConfig={updateConfig}
            onAddTask={addTask}
            onClose={() => setShowOnboarding(false)}
            onBackToLogin={onSignOut}
          />
        )}

        {showIntentionForm && config && (
          <Suspense fallback={null}>
            <IntentionForm
              isOpen={showIntentionForm}
              onClose={() => setShowIntentionForm(false)}
              config={config}
              tasks={tasks}
              history={history}
              intentions={intentions}
              onSave={addIntention}
              onUpdate={updateIntention}
              onDelete={deleteIntention}
            />
          </Suspense>
        )}
      </div>
    </ToastProvider>
  );
}

function ViewLoader() {
  return (
    <div className="min-h-full flex items-center justify-center py-16">
      <Loader className="animate-spin text-slate-900 w-6 h-6" />
    </div>
  );
}

function NavButton({ active, icon, label, onClick, isMobile, rightElement }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, isMobile?: boolean, rightElement?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative shrink-0 flex items-center justify-start gap-4 px-6 h-10 transition-colors text-left",
        isMobile && "flex-row gap-1.5 justify-center px-3",
        active ? "text-text-main" : "text-text-dim hover:bg-[var(--color-border-line)]/30 hover:text-text-main"
      )}
    >
      {icon}
      <span className={cn("text-sm font-light font-sans", isMobile && "text-[10px] tracking-wide uppercase", active && !isMobile && "font-normal", active && isMobile && "font-bold")}>{label}</span>
      {rightElement}
      {active && (
        isMobile ? (
          <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--color-text-main)]" />
        ) : (
          <div className="absolute right-0 top-2 bottom-2 w-[3px] bg-[var(--color-text-main)]" />
        )
      )}
    </button>
  );
}
