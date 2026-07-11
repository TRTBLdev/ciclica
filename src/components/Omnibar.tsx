import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Save, CheckCircle2, Circle, X, ChevronDown, Plus, Edit2, Search, ArrowLeft, Trash2, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import CategoryBadge from './ui/CategoryBadge';
import PriorityBadge from './ui/PriorityBadge';
import AllocationBadge from './ui/AllocationBadge';
import UniversalItemForm from './UniversalItemForm';
import { getTypeIcon } from './TaskItem';

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

  // Active item inline editing states inside timer
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleText, setEditTitleText] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotesText, setEditNotesText] = useState('');
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('');
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  useEffect(() => {
    setIsEditingTitle(false);
    setIsEditingNotes(false);
    setEditingChecklistItemId(null);
    setNewChecklistItemText('');
  }, [activeTimer?.taskId]);

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

    // Handle Title Save
    const handleSaveTitleText = () => {
      if (task && editTitleText.trim() && editTitleText !== task.text) {
        onUpdateTask(task.id, { text: editTitleText.trim() });
      }
      setIsEditingTitle(false);
    };

    // Handle Notes Save
    const handleSaveNotesText = () => {
      if (task && editNotesText !== (task.notes || '')) {
        onUpdateTask(task.id, { notes: editNotesText });
      }
      setIsEditingNotes(false);
    };

    // Checklist toggles and updates
    const handleToggleCheckItem = (itemId: string) => {
      if (!task) return;
      const updatedChecklist = (task.checklist || []).map(item => 
        item.id === itemId ? { ...item, done: !item.done } : item
      );
      onUpdateTask(task.id, { checklist: updatedChecklist });
    };

    const handleSaveCheckItemText = (itemId: string, newText: string) => {
      if (!task) return;
      const updatedChecklist = (task.checklist || []).map(item => 
        item.id === itemId ? { ...item, text: newText.trim() } : item
      );
      onUpdateTask(task.id, { checklist: updatedChecklist });
      setEditingChecklistItemId(null);
    };

    const handleDeleteCheckItem = (itemId: string) => {
      if (!task) return;
      const updatedChecklist = (task.checklist || []).filter(item => item.id !== itemId);
      onUpdateTask(task.id, { checklist: updatedChecklist });
    };

    const handleAddCheckItem = () => {
      if (!task || !newChecklistItemText.trim()) return;
      const newItem = {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        text: newChecklistItemText.trim(),
        done: false
      };
      const updatedChecklist = [...(task.checklist || []), newItem];
      onUpdateTask(task.id, { checklist: updatedChecklist });
      setNewChecklistItemText('');
    };

    // Check what metadata badges to show based on task type
    const hasPriority = task && (task.type === 'Tarea' || task.type === 'Hábito' || task.type === 'Proyecto');
    const hasAllocation = task && (task.type === 'Tarea' || task.type === 'Proyecto');
    const hasNotes = task && (task.type === 'Tarea' || task.type === 'Hábito');
    const hasChecklist = task && (task.type === 'Tarea' || task.type === 'Hábito');

    activeTimerUI = (
      <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border-line/60 overflow-y-auto no-scrollbar max-h-[60vh]">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Circle className={cn("w-2 h-2 fill-current", activeTimer.isRunning ? "text-accent animate-pulse" : "text-secondary")} />
            <span className="text-[10px] font-mono uppercase text-text-dim tracking-widest">
              {activeTimer.isRunning ? 'EN TIEMPO REAL' : 'PAUSADO'}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {/* Click on minimal X to discard time */}
            <button onClick={onDiscard} className="p-1 cursor-pointer bg-transparent border-0 outline-none transition-colors" title="Descartar tiempo">
              <X className="w-4 h-4 text-text-dim hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex flex-col gap-1.5 text-left">
          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              className="w-full bg-base border border-border-line rounded-md px-2 py-0.5 text-xs text-text-main font-normal tracking-wide focus:outline-none focus:border-[#a2b29f]"
              value={editTitleText}
              onChange={e => setEditTitleText(e.target.value)}
              onBlur={handleSaveTitleText}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveTitleText();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
            />
          ) : (
            <span
              onClick={() => {
                setEditTitleText(taskName);
                setIsEditingTitle(true);
              }}
              className="font-normal text-xs tracking-wide text-text-main cursor-text hover:underline decoration-dotted block truncate"
              title="Haz clic para editar el título"
            >
              {taskName}
            </span>
          )}

          {/* Badges / Metadata row */}
          {task && (
            <div className="flex flex-wrap gap-1.5 mt-0.5 items-center">
              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-base-dim/40 text-text-dim font-mono font-medium flex items-center gap-1.5">
                {getTypeIcon(task.type, "w-3 h-3 stroke-[2] fill-none")}
                <span>{task.type === 'Rutina' ? 'Rutina' : task.type === 'Proyecto' ? 'Proyecto' : task.type === 'Hábito' ? 'Hábito' : 'Tarea'}</span>
              </span>
              <CategoryBadge area={task.category} subCategory={task.subCategory} config={config} />
              {hasPriority && task.priority && <PriorityBadge priority={task.priority} />}
              {hasAllocation && task.allocationType && <AllocationBadge allocation={task.allocationType} />}
            </div>
          )}
        </div>

        {/* Time Tracking Row (Clicking elapsed time opens adjust panel) */}
        {mode === 'editTime' ? (
          <div className="flex gap-3 items-center w-full p-3 bg-base-dim/10 rounded-xl border border-border-line/40 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-1 flex-1 text-left">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Hora Inicio</label>
              <input type="time" className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none w-full" value={editHHMM} onChange={e => setEditHHMM(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1 text-left">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Duración (mins)</label>
              <input type="number" min={0} className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none w-full" value={editMinutes} onChange={e => setEditMinutes(Number(e.target.value))} />
            </div>
            <button onClick={saveTimeEdit} className="p-2 text-text-dim hover:text-accent bg-transparent cursor-pointer outline-none border-none mt-4 transition-colors flex items-center justify-center" title="Guardar">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full py-1">
            <div 
              onClick={startEditTimeMode}
              className="flex items-end gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              title="Click para ajustar la hora de inicio y duración"
            >
              <div className="text-2xl text-text-main tracking-tight leading-none font-mono font-semibold">
                {formattedTime}
              </div>
              <div className="text-primary text-[10px] pb-0.5 font-mono ml-1">
                ({decimalHours}h)
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {activeTimer.isRunning ? (
                <button onClick={onPause} className="p-1.5 cursor-pointer bg-transparent outline-none transition-colors border-0 hover:bg-base-dim/40 rounded-full" title="Pausar">
                  <Pause className="w-4 h-4 text-text-dim hover:text-accent" /> 
                </button>
              ) : (
                <button onClick={onResume} className="p-1.5 cursor-pointer bg-transparent outline-none transition-colors border-0 hover:bg-base-dim/40 rounded-full" title="Reanudar">
                  <Play className="w-4 h-4 text-text-dim hover:text-accent" /> 
                </button>
              )}
              <button onClick={() => onStop(false)} className="p-1.5 cursor-pointer bg-transparent outline-none transition-colors border-0 hover:bg-base-dim/40 rounded-full" title="Guardar sesión sin completar tarea">
                <Save className="w-4 h-4 text-text-dim hover:text-text-main" /> 
              </button>
              <button onClick={() => onStop(true)} className="p-1.5 cursor-pointer bg-transparent outline-none transition-colors border-0 hover:bg-base-dim/40 rounded-full" title="Completar y finalizar tarea">
                <CheckCircle2 className="w-4 h-4 text-text-dim hover:text-accent" /> 
              </button>
            </div>
          </div>
        )}

        {/* Notes (Task/Habit specific) */}
        {hasNotes && task && (
          <div className="text-left flex flex-col gap-1 mt-1">
            <span className="text-[9px] text-text-dim font-mono uppercase tracking-widest font-bold">Notas</span>
            {isEditingNotes ? (
              <textarea
                autoFocus
                className="w-full bg-transparent border-b border-border-line text-xs text-text-main focus:outline-none focus:border-[#a2b29f] py-1 min-h-[60px] resize-none font-sans font-light"
                value={editNotesText}
                onChange={e => setEditNotesText(e.target.value)}
                onBlur={handleSaveNotesText}
                onKeyDown={e => {
                  if (e.key === 'Escape') setIsEditingNotes(false);
                }}
              />
            ) : (
              <p
                onClick={() => {
                  setEditNotesText(task.notes || '');
                  setIsEditingNotes(true);
                }}
                className={cn(
                  "text-xs text-text-main/80 cursor-text hover:text-text-main transition-colors font-light leading-relaxed min-h-[24px] py-1 border-b border-transparent hover:border-border-line/20",
                  !task.notes && "italic text-text-dim/80"
                )}
                title="Haz clic para añadir o editar notas"
              >
                {task.notes || 'Añadir notas o anotaciones rápidas para esta tarea...'}
              </p>
            )}
          </div>
        )}

        {/* Checklist (Task/Habit specific) */}
        {hasChecklist && task && (
          <div className="text-left flex flex-col gap-1.5 mt-1 border-t border-border-line/40 pt-2.5">
            <span className="text-[9px] text-text-dim font-mono uppercase tracking-widest font-bold">Checklist</span>
            
            <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
              {(task.checklist || []).length === 0 ? (
                <span className="text-[10px] text-text-dim italic pl-1 font-light">Sin elementos en el checklist</span>
              ) : (
                (task.checklist || []).map(item => {
                  const isItemEditing = editingChecklistItemId === item.id;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2.5 py-0.5 group/chk">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleCheckItem(item.id)}
                          className="focus:outline-none bg-transparent border-0 p-0 text-text-dim hover:text-accent cursor-pointer flex items-center justify-center shrink-0"
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 stroke-[2.25]" />
                          ) : (
                            <Circle className="w-4 h-4 text-text-dim/60 stroke-[2.25]" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          {isItemEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-full bg-base border border-border-line rounded px-1.5 py-0.5 text-xs text-text-main focus:outline-none focus:border-[#a2b29f]"
                              value={editingChecklistItemText}
                              onChange={e => setEditingChecklistItemText(e.target.value)}
                              onBlur={() => handleSaveCheckItemText(item.id, editingChecklistItemText)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveCheckItemText(item.id, editingChecklistItemText);
                                if (e.key === 'Escape') setEditingChecklistItemId(null);
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingChecklistItemId(item.id);
                                setEditingChecklistItemText(item.text);
                              }}
                              className={cn(
                                "text-xs text-text-main cursor-text block truncate font-light",
                                item.done && "line-through opacity-50"
                              )}
                              title="Haz clic para editar"
                            >
                              {item.text}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteCheckItem(item.id)}
                        className="text-text-dim hover:text-red-500 bg-transparent border-0 cursor-pointer text-xs shrink-0 opacity-0 group-hover/chk:opacity-100 transition-opacity"
                        title="Eliminar elemento"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add checklist item */}
            <div className="flex gap-2 mt-1 w-full">
              <input
                type="text"
                placeholder="Añadir elemento..."
                className="flex-1 py-1 text-xs bg-transparent text-text-main border-b border-border-line/30 focus:outline-none focus:border-[#a2b29f] placeholder:text-text-dim/60 font-light"
                value={newChecklistItemText}
                onChange={e => setNewChecklistItemText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCheckItem();
                  }
                }}
              />
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
                      <span className="truncate text-xs text-text-main font-medium flex items-center gap-2" title={`${t.text}`}>
                        {getTypeIcon(t.type, "w-3.5 h-3.5 stroke-[2] fill-none shrink-0")}
                        <span>{t.text}</span>
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
