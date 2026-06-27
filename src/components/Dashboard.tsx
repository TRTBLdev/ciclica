import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { Target, Compass, Layers, Calendar, Loader, Shapes, LogOut, CheckCircle2, Repeat, BarChart3, Download, Upload, BookOpen, HelpCircle, Settings } from 'lucide-react';
import FloatingTimer from './FloatingTimer';
import Onboarding from './Onboarding';
import { calculateBiologicalPhase } from '../domain/cycle';
import { cn, isSameDay, isFutureDate } from '../lib/utils';
import { AppTask, HistoryRecord } from '../types';
import { UserSession } from '../App';
import { ToastProvider } from './ToastProvider';

const HoyView = lazy(() => import('./HoyView'));
const SintoniaView = lazy(() => import('./SintoniaView'));
const EstrategiaView = lazy(() => import('./EstrategiaView'));
const BitacoraView = lazy(() => import('./BitacoraView'));
const ConfiguracionView = lazy(() => import('./ConfiguracionView'));

export default function Dashboard({ user, onSignOut }: { user: UserSession; onSignOut: () => void }) {
  const [currentView, setCurrentView] = useState<'hoy' | 'sintonia' | 'estrategia' | 'bitacora' | 'configuracion'>('hoy');
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  
  const handleNavigate = (view: string, taskId?: string) => {
    let targetView: typeof currentView = 'hoy';
    if (view === 'hoy' || view === 'foco') targetView = 'hoy';
    else if (view === 'sintonia' || view === 'brujula' || view === 'syllabus') targetView = 'sintonia';
    else if (view === 'estrategia' || view === 'areas' || view === 'proyectos' || view === 'rutinas') targetView = 'estrategia';
    else if (view === 'bitacora' || view === 'calendario' || view === 'reportes' || view === 'completadas') targetView = 'bitacora';
    else if (view === 'configuracion' || view === 'ajustes') targetView = 'configuracion';

    setCurrentView(targetView);
    if (taskId) {
      setFocusTaskId(taskId);
      setTimeout(() => setFocusTaskId(null), 3000);
    }
  };

  const { config, tasks, history, loading, addTask, updateTask, updateTasks, addHistory, addHistoryRecords, deleteTask, updateConfig, updateHistory, deleteHistory, importLocalData, mergeLocalData, clearPartialData } = useData(user.uid);

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
      if (completeTask) {
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
    const isCompleted = task.type === 'Hábito'
      ? !isFutureDate(task.fechaPlanificada)
      : !task.completed;
    const tasksToUpdate: { id: string; updates: Partial<AppTask> }[] = [];
    const historyToAdd: Omit<HistoryRecord, 'id'>[] = [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const getNextPlannedDate = (plannedDateStr: string | undefined, freq: number, unit: string) => {
      let nextPlan = new Date(plannedDateStr || new Date().toISOString());
      let daysToAdd = freq || 1;
      if (unit === 'semanas') daysToAdd *= 7;
      if (unit === 'meses') daysToAdd *= 30;
      
      nextPlan.setDate(nextPlan.getDate() + daysToAdd);
      while (nextPlan.getTime() < todayStart.getTime()) {
        nextPlan.setDate(nextPlan.getDate() + daysToAdd);
      }
      return nextPlan.toISOString();
    };

    const processToggle = (t: AppTask, isComp: boolean, dur?: number, startT?: string, endT?: string) => {
      let duration = dur !== undefined ? dur : (t.duracion || 0);
      if (t.type === 'Proyecto') {
        const hasChildren = tasks.some(sub => sub.parentId === t.id);
        if (hasChildren) duration = 0;
      }
      const sessionStart = startT || new Date(new Date().getTime() - duration * 3600000).toISOString();
      const sessionEnd = endT || new Date().toISOString();

      if (isComp) {
        historyToAdd.push({
          userId: user.uid,
          taskId: t.id,
          date: sessionEnd,
          duration,
          createdAt: new Date().toISOString(),
          startTime: sessionStart,
          endTime: sessionEnd,
          isCompletion: true
        });
      }

      if (t.type === 'Hábito' || t.type === 'Rutina') {
        if (isComp) {
          if (t.type === 'Rutina') {
            const childHabits = tasks.filter(sub => sub.parentId === t.id && sub.type === 'Hábito');
            if (childHabits.length > 0) {
              childHabits.forEach(ch => {
                const isChDue = !isFutureDate(ch.fechaPlanificada);
                if (isChDue) {
                  const chNextDate = getNextPlannedDate(ch.fechaPlanificada, ch.frecuencia || 1, ch.frecuenciaUnidad || 'días');
                  tasksToUpdate.push({
                    id: ch.id,
                    updates: { completed: false, fechaPlanificada: chNextDate, lastExecutedAt: new Date().toISOString() }
                  });
                  historyToAdd.push({
                    userId: user.uid,
                    taskId: ch.id,
                    date: sessionEnd,
                    duration: 0,
                    createdAt: new Date().toISOString(),
                    isCompletion: true
                  });
                }
              });
            }
          }

          const nextPlannedStr = getNextPlannedDate(t.fechaPlanificada, t.frecuencia || 1, t.frecuenciaUnidad || 'días');
          tasksToUpdate.push({
            id: t.id,
            updates: { completed: false, fechaPlanificada: nextPlannedStr, lastExecutedAt: new Date().toISOString() }
          });
        } else {
          tasksToUpdate.push({
            id: t.id,
            updates: { completed: false, fechaPlanificada: new Date().toISOString(), lastExecutedAt: '' }
          });
        }
      } else if (t.type !== 'Pulso') {
        tasksToUpdate.push({
          id: t.id,
          updates: { completed: isComp, view: isComp ? '' : t.view, lastExecutedAt: isComp ? new Date().toISOString() : '' }
        });

        if (isComp && t.parentId) {
          const parent = tasks.find(p => p.id === t.parentId);
          if (parent && parent.type !== 'Proyecto') {
            if (parent.type === 'Rutina' && parent.completionMode === 'manual') {
              // Si el parent es una Rutina con modo manual, no auto-completar
            } else {
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
      }
    };

    processToggle(task, isCompleted, overrideDuration, overrideStartTime, overrideEndTime);

    if (tasksToUpdate.length > 0) {
      await updateTasks(tasksToUpdate);
    }
    if (historyToAdd.length > 0) {
      await addHistoryRecords(historyToAdd);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<AppTask>) => {
    // Intercept Pulso daily count increments/decrements to manage history logs
    const task = tasks.find(t => t.id === taskId);
    if (task && task.type === 'Pulso' && 'currentCount' in updates) {
      const todayLogs = history.filter(h => h.taskId === task.id && isSameDay(h.date, new Date().toISOString()));
      const oldCount = todayLogs.length;
      const newCount = updates.currentCount || 0;

      if (newCount > oldCount) {
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
        const sortedTodayLogs = [...todayLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (let i = 0; i < Math.min(diff, sortedTodayLogs.length); i++) {
          await deleteHistory(sortedTodayLogs[i].id);
        }
      }
    }
    await updateTask(taskId, updates);
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
            active={currentView === 'hoy'} 
            icon={<Target className="w-4 h-4" />} 
            label="Foco" 
            onClick={() => setCurrentView('hoy')} 
          />
          <NavButton 
            active={currentView === 'sintonia'} 
            icon={<Compass className="w-4 h-4" />} 
            label="Sintonía" 
            onClick={() => setCurrentView('sintonia')} 
          />
          <NavButton 
            active={currentView === 'estrategia'} 
            icon={<Layers className="w-4 h-4" />} 
            label="Estrategia y Plan" 
            onClick={() => setCurrentView('estrategia')} 
          />
          <NavButton 
            active={currentView === 'bitacora'} 
            icon={<Calendar className="w-4 h-4" />} 
            label="Bitácora" 
            onClick={() => setCurrentView('bitacora')} 
          />
          <NavButton 
            active={currentView === 'configuracion'} 
            icon={<Settings className="w-4 h-4" />} 
            label="Ajustes" 
            onClick={() => setCurrentView('configuracion')} 
          />
        </div>
          
        <div className="flex flex-col gap-0 border-t border-border-line bg-base">
          <FloatingTimer 
            activeTimer={activeTimer}
            tasks={tasks}
            onPause={handlePauseTimer}
            onResume={handleResumeTimer}
            onStop={handleStopTimer}
            onDiscard={handleDiscardTimer}
            onStartTimer={handleStartTimer}
            onUpdateStartTime={handleUpdateTimerStartTime}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Content */}
        <div className={cn(
          "flex-1 h-screen bg-base overflow-y-auto w-full pb-[60px] md:pb-0",
          activeTimer && (isTimerMinimized ? "pb-[112px] md:pb-0" : "pb-[270px] md:pb-0")
        )}>
          <Suspense fallback={<ViewLoader />}>
            {currentView === 'hoy' && (
              <HoyView 
                config={config} 
                tasks={tasks} 
                history={history} 
                onToggleTask={handleToggleTask}
                onAddEvent={handleAddEvent}
                onDeleteTask={deleteTask}
                onUpdateTask={handleUpdateTask}
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
            active={currentView === 'hoy'} 
            icon={<Target className="w-4 h-4" />} 
            label="Foco" 
            onClick={() => setCurrentView('hoy')} 
          />
          <NavButton 
            isMobile
            active={currentView === 'sintonia'} 
            icon={<Compass className="w-4 h-4" />} 
            label="Sintonía" 
            onClick={() => setCurrentView('sintonia')} 
          />
          <NavButton 
            isMobile
            active={currentView === 'estrategia'} 
            icon={<Layers className="w-4 h-4" />} 
            label="Estrategia" 
            onClick={() => setCurrentView('estrategia')} 
          />
          <NavButton 
            isMobile
            active={currentView === 'bitacora'} 
            icon={<Calendar className="w-4 h-4" />} 
            label="Bitácora" 
            onClick={() => setCurrentView('bitacora')} 
          />
          <NavButton 
            isMobile
            active={currentView === 'configuracion'} 
            icon={<Settings className="w-4 h-4" />} 
            label="Ajustes" 
            onClick={() => setCurrentView('configuracion')} 
          />
        </div>
      </div>

      {activeTimer && (
        <div className="md:hidden">
          <FloatingTimer 
            activeTimer={activeTimer}
            tasks={tasks}
            onPause={handlePauseTimer}
            onResume={handleResumeTimer}
            onStop={handleStopTimer}
            onDiscard={handleDiscardTimer}
            onStartTimer={handleStartTimer}
            onUpdateStartTime={handleUpdateTimerStartTime}
            isMinimized={isTimerMinimized}
            onToggleMinimize={() => setIsTimerMinimized(!isTimerMinimized)}
          />
        </div>
      )}

      {showOnboarding && (
        <Onboarding 
          config={config} 
          onUpdateConfig={updateConfig} 
          onAddTask={addTask} 
          onClose={() => setShowOnboarding(false)} 
          onBackToLogin={onSignOut}
        />
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

function NavButton({ active, icon, label, onClick, isMobile }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void, isMobile?: boolean }) {
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
