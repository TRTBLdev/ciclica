import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Save, CheckCircle2, Circle, X, ChevronDown, Plus, Edit2, Search, ArrowLeft, Trash2, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import CategoryBadge from './ui/CategoryBadge';
import UniversalItemForm from './UniversalItemForm';

interface OmnibarProps {
  activeTimer: {
    taskId: string;
    startTime: string;
    sessionStart?: string;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null;
  tasks: AppTask[];
  config: Config | null;
  onPause: () => void;
  onResume: () => void;
  onStop: (saveHistory: boolean) => void;
  onDiscard: () => void;
  onStartTimer: (taskId: string) => void;
  onUpdateStartTime: (newStartTime: string) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onDeleteTask: (id: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onNavigate?: (view: string, taskId?: string) => void;
  onOpenCapture?: () => void;
}

type OmnibarMode = 'search' | 'editTime' | 'editTask' | 'createTask';

export default function Omnibar({
  activeTimer,
  tasks,
  config,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onStartTimer,
  onUpdateStartTime,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  isMinimized = false,
  onToggleMinimize,
  onNavigate,
  onOpenCapture
}: OmnibarProps) {
  const [ticker, setTicker] = useState(0);
  const [mode, setMode] = useState<OmnibarMode>('search');
  
  // Search state
  const [search, setSearch] = useState('');
  
  const [editingTask, setEditingTask] = useState<AppTask | null>(null);
  const [editForm, setEditForm] = useState<{
    text: string;
    category?: string;
    subCategory?: string;
    duracion?: number;
    priority?: string;
  }>({ text: '' });
  
  // Edit Time state
  const [editHHMM, setEditHHMM] = useState('');
  const [editMinutes, setEditMinutes] = useState(0);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const filteredTasks = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (!search.trim()) {
      return [...activeTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    }
    return activeTasks.filter(t => t.text.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [tasks, search]);

  const handleItemClick = (t: AppTask) => {
    if (!onNavigate) return;
    if (t.type === 'Proyecto') {
      onNavigate('proyectos', t.id);
    } else if (t.type === 'Rutina' || t.type === 'Hábito') {
      onNavigate('rutinas', t.id);
    } else if (t.type === 'Tarea' || t.type === 'Pulso') {
      onNavigate('proyectos', t.id);
    }
  };

  const handleEditClick = (t: AppTask) => {
    setEditingTask(t);
    setMode('editTask');
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este ítem?')) {
      onDeleteTask(id);
    }
  };

  const startEditTimeMode = () => {
    if (!activeTimer) return;
    const sessionStartISO = activeTimer.sessionStart || activeTimer.startTime;
    const startDate = new Date(sessionStartISO);
    const hh = String(startDate.getHours()).padStart(2, '0');
    const mm = String(startDate.getMinutes()).padStart(2, '0');
    setEditHHMM(`${hh}:${mm}`);
    
    let curSecs = activeTimer.elapsedSeconds;
    if (activeTimer.isRunning) {
      const elapsedMs = new Date().getTime() - new Date(activeTimer.startTime).getTime();
      curSecs += Math.floor(elapsedMs / 1000);
    }
    setEditMinutes(Math.floor(curSecs / 60));
    setMode('editTime');
  };

  const saveTimeEdit = () => {
    const [h, m] = editHHMM.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m) && activeTimer) {
      const sessionStartISO = activeTimer.sessionStart || activeTimer.startTime;
      const d = new Date(sessionStartISO);
      d.setHours(h);
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
      onUpdateStartTime(d.toISOString());
    }
    setMode('search');
  };

  // RENDER OMNIBAR (EXPANDED)
  
