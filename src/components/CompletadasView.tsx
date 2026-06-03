import React, { useState, useMemo } from 'react';
import { AppTask, Config, HistoryRecord } from '../types';
import { 
  CheckCircle2, 
  Repeat, 
  Calendar, 
  Clock, 
  Edit2, 
  Check, 
  X, 
  Trash2, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  Plus 
} from 'lucide-react';
import { cn, isSameDay, getAreaColorClasses } from '../lib/utils';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onUpdateHistory: (id: string, updates: Partial<HistoryRecord>) => void;
  onDeleteHistory: (id: string) => void;
  onAddHistory?: (recordData: Omit<HistoryRecord, 'id'>) => void;
}

export default function CompletadasView({ 
  config, 
  tasks, 
  history, 
  onToggleTask, 
  onDeleteTask, 
  onUpdateTask, 
  onUpdateHistory, 
  onDeleteHistory,
  onAddHistory
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState<number>(0);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Retrospective states
  const [showAddForm, setShowAddForm] = useState(false);
  const [retroTaskId, setRetroTaskId] = useState('');
  const [retroStart, setRetroStart] = useState('');
  const [retroEnd, setRetroEnd] = useState('');
  const [retroDuration, setRetroDuration] = useState<number>(0);
  const [retroMarkCompleted, setRetroMarkCompleted] = useState(true);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSimple, setShowSimple] = useState(true);
  const [showRecurring, setShowRecurring] = useState(true);

  const selectedTask = tasks.find(t => t.id === retroTaskId);

  const filteredTasks = tasks.filter(t => {
    const textMatches = t.text.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
                        (t.category && t.category.toLowerCase().includes(taskSearchQuery.toLowerCase())) ||
                        t.type.toLowerCase().includes(taskSearchQuery.toLowerCase());
    return textMatches;
  });

  const [period, setPeriod] = useState<string>('todas');

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  const filteredHistoryByDate = useMemo(() => {
    if (period === 'todas') return sortedHistory;

    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'hoy': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'semana': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getTime());
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case '7dias': {
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'mes': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case '30dias': {
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'ciclo': {
        if (config?.cycleConfig?.lastCycleStartDate) {
          start = new Date(config.cycleConfig.lastCycleStartDate);
        } else {
          start.setDate(now.getDate() - 27);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }

    const startTime = start.getTime();
    const endTime = end.getTime();

    return sortedHistory.filter(h => {
      const d = new Date(h.date).getTime();
      return d >= startTime && d <= endTime;
    });
  }, [sortedHistory, period, config?.cycleConfig?.lastCycleStartDate]);

  const simpleExecs = useMemo(() => {
    return filteredHistoryByDate.filter(h => {
      const task = tasks.find(t => t.id === h.taskId);
      if (!task) return true;
      return task.type === 'Tarea' || task.type === 'Proyecto';
    });
  }, [filteredHistoryByDate, tasks]);

  const recurringExecs = useMemo(() => {
    return filteredHistoryByDate.filter(h => {
      const task = tasks.find(t => t.id === h.taskId);
      if (!task) return false;
      return task.type === 'Hábito' || task.type === 'Rutina';
    });
  }, [filteredHistoryByDate, tasks]);

  const toLocalInputFormat = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
  };

  const startEdit = (h: HistoryRecord) => {
    setEditingId(h.id);
    const endISO = h.endTime || h.date;
    const durHours = h.duration || 0;
    const startISO = h.startTime || new Date(new Date(endISO).getTime() - durHours * 3600000).toISOString();
    
    const endLocal = toLocalInputFormat(endISO);
    const startLocal = toLocalInputFormat(startISO);
    
    const dateObj = new Date(endISO);
    setEditDate(dateObj.toISOString().substring(0, 10));
    
    const hh = dateObj.getHours().toString().padStart(2, '0');
    const mm = dateObj.getMinutes().toString().padStart(2, '0');
    setEditTime(`${hh}:${mm}`);
    
    setEditStartTime(startLocal);
    setEditEndTime(endLocal);
    setEditDuration(durHours);
  };

  const handleSaveEdit = (id: string) => {
    try {
      let finalStartISO = '';
      let finalEndISO = '';
      if (editStartTime && editEndTime) {
        finalStartISO = new Date(editStartTime).toISOString();
        finalEndISO = new Date(editEndTime).toISOString();
      } else {
        finalEndISO = new Date(`${editDate}T${editTime}:00`).toISOString();
        finalStartISO = new Date(new Date(finalEndISO).getTime() - editDuration * 3600000).toISOString();
      }
      
      onUpdateHistory(id, {
        date: finalEndISO,
        duration: Number(editDuration),
        startTime: finalStartISO,
        endTime: finalEndISO
      });
    } catch (e) {
      console.error(e);
    }
    setEditingId(null);
  };

  const handleDeleteLog = (h: HistoryRecord) => {
    const task = tasks.find(t => t.id === h.taskId);
    if (task) {
      if (task.type === 'Tarea' || task.type === 'Proyecto') {
        onUpdateTask(task.id, { completed: false, view: 'Hoy' });
      } else if (task.type === 'Hábito' || task.type === 'Rutina') {
        onUpdateTask(task.id, { 
          completed: false, 
          fechaPlanificada: new Date().toISOString() 
        });
        
        // If it's a routine, also revert its child habits to today
        if (task.type === 'Rutina') {
          const childHabits = tasks.filter(t => t.parentId === task.id && t.type === 'Hábito');
          childHabits.forEach(ch => {
            onUpdateTask(ch.id, { 
              completed: false, 
              fechaPlanificada: new Date().toISOString() 
            });
          });
        }
      }

      // Sumar de vuelta la duración al log de la rutina padre si existe
      if (task.type === 'Hábito' && task.parentId) {
        const parentT = tasks.find(p => p.id === task.parentId);
        if (parentT && parentT.type === 'Rutina') {
          const parentLog = history.find(hl => hl.taskId === parentT.id && isSameDay(hl.date, h.date));
          if (parentLog && parentLog.duration !== undefined) {
            const addedDur = h.duration || 0;
            const newParentDur = parseFloat((parentLog.duration + addedDur).toFixed(2));
            onUpdateHistory(parentLog.id, { duration: newParentDur });
          }
        }
      }
    }
    onDeleteHistory(h.id);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const renderHistoryList = (list: HistoryRecord[], emptyMsg: string, isRecurringList: boolean) => {
    if (list.length === 0) {
      return (
        <div className="py-12 text-center flex flex-col items-center justify-center text-text-dim border border-dashed border-border-line/30 bg-transparent text-left">
          <CheckCircle2 className="w-8 h-8 text-[var(--color-border-line)]/50 mb-3" />
          <p className="text-text-dim font-mono text-xs uppercase tracking-wider">{emptyMsg}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col text-left">
        {list.map(h => {
          const task = tasks.find(t => t.id === h.taskId);
          const isEditing = editingId === h.id;
          const isExpanded = expandedIds.includes(h.id);

          const displayCategory = task?.category || '';
          const areaConfig = config?.areas?.[displayCategory];
          const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

          const evDate = new Date(h.date);
          const formattedDate = evDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
          const formattedTime = evDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

          const childTasks = task ? tasks.filter(t => t.parentId === task.id) : [];
          const hasChildren = childTasks.length > 0;

          return (
            <div 
              key={h.id} 
              className={cn(
                "py-4 border-b border-border-line/25 flex flex-col gap-3 bg-transparent",
                isEditing && "p-5 border border-[var(--color-primary)] my-2 bg-base-dim/10"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                {isEditing ? (
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    <div className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
                      Modificando Registro: {task?.text || 'Elemento histórico'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Inicio de Sesión</label>
                        <input 
                          type="datetime-local" 
                          className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                          value={editStartTime}
                          onChange={e => {
                            const val = e.target.value;
                            setEditStartTime(val);
                            if (val && editEndTime) {
                              const diff = new Date(editEndTime).getTime() - new Date(val).getTime();
                              setEditDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Fin de Sesión</label>
                        <input 
                          type="datetime-local" 
                          className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                          value={editEndTime}
                          onChange={e => {
                            const val = e.target.value;
                            setEditEndTime(val);
                            if (editStartTime && val) {
                              const diff = new Date(val).getTime() - new Date(editStartTime).getTime();
                              setEditDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-base-dim/20 p-3 border border-border-line/50">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-dim flex-1">Duración Calculada:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          min={0}
                          step="0.01"
                          className="w-20 text-xs px-3 py-1 border border-border-line bg-base text-center font-mono font-bold text-text-main outline-none"
                          value={editDuration || 0}
                          onChange={e => setEditDuration(Number(e.target.value))}
                        />
                        <span className="text-xs text-text-dim font-mono">horas</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-6 mt-1">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(h.id)}
                        className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-main text-sm truncate max-w-[14rem] sm:max-w-[20rem]">
                          {task?.text || <span className="italic text-text-dim/50">(Eliminado) {h.taskId.substring(0,6)}</span>}
                        </span>
                        {task?.type && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border-line/40 text-text-dim bg-transparent">
                            {task.type}
                          </span>
                        )}
                        {displayCategory && (
                          <span className={cn("text-[9px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full", getAreaColorClasses(color))}>
                            {displayCategory}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-text-dim/75 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-text-dim/60" />
                          {formattedDate}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-text-dim/60" />
                          {formattedTime}
                        </span>
                        {h.duration !== undefined && h.duration > 0 && (
                          <span className="font-mono text-text-main border border-border-line/40 px-1.5 py-0.2 text-[11px]" title={h.startTime && h.endTime ? `De ${new Date(h.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} a ${new Date(h.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ''}>
                            ⏱️ {h.duration.toFixed(2)}h
                            {h.startTime && h.endTime && (() => {
                              try {
                                const tStart = new Date(h.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                const tEnd = new Date(h.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                return ` (${tStart} - ${tEnd})`;
                              } catch(e) { return ''; }
                            })()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(h.id)}
                          className={cn(
                            "flex items-center gap-2 border text-xs font-mono uppercase px-3 py-1 cursor-pointer transition-all bg-transparent border-border-line/60 text-text-dim hover:text-text-main"
                          )}
                          title={task?.type === 'Rutina' ? "Ver desglosados sus hábitos ejecutados" : "Mostrar sus subtareas de esta sesión"}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>Desglose</span>
                          <span className="font-bold">({childTasks.length})</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => startEdit(h)}
                        className="p-1.5 text-text-dim hover:text-text-main transition-colors cursor-pointer bg-transparent border-0"
                        title="Modificar fecha/hora/duración real de ejecución"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLog(h)}
                        className="p-1.5 text-text-dim hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0"
                        title={task?.type === 'Tarea' ? "Revertir cumplimiento de esta tarea y reactivarla" : "Eliminar registro log"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* NESTED ACCORDION VIEW FOR CHILD SUBTASKS / HABITS */}
              {isExpanded && hasChildren && (
                <div className="mt-2 pt-4 border-t border-border-line/20 flex flex-col gap-2 pl-4 border-l border-[var(--color-primary)]/50 bg-transparent text-left">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-text-dim/70 flex items-center justify-between pb-1">
                    <span>{task?.type === 'Rutina' ? 'Hábitos Registrados:' : 'Subtareas de esta Sesión:'}</span>
                    <span className="font-mono text-text-dim/40 font-normal">Bloque: {formattedDate}</span>
                  </div>
                  
                  {childTasks.map(child => {
                    let childLog = history.find(subH => subH.taskId === child.id && isSameDay(subH.date, h.date));
                    if (!childLog && (child.type === 'Tarea' || child.type === 'Pulso')) {
                      childLog = history.find(subH => subH.taskId === child.id);
                    }
                    
                    const isChildEditing = editingId === childLog?.id;
                    const childDateStr = childLog ? new Date(childLog.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
                    const childTimeStr = childLog ? new Date(childLog.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div 
                        key={child.id} 
                        className={cn(
                          "py-2.5 border-b border-border-line/10 text-xs flex flex-col gap-2 bg-transparent",
                          childLog 
                            ? isChildEditing
                              ? "p-4 border border-[var(--color-primary)] my-1"
                              : "hover:bg-base-dim/20" 
                            : "border-dashed border-border-line/30 text-text-dim/50"
                        )}
                      >
                        {isChildEditing && childLog ? (
                          <div className="flex flex-col gap-3 w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-text-main">{child.text}</span>
                              <span className="text-[9px] font-mono border border-border-line text-text-main font-semibold px-2 py-0.5 uppercase">Editar {child.type}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Inicio de Sesión</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full text-xs px-4 py-1.5 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                                  value={editStartTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEditStartTime(val);
                                    if (val && editEndTime) {
                                      const diff = new Date(editEndTime).getTime() - new Date(val).getTime();
                                      setEditDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Fin de Sesión</label>
                                <input 
                                  type="datetime-local" 
                                  className="w-full text-xs px-4 py-1.5 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                                  value={editEndTime}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setEditEndTime(val);
                                    if (editStartTime && val) {
                                      const diff = new Date(val).getTime() - new Date(editStartTime).getTime();
                                      setEditDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-base-dim/20 p-2 border border-border-line/50">
                              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-dim flex-1">Calculado:</span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  min={0}
                                  step="0.01"
                                  className="w-16 text-xs px-2 py-0.5 border border-border-line rounded bg-base text-center font-mono font-bold text-text-main outline-none"
                                  value={editDuration || 0}
                                  onChange={e => setEditDuration(Number(e.target.value))}
                                />
                                <span className="text-xs text-text-dim font-mono">horas</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-4 mt-1">
                              <button 
                                onClick={() => setEditingId(null)}
                                className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={() => handleSaveEdit(childLog!.id)}
                                className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center border shrink-0",
                                childLog 
                                  ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-primary" 
                                  : "border-border-line/85 text-text-dim/40 bg-transparent"
                              )}>
                                {childLog && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className={cn(
                                "font-light truncate max-w-[15rem] sm:max-w-xs md:max-w-md", 
                                childLog ? "text-text-main" : "text-text-dim/50"
                              )}>
                                {child.text}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 ml-auto">
                              {childLog ? (
                                <>
                                  <div className="flex items-center gap-2 text-xs text-text-dim/75 font-mono">
                                    <span className="hidden sm:inline border border-border-line/40 text-text-dim px-1.5 py-0.2 font-sans">{childDateStr}</span>
                                    <span>{childTimeStr}</span>
                                    {childLog.duration !== undefined && childLog.duration > 0 && (
                                      <span className="font-sans text-text-main bg-[var(--color-primary)]/15 text-xs px-1.5 py-0.2 border border-[var(--color-primary)]/20">
                                        ⏱ {childLog.duration}h
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center">
                                    <button 
                                      onClick={() => startEdit(childLog!)}
                                      className="p-1 text-text-dim hover:text-text-main transition-colors cursor-pointer bg-transparent border-0"
                                      title="Modificar fecha/hora/duración de este sub-registro"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteLog(childLog!)}
                                      className="p-1 text-text-dim hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0"
                                      title="Deshacer cumplimiento de este sub-ítem"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                onAddHistory && (
                                  <button 
                                    onClick={() => {
                                      const childDur = child.duracion || 0;
                                      onAddHistory({
                                        userId: h.userId,
                                        taskId: child.id,
                                        date: h.date,
                                        duration: childDur,
                                        createdAt: new Date().toISOString()
                                      });
                                      if (child.type === 'Tarea' || child.type === 'Pulso') {
                                        onUpdateTask(child.id, { completed: true, view: '' });
                                      }
                                      if (h.duration !== undefined && h.duration > 0) {
                                        const newParentDur = Math.max(0, parseFloat((h.duration - childDur).toFixed(2)));
                                        onUpdateHistory(h.id, { duration: newParentDur });
                                      }
                                    }}
                                    className="px-2.5 py-0.5 border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-text-main hover:bg-[var(--color-primary)]/20 transition-all text-xs font-mono font-medium cursor-pointer"
                                    title="Registrar ejecución a este bloque"
                                  >
                                    <Plus className="w-3 h-3 inline mr-1" /> Registrar aquí
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 px-6 md:px-10 pt-10 pb-16 max-w-4xl mx-auto w-full text-left">
      
      {/* Header Statement */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border-line pb-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-text-main stroke-[2]" />
          <h2 className="text-title">Historial de Completadas</h2>
        </div>
        
        {/* Date Filter Dropdown */}
        <div className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 flex items-center pr-6 bg-base">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)} 
            className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0"
          >
            <option value="todas">Todo el Historial</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta Semana</option>
            <option value="7dias">Últimos 7 Días</option>
            <option value="mes">Este Mes</option>
            <option value="30dias">Últimos 30 Días</option>
            <option value="ciclo">Este Ciclo</option>
          </select>
          <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
        </div>
      </div>

      <p className="text-sm text-text-dim max-w-2xl leading-relaxed -mt-2">
        El feed histórico detallado de sus sesiones y hábitos completados. Gestione registros de auditoría de tiempo real para análisis retrospectivos limpios y fiables.
      </p>

      <div className="flex flex-col gap-3 bg-transparent py-4 border-b border-border-line/30">
        <button 
          onClick={() => {
            const hasDatesReady = retroStart && retroEnd;
            if (!hasDatesReady) {
              const now = new Date();
              const oneHourEarlier = new Date(now.getTime() - 3600000);
              setRetroEnd(toLocalInputFormat(now.toISOString()));
              setRetroStart(toLocalInputFormat(oneHourEarlier.toISOString()));
              setRetroDuration(1.0);
            }
            setShowAddForm(!showAddForm);
          }}
          className="flex items-center justify-between w-full text-left cursor-pointer bg-transparent border-0 outline-none"
        >
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider font-bold">
            <Plus className="w-4 h-4" />
            <span>Añadir sesión retrospectiva manual</span>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline">
            {showAddForm ? 'Cerrar Panel' : 'Abrir Panel ⏱️'}
          </span>
        </button>

        {showAddForm && (
          <div className="pt-4 border-t border-border-line/40 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Task selector */}
              <div className="flex flex-col gap-1 sm:col-span-1 md:col-span-2 lg:col-span-1 relative">
                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1.5">Buscar Elemento</label>
                {selectedTask ? (
                  <div className="flex items-center justify-between border border-border-line p-2.5 bg-base-dim text-xs min-h-[38px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("text-[9px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5", 
                          selectedTask.type === 'Proyecto' ? 'text-indigo-600' :
                          selectedTask.type === 'Rutina' ? 'text-orange-600' :
                          selectedTask.type === 'Hábito' ? 'text-emerald-600' :
                          'text-text-main'
                        )}>
                          [{selectedTask.type}]
                        </span>
                        {selectedTask.category && (
                          <span className="text-[9px] font-mono text-text-dim">
                            {selectedTask.category}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-text-main">{selectedTask.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRetroTaskId('');
                        setTaskSearchQuery('');
                      }}
                      className="text-text-dim hover:text-text-main p-1 cursor-pointer bg-transparent border-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escriba para buscar..."
                      className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main font-medium outline-none"
                      value={taskSearchQuery}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={e => {
                        setTaskSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                    />
                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsDropdownOpen(false)} 
                        />
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-base border border-border-line rounded-none shadow-lg no-scrollbar">
                          {filteredTasks.length === 0 ? (
                            <div className="text-xs text-text-dim p-3 italic text-center font-mono">
                              Sin coincidencias
                            </div>
                          ) : (
                            filteredTasks.map(t => (
                              <button
                                key={t.id}
                                type="button"
                                className="w-full text-left px-4 py-2 text-xs hover:bg-base-dim border-b border-border-line/20 last:border-0 flex flex-col gap-1 transition-colors cursor-pointer bg-transparent"
                                onClick={() => {
                                  setRetroTaskId(t.id);
                                  setTaskSearchQuery(t.text);
                                  setIsDropdownOpen(false);
                                  if (t.duracion) {
                                    setRetroDuration(t.duracion);
                                    if (retroStart) {
                                      const endVal = new Date(new Date(retroStart).getTime() + t.duracion * 3600000);
                                      setRetroEnd(toLocalInputFormat(endVal.toISOString()));
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[9px] font-mono font-medium uppercase tracking-wider", 
                                    t.type === 'Proyecto' ? 'text-indigo-500' :
                                    t.type === 'Rutina' ? 'text-orange-500' :
                                    t.type === 'Hábito' ? 'text-emerald-500' :
                                    'text-text-main'
                                  )}>
                                    [{t.type}]
                                  </span>
                                  {t.category && (
                                    <span className="text-[9px] font-mono text-text-dim">
                                      {t.category}
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-text-main">{t.text}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Start Date & Time */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1.5">Hora de Inicio</label>
                <input 
                  type="datetime-local" 
                  className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                  value={retroStart}
                  onChange={e => {
                    const val = e.target.value;
                    setRetroStart(val);
                    if (val && retroEnd) {
                      const diff = new Date(retroEnd).getTime() - new Date(val).getTime();
                      setRetroDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                    } else if (val && !retroEnd && retroDuration) {
                      const endVal = new Date(new Date(val).getTime() + retroDuration * 3600000);
                      setRetroEnd(toLocalInputFormat(endVal.toISOString()));
                    }
                  }}
                />
              </div>

              {/* End Date & Time */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1.5">Hora de Fin</label>
                <input 
                  type="datetime-local" 
                  className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                  value={retroEnd}
                  onChange={e => {
                    const val = e.target.value;
                    setRetroEnd(val);
                    if (retroStart && val) {
                      const diff = new Date(val).getTime() - new Date(retroStart).getTime();
                      setRetroDuration(Math.max(0, parseFloat((diff / 3600000).toFixed(2))));
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-transparent pt-4 border-t border-border-line/20">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-text-dim">Duración Real Sesión:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input 
                      type="number" 
                      min={0}
                      step="0.01"
                      className="w-20 text-xs px-3 py-1 border border-border-line bg-base text-center font-mono font-bold text-text-main outline-none"
                      value={retroDuration || 0}
                      onChange={e => setRetroDuration(Number(e.target.value))}
                    />
                    <span className="text-xs text-text-dim font-mono font-bold">horas</span>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-[var(--color-border-line)]/30" />

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 border-border-line bg-base text-primary focus:ring-0 cursor-pointer"
                    checked={retroMarkCompleted}
                    onChange={e => setRetroMarkCompleted(e.checked || e.target.checked)}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-text-main">Completar en planificador</span>
                    <span className="text-[10px] text-text-dim font-mono uppercase">Marcar tarea como hecha</span>
                  </div>
                </label>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (!retroTaskId) return;
                  if (!retroStart || !retroEnd) return;
                  if (onAddHistory) {
                    const startIso = new Date(retroStart).toISOString();
                    const endIso = new Date(retroEnd).toISOString();
                    onAddHistory({
                      userId: 'placeholder',
                      taskId: retroTaskId,
                      date: endIso,
                      duration: Number(retroDuration),
                      createdAt: new Date().toISOString(),
                      startTime: startIso,
                      endTime: endIso
                    });

                    if (retroMarkCompleted) {
                      const t = tasks.find(x => x.id === retroTaskId);
                      if (t && !t.completed && t.type !== 'Proyecto' && t.type !== 'Rutina') {
                        onToggleTask(t);
                      }
                    }

                    // Reset
                    setRetroTaskId('');
                    setRetroStart('');
                    setRetroEnd('');
                    setRetroDuration(0);
                    setTaskSearchQuery('');
                    setIsDropdownOpen(false);
                    setShowAddForm(false);
                  }
                }}
                disabled={!retroTaskId || !retroStart || !retroEnd}
                className="text-xs font-mono font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer bg-transparent border-0 outline-none disabled:opacity-40"
              >
                + Guardar Sesión Log
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        
        {/* SIMPLE ITEMS (TASKS/EVENTS) */}
        <div className="flex flex-col gap-4 h-fit bg-transparent">
          <div 
            onClick={() => setShowSimple(!showSimple)}
            className="flex items-center justify-between border-b border-border-line/40 pb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Ítems Simples
              <span className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.2 border border-border-line/50 font-normal">
                {simpleExecs.length.toString().padStart(2, '0')}
              </span>
            </h3>
            <span className="text-[10px] font-mono text-text-dim uppercase flex items-center gap-1 group-hover:text-text-main transition-colors">
              Tareas y Proyectos {showSimple ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
          {showSimple && renderHistoryList(simpleExecs, "Aún no has completado tareas simples.", false)}
        </div>

        {/* RECURRING ITEMS (HABITS/ROUTINES) */}
        <div className="flex flex-col gap-4 h-fit bg-transparent">
          <div 
            onClick={() => setShowRecurring(!showRecurring)}
            className="flex items-center justify-between border-b border-border-line/40 pb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Ítems Recurrentes
              <span className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.2 border border-border-line/50 font-normal">
                {recurringExecs.length.toString().padStart(2, '0')}
              </span>
            </h3>
            <span className="text-[10px] font-mono text-text-dim uppercase flex items-center gap-1 group-hover:text-text-main transition-colors">
              Hábitos y Rutinas {showRecurring ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
          {showRecurring && renderHistoryList(recurringExecs, "Aún no se registran hábitos o rutinas ejecutadas.", true)}
        </div>

      </div>
    </div>
  );
}
