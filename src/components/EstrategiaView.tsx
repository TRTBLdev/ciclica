import React, { useState, useEffect } from 'react';
import { Shapes, Layers, Repeat } from 'lucide-react';
import { Config, AppTask, HistoryRecord, Intention } from '../types';
import { cn } from '../lib/utils';
import AreasView from './AreasView';
import ProyectosView from './ProyectosView';
import RutinasView from './RutinasView';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  intentions: Intention[];
  onUpdateConfig: (c: Partial<Config>) => void;
  onToggleTask: (task: AppTask, overrideDuration?: number, overrideStartTime?: string, overrideEndTime?: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Partial<AppTask>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  activeTimer: any;
  onStartTimer: (taskId: string) => void;
  focusTaskId: string | null;
  onNavigate: (view: any, taskId?: string) => void;
}

export default function EstrategiaView({
  config,
  tasks,
  history,
  intentions,
  onUpdateConfig,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onUpdateTask,
  activeTimer,
  onStartTimer,
  focusTaskId,
  onNavigate,
}: Props) {
  // Tabs: 'areas' | 'proyectos' | 'rutinas'
  const [activeTab, setActiveTab] = useState<'areas' | 'proyectos' | 'rutinas'>('areas');

  // Automatically switch tab if there is a focusTaskId that matches a specific type
  useEffect(() => {
    if (focusTaskId) {
      if (config?.areas && config.areas[focusTaskId]) {
        setActiveTab('areas');
      } else {
        const targetTask = tasks.find(t => t.id === focusTaskId);
        if (targetTask) {
          if (targetTask.type === 'Rutina' || (targetTask.parentId && tasks.find(p => p.id === targetTask.parentId)?.type === 'Rutina')) {
            setActiveTab('rutinas');
          } else {
            setActiveTab('proyectos');
          }
        }
      }
    }
  }, [focusTaskId, tasks, config]);

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base text-left">
      {/* Upper Navigation Tabs Bar */}
      <div className="p-6 md:p-10 relative">
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 mb-6">
          <h1 className="text-title leading-none flex items-center gap-3 shrink-0">
            <Layers className="w-6 h-6 text-text-main" /> Estrategia y Plan
          </h1>
          <p className="text-sm text-text-dim md:text-right leading-relaxed max-w-xl">
            Diseñe sus pilares vitales, desglose metas en proyectos concretos y estructure rutinas soberanas de soporte.
          </p>
        </div>

        {/* Top Tabs */}
        <div className="flex flex-wrap gap-6 font-sans text-xs uppercase tracking-widest font-light bg-transparent">
          {[
            { id: 'areas', label: 'Áreas', icon: <Shapes className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
            { id: 'proyectos', label: 'Proyectos', icon: <Layers className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
            { id: 'rutinas', label: 'Rutinas', icon: <Repeat className="w-3.5 h-3.5 silhouette-icon text-text-main" /> }
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer bg-transparent border-0 outline-none transition-colors pb-1",
                  isActive 
                    ? "text-primary border-b border-primary" 
                    : "text-text-dim hover:text-text-main"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-View */}
      <div className="flex-1 w-full">
        {activeTab === 'areas' && (
          <div className="animate-in fade-in duration-200">
            <AreasView
              config={config}
              tasks={tasks}
              history={history}
              intentions={intentions}
              onUpdateConfig={onUpdateConfig}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              onNavigate={onNavigate}
              focusTaskId={focusTaskId}
            />
          </div>
        )}

        {activeTab === 'proyectos' && (
          <div className="animate-in fade-in duration-200">
            <ProyectosView
              config={config}
              tasks={tasks}
              history={history}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              activeTimer={activeTimer}
              onStartTimer={onStartTimer}
              focusTaskId={focusTaskId}
            />
          </div>
        )}

        {activeTab === 'rutinas' && (
          <div className="animate-in fade-in duration-200">
            <RutinasView
              config={config}
              tasks={tasks}
              history={history}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              onAddTask={onAddTask}
              focusTaskId={focusTaskId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