  let activeTimerUI = null;
  if (activeTimer) {
    const task = tasks.find(t => t.id === activeTimer.taskId);
    const taskName = task ? task.text : 'TAREA SIN NOMBRE';
    let totalSeconds = activeTimer.elapsedSeconds;
    if (activeTimer.isRunning) {
      const elapsedMs = new Date().getTime() - new Date(activeTimer.startTime).getTime();
      totalSeconds += Math.floor(elapsedMs / 1000);
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const formattedTime = [
      hours > 0 ? String(hours).padStart(2, '0') : null,
      String(minutes).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
    const decimalHours = parseFloat((totalSeconds / 3600).toFixed(2));

    activeTimerUI = (
      <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border-line/60">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Circle className={cn("w-2 h-2 fill-current", activeTimer.isRunning ? "text-accent animate-pulse" : "text-secondary")} />
            <span className="text-[10px] font-mono uppercase text-text-dim tracking-widest">
              {activeTimer.isRunning ? 'EN TIEMPO REAL' : 'PAUSADO'}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {mode === 'editTime' ? (
              <button onClick={() => setMode('search')} className="p-1 cursor-pointer bg-transparent border-0 outline-none transition-colors" title="Cancelar">
                <ArrowLeft className="w-4 h-4 text-text-dim hover:text-text-main" />
              </button>
            ) : (
              <button onClick={startEditTimeMode} className="p-1 cursor-pointer bg-transparent border-0 outline-none transition-colors" title="Ajustar tiempo">
                <Edit2 className="w-4 h-4 text-text-dim hover:text-text-main" />
              </button>
            )}
            {mode !== 'editTime' && (
              <button onClick={onDiscard} className="p-1 cursor-pointer bg-transparent border-0 outline-none transition-colors" title="Descartar tiempo">
                <Trash2 className="w-4 h-4 text-text-dim hover:text-red-500" />
              </button>
            )}
          </div>
        </div>

        {mode === 'editTime' ? (
          <div className="flex gap-3 items-center w-full p-2 bg-base-dim/10 rounded-xl">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Hora Inicio</label>
              <input type="time" className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none w-full" value={editHHMM} onChange={e => setEditHHMM(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Duración (mins)</label>
              <input type="number" min={0} className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none w-full" value={editMinutes} onChange={e => setEditMinutes(Number(e.target.value))} />
            </div>
            <button onClick={saveTimeEdit} className="p-2 text-text-dim hover:text-accent bg-transparent cursor-pointer outline-none border-none mt-4 transition-colors flex items-center justify-center" title="Guardar">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="overflow-hidden max-w-[200px]">
              <span className="font-normal text-xs tracking-wide text-text-main truncate block">{taskName}</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 w-full mt-0.5">
              <div className="flex items-end gap-1 shrink-0">
                <div className="text-3xl text-text-main tracking-tight leading-none font-mono">
                  {formattedTime}
                </div>
                <div className="text-primary text-[10px] pb-0.5 font-mono ml-1">
                  ({decimalHours}h)
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0 mr-2">
                {activeTimer.isRunning ? (
                  <button onClick={onPause} className="p-1 cursor-pointer bg-transparent outline-none transition-colors border-0">
                    <Pause className="w-4 h-4 text-text-dim hover:text-accent" /> 
                  </button>
                ) : (
                  <button onClick={onResume} className="p-1 cursor-pointer bg-transparent outline-none transition-colors border-0">
                    <Play className="w-4 h-4 text-text-dim hover:text-accent" /> 
                  </button>
                )}
                <button onClick={() => onStop(false)} className="p-1 cursor-pointer bg-transparent outline-none transition-colors border-0" title="Guardar">
                  <Save className="w-4 h-4 text-text-dim hover:text-text-main" /> 
                </button>
                <button onClick={() => onStop(true)} className="p-1 cursor-pointer bg-transparent outline-none transition-colors border-0" title="Finalizar">
                  <CheckCircle2 className="w-4 h-4 text-text-dim hover:text-accent" /> 
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-base p-6 md:p-8 flex flex-col overflow-hidden relative">

      {activeTimerUI}

      {/* Mode Renderers */}
      {mode === 'search' && (
        <div className="flex flex-col gap-2 animate-in fade-in">
          
          {search.length > 0 && (
            <div className="flex flex-col-reverse gap-1 flex-1 overflow-y-auto pr-2 no-scrollbar mb-4 mt-2">
              {filteredTasks.length === 0 ? (
                <div className="text-[10px] text-text-dim font-mono text-center uppercase py-4">Sin resultados</div>
              ) : (
                filteredTasks.map(t => (
                  <div key={t.id} className="group w-full px-3 py-2 rounded-lg hover:bg-base-dim/30 transition-colors flex items-center justify-between text-left">
                    <div onClick={() => handleItemClick(t)} className="flex flex-col min-w-0 pr-2 flex-1 cursor-pointer hover:opacity-85 transition-opacity">
                      <span className="truncate text-xs text-text-main font-medium" title={`${t.text}`}>
                        {t.type === 'Hábito' ? '🌱 ' : t.type === 'Pulso' ? '💓 ' : t.type === 'Proyecto' ? '📁 ' : t.type === 'Rutina' ? '🔁 ' : '✏️ '}
                        {t.text}
                      </span>
                      {(t.category || t.subCategory) && (
                         <div className="scale-75 origin-left -mt-0.5 opacity-70">
                           <CategoryBadge area={t.category} subCategory={t.subCategory} config={config} />
                         </div>
                      )}
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-1">
                      {t.type !== 'Pulso' && (!activeTimer || activeTimer.taskId !== t.id) && (
                        <button onClick={(e) => { e.stopPropagation(); onStartTimer(t.id); setSearch(''); }} className="p-1.5 flex items-center justify-center bg-transparent cursor-pointer border-none outline-none transition-colors" title="Iniciar Timer">
                          <Play className="w-4 h-4 text-text-dim hover:text-accent" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} className="p-1.5 flex items-center justify-center bg-transparent cursor-pointer border-none outline-none transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5 text-text-dim hover:text-text-main" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(t.id); }} className="p-1.5 flex items-center justify-center bg-transparent cursor-pointer border-none outline-none transition-colors" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5 text-text-dim hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="relative flex w-full items-center mt-1">
            <div className="absolute left-3 text-text-dim pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar ítem o escribir para crear..."
              className="w-full h-11 pl-9 pr-12 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f] transition-all placeholder:text-text-dim/70"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search.trim()) {
                  const exactMatch = filteredTasks.find(t => t.text.toLowerCase() === search.trim().toLowerCase());
                  if (exactMatch) {
                     handleItemClick(exactMatch);
                  } else {
                     onAddTask({
                       text: search.trim(),
                       type: 'Tarea',
                       completed: false,
                       duracion: 0.5,
                       createdAt: new Date().toISOString()
                     });
                     setSearch('');
                  }
                }
              }}
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => {
                  setMode('createTask');
                }}
                className="absolute right-1 w-9 h-9 rounded-full bg-transparent hover:bg-base-dim/40 text-text-main flex items-center justify-center transition-all cursor-pointer border-0 outline-none"
                title="Crear nueva tarea"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'editTask' && editingTask && (
        <div className="flex flex-col animate-in fade-in flex-1 overflow-y-auto pr-2 no-scrollbar mb-4 mt-2">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-[11px] uppercase tracking-widest text-text-dim font-mono">Editar Ítem</h3>
             <button onClick={() => setMode('search')} className="p-1.5 hover:bg-base-dim/40 rounded-lg transition-colors cursor-pointer bg-transparent border border-border-line/50 outline-none text-text-dim hover:text-text-main flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Volver</span>
             </button>
          </div>
          
          <UniversalItemForm
            initialData={editingTask}
            config={config}
            allTasks={tasks}
            onSave={(updates) => {
              onUpdateTask(editingTask.id, updates);
              setMode('search');
              setEditingTask(null);
            }}
            onCancel={() => {
              setMode('search');
              setEditingTask(null);
            }}
          />
        </div>
      )}

      {mode === 'createTask' && (
        <div className="flex flex-col animate-in fade-in flex-1 overflow-y-auto pr-2 no-scrollbar mb-4 mt-2">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-[11px] uppercase tracking-widest text-text-dim font-mono">Crear Ítem</h3>
             <button onClick={() => setMode('search')} className="p-1.5 hover:bg-base-dim/40 rounded-lg transition-colors cursor-pointer bg-transparent border border-border-line/50 outline-none text-text-dim hover:text-text-main flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Volver</span>
             </button>
          </div>
          
          <UniversalItemForm
            defaultText={search.trim()}
            config={config}
            allTasks={tasks}
            onSave={(newTaskData) => {
              onAddTask({
                userId: 'placeholder',
                text: newTaskData.text || 'Sin título',
                type: newTaskData.type || 'Tarea',
                completed: false,
                createdAt: new Date().toISOString(),
                ...newTaskData
              });
              setMode('search');
              setSearch('');
            }}
            onCancel={() => setMode('search')}
          />
        </div>
      )}

    </div>
  );
}
