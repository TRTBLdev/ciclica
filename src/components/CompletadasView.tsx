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
  Plus,
  Search
} from 'lucide-react';
import { cn, isSameDay, getAreaColorClasses } from '../lib/utils';
import { useToast } from './ToastProvider';
import CategoryBadge from './ui/CategoryBadge';

const getNextPlannedDate = (plannedDateStr: string | undefined, freq: number, unit: string) => {
  const dateStr = plannedDateStr || new Date().toISOString();
  const datePart = dateStr.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  let nextPlan = (year && month && day) ? new Date(year, month - 1, day) : new Date();

  let daysToAdd = freq || 1;
  if (unit === 'semanas') daysToAdd *= 7;
  if (unit === 'meses') daysToAdd *= 30;

  nextPlan.setDate(nextPlan.getDate() + daysToAdd);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  while (nextPlan.getTime() < todayStart.getTime()) {
    nextPlan.setDate(nextPlan.getDate() + daysToAdd);
  }

  const y = nextPlan.getFullYear();
  const m = String(nextPlan.getMonth() + 1).padStart(2, '0');
  const d = String(nextPlan.getDate()).padStart(2, '0');
  return new Date(`${y}-${m}-${d}T00:00:00`).toISOString();
};

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  onToggleTask: (task: AppTask, overrideDuration?: number, overrideStartTime?: string, overrideEndTime?: string) => void;
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
  const { showToast } = useToast();
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
  const [sessionQuery, setSessionQuery] = useState('');
  const [showSimple, setShowSimple] = useState(true);
  const [showRecurring, setShowRecurring] = useState(true);
  const [showPulses, setShowPulses] = useState(true);
  const [subTasksMarkCompleted, setSubTasksMarkCompleted] = useState<Record<string, boolean>>({});

  const selectedTask = tasks.find(t => t.id === retroTaskId);

  const matchingTasks = useMemo(() => {
    const query = sessionQuery.trim().toLocaleLowerCase('es-ES');
    if (!query) return [];
    return tasks.filter(task => task.text.toLocaleLowerCase('es-ES').includes(query));
  }, [tasks, sessionQuery]);

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

  const filteredHistory = useMemo(() => {
    const query = sessionQuery.trim().toLocaleLowerCase('es-ES');
    if (!query) return filteredHistoryByDate;
    return filteredHistoryByDate.filter(record => {
      const task = tasks.find(item => item.id === record.taskId);
      const label = task?.text || record.taskSnapshotText || '';
      return label.toLocaleLowerCase('es-ES').includes(query);
    });
  }, [filteredHistoryByDate, sessionQuery, tasks]);

  const simpleExecs = useMemo(() => {
    return filteredHistory.filter(h => {
      const task = tasks.find(t => t.id === h.taskId);
      if (!task) return true;
      if (task.type !== 'Tarea' && task.type !== 'Proyecto') return false;

      // Ocultar del nivel superior si tiene un padre y ese padre tiene un registro el mismo día
      if (task.parentId) {
        const parent = tasks.find(candidate => candidate.id === task.parentId);
        const parentHasLogSameDay = parent?.type !== 'Proyecto' && filteredHistory.some(ph =>
          ph.taskId === task.parentId && isSameDay(h.date, ph.date)
        );
        if (parentHasLogSameDay) return false;
      }
      return true;
    });
  }, [filteredHistory, tasks]);

  const recurringExecs = useMemo(() => {
    return filteredHistory.filter(h => {
      const task = tasks.find(t => t.id === h.taskId);
      if (!task) return false;
      if (task.type !== 'Hábito' && task.type !== 'Rutina') return false;

      // Ocultar del nivel superior si tiene un padre (ej. rutina) y ese padre tiene un registro el mismo día
      if (task.parentId) {
        const parentHasLogSameDay = filteredHistory.some(ph =>
          ph.taskId === task.parentId && isSameDay(h.date, ph.date)
        );
        if (parentHasLogSameDay) return false;
      }
      return true;
    });
  }, [filteredHistory, tasks]);

  const pulseExecs = useMemo(() => {
    return filteredHistory.filter(h => {
      if (h.pulseOutcome === 'safe-day') return false;
      const task = tasks.find(t => t.id === h.taskId);
      if (!task) return false;
      if (task.type !== 'Pulso') return false;
      return true;
    });
  }, [filteredHistory, tasks]);

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

  const openRetrospectiveForm = (task?: AppTask) => {
    const now = new Date();
    const duration = task?.duracion || 1;
    const start = new Date(now.getTime() - duration * 3600000);
    setRetroStart(toLocalInputFormat(start.toISOString()));
    setRetroEnd(toLocalInputFormat(now.toISOString()));
    setRetroDuration(duration);
    setRetroTaskId(task?.id || '');
    setRetroMarkCompleted(task?.type !== 'Rutina');
    if (task) setSessionQuery(task.text);
    setShowAddForm(true);
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

  const handleSaveEdit = (id: string, isPulso: boolean) => {
    try {
      let finalStartISO = '';
      let finalEndISO = '';
      if (isPulso) {
        finalEndISO = new Date(editEndTime).toISOString();
        onUpdateHistory(id, {
          date: finalEndISO,
          duration: 0,
          startTime: '',
          endTime: ''
        });
      } else {
        if (editStartTime && editEndTime) {
          finalStartISO = new Date(editStartTime).toISOString();
          finalEndISO = new Date(editEndTime).toISOString();
        } else {
          finalEndISO = new Date(`${editDate}T${editTime}:00`).toISOString();
          finalStartISO = new Date(new Date(finalEndISO).getTime() - editDuration * 3600000).toISOString();
        }

        const currentRecord = history.find(record => record.id === id);
        const currentTask = currentRecord ? tasks.find(task => task.id === currentRecord.taskId) : undefined;
        const isRecurringCompletion = currentRecord?.isCompletion === true
          && (currentTask?.type === 'Hábito' || currentTask?.type === 'Rutina');
        const duplicate = isRecurringCompletion && history.some(record => (
          record.id !== id
          && record.taskId === currentRecord!.taskId
          && record.isCompletion === true
          && isSameDay(record.date, finalEndISO)
        ));
        if (duplicate) {
          showToast("Ya existe una finalización de este elemento en ese día", "error");
          return;
        }

        onUpdateHistory(id, {
          date: finalEndISO,
          duration: Number(editDuration),
          startTime: finalStartISO,
          endTime: finalEndISO
        });
      }
      showToast("Registro histórico actualizado con éxito", "success");
    } catch (e) {
      console.error(e);
      showToast("Error al actualizar el registro", "error");
    }
    setEditingId(null);
  };

  const handleDeleteLog = (h: HistoryRecord) => {
    const task = tasks.find(t => t.id === h.taskId);
    if (task) {
      if (h.isCompletion !== false) {
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
    showToast("Registro eliminado con éxito", "success");
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
          const isProjectClosure = task?.type === 'Proyecto' && h.isCompletion === true && (h.duration || 0) === 0;
          const hasChildren = !isProjectClosure && childTasks.length > 0;

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
                    {task?.type === 'Pulso' ? (
                      <div className="flex flex-col gap-1 w-full text-left">
                        <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Fecha y Hora de Registro</label>
                        <input
                          type="datetime-local"
                          className="w-full text-xs px-4 py-2 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                          value={editEndTime}
                          onChange={e => {
                            setEditEndTime(e.target.value);
                            setEditStartTime('');
                            setEditDuration(0);
                          }}
                        />
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}

                    <div className="flex justify-end gap-6 mt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(h.id, task?.type === 'Pulso')}
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
                          {task?.text || (h.taskSnapshotText ? <span className="italic text-text-dim/80">{h.taskSnapshotText} <span className="text-[9px]">(Eliminado)</span></span> : <span className="italic text-text-dim/50">(Eliminado) {h.taskId.substring(0, 6)}</span>)}
                        </span>
                        {task?.type && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border-line/40 text-text-dim bg-transparent">
                            {task.type}
                          </span>
                        )}
                        {displayCategory && (
                          <CategoryBadge area={displayCategory} subCategory={task?.subCategory} config={config} />
                        )}
                        {isProjectClosure ? (
                          <small className="select-none border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary" title="Este evento registra el cierre manual del proyecto; no representa tiempo trabajado">
                            Proyecto cerrado
                          </small>
                        ) : h.isCompletion === false ? (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border-line/30 text-text-dim bg-base-dim/40 rounded-full select-none" title="Esta sesión registra tiempo de progreso, pero el ítem no se marcó como completado en el planificador">
                            ⏱️ Progreso
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[var(--color-primary)]/30 text-primary bg-[var(--color-primary)]/10 rounded-full select-none" title="Esta sesión completó o reprogramó el ítem en el planificador">
                            ✓ Completado
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
                              } catch (e) { return ''; }
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
                        onClick={() => {
                          const label = task ? `"${task.text}"` : 'este registro';
                          if (window.confirm(`¿Estás segura de eliminar la sesión de ejecución de ${label}? (Esto marcará la tarea/hábito como incompleta)`)) {
                            handleDeleteLog(h);
                          }
                        }}
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
                            {child.type === 'Pulso' ? (
                              <div className="flex flex-col gap-1 w-full text-left">
                                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1">Fecha y Hora de Registro</label>
                                <input
                                  type="datetime-local"
                                  className="w-full text-xs px-4 py-1.5 border border-border-line rounded-full bg-base text-text-main outline-none font-mono"
                                  value={editEndTime}
                                  onChange={e => {
                                    setEditEndTime(e.target.value);
                                    setEditStartTime('');
                                    setEditDuration(0);
                                  }}
                                />
                              </div>
                            ) : (
                              <>
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
                              </>
                            )}

                            <div className="flex justify-end gap-4 mt-1">
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEdit(childLog!.id, child.type === 'Pulso')}
                                className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                onClick={() => {
                                  if (!childLog && onAddHistory) {
                                    const shouldComplete = subTasksMarkCompleted[child.id] !== false;
                                    const childDur = child.duracion || 0;
                                    onAddHistory({
                                      userId: h.userId,
                                      taskId: child.id,
                                      date: h.date,
                                      duration: childDur,
                                      createdAt: new Date().toISOString(),
                                      isCompletion: shouldComplete
                                    });
                                    if (shouldComplete) {
                                      if (child.type === 'Tarea' || child.type === 'Pulso') {
                                        onUpdateTask(child.id, { completed: true, view: '' });
                                      } else if (child.type === 'Hábito') {
                                        const chNextDate = getNextPlannedDate(
                                          child.fechaPlanificada,
                                          child.frecuencia || 1,
                                          child.frecuenciaUnidad || 'días'
                                        );
                                        onUpdateTask(child.id, {
                                          completed: false,
                                          fechaPlanificada: chNextDate,
                                          lastExecutedAt: new Date().toISOString()
                                        });
                                      }
                                    }
                                    if (h.duration !== undefined && h.duration > 0) {
                                      const newParentDur = Math.max(0, parseFloat((h.duration - childDur).toFixed(2)));
                                      onUpdateHistory(h.id, { duration: newParentDur });
                                    }
                                    showToast("Ejecución de sub-ítem registrada con éxito", "success");
                                  } else if (childLog) {
                                    if (window.confirm(`¿Estás segura de eliminar la sesión de ejecución de "${child.text}"? (Esto la marcará como incompleta)`)) {
                                      handleDeleteLog(childLog);
                                    }
                                  }
                                }}
                                className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center border shrink-0 cursor-pointer transition-all bg-transparent outline-none p-0",
                                  childLog
                                    ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-primary hover:bg-red-500/15 hover:border-red-500 hover:text-red-500"
                                    : "border-border-line/85 text-text-dim/40 hover:border-[var(--color-primary)] hover:text-primary"
                                )}
                                title={childLog ? "Deshacer ejecución de sub-ítem" : "Registrar ejecución de sub-ítem aquí"}
                              >
                                {childLog && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
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
                                    {childLog.isCompletion === false ? (
                                      <span className="text-[9px] font-mono text-text-dim border border-border-line/30 bg-base-dim/40 px-1.5 py-0.5 rounded-full" title="Sesión de progreso">Progreso</span>
                                    ) : (
                                      <span className="text-[9px] font-mono text-primary border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-full" title="Sesión de completado">✓ Completado</span>
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
                                      onClick={() => {
                                        if (window.confirm(`¿Estás segura de eliminar la sesión de ejecución de "${child.text}"? (Esto la marcará como incompleta)`)) {
                                          handleDeleteLog(childLog!);
                                        }
                                      }}
                                      className="p-1.5 text-text-dim hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0"
                                      title="Deshacer cumplimiento de este sub-ítem"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                onAddHistory && (
                                  <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Si está marcado, también completa o reprograma la tarea/hábito en el planificador">
                                      <div className="relative flex items-center">
                                        <input
                                          type="checkbox"
                                          className="sr-only"
                                          checked={subTasksMarkCompleted[child.id] !== false}
                                          onChange={() => {
                                            setSubTasksMarkCompleted(prev => ({
                                              ...prev,
                                              [child.id]: subTasksMarkCompleted[child.id] === false
                                            }));
                                          }}
                                        />
                                        <div className={cn(
                                          "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all duration-150",
                                          (subTasksMarkCompleted[child.id] !== false)
                                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-base)]"
                                            : "border-border-line bg-transparent text-transparent hover:border-[var(--color-primary)]"
                                        )}>
                                          <Check className="w-2 h-2 stroke-[3]" />
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-mono uppercase text-text-dim/80">Completar</span>
                                    </label>

                                    <button
                                      onClick={() => {
                                        const shouldComplete = subTasksMarkCompleted[child.id] !== false;
                                        const childDur = child.duracion || 0;
                                        onAddHistory({
                                          userId: h.userId,
                                          taskId: child.id,
                                          date: h.date,
                                          duration: childDur,
                                          createdAt: new Date().toISOString(),
                                          isCompletion: shouldComplete
                                        });
                                        if (shouldComplete) {
                                          if (child.type === 'Tarea' || child.type === 'Pulso') {
                                            onUpdateTask(child.id, { completed: true, view: '' });
                                          } else if (child.type === 'Hábito') {
                                            const chNextDate = getNextPlannedDate(
                                              child.fechaPlanificada,
                                              child.frecuencia || 1,
                                              child.frecuenciaUnidad || 'días'
                                            );
                                            onUpdateTask(child.id, {
                                              completed: false,
                                              fechaPlanificada: chNextDate,
                                              lastExecutedAt: new Date().toISOString()
                                            });
                                          }
                                        }
                                        if (h.duration !== undefined && h.duration > 0) {
                                          const newParentDur = Math.max(0, parseFloat((h.duration - childDur).toFixed(2)));
                                          onUpdateHistory(h.id, { duration: newParentDur });
                                        }
                                        showToast("Ejecución de sub-ítem registrada con éxito", "success");
                                      }}
                                      className="px-2.5 py-0.5 border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-text-main hover:bg-[var(--color-primary)]/20 transition-all text-xs font-mono font-medium cursor-pointer"
                                      title="Registrar ejecución a este bloque"
                                    >
                                      <Plus className="w-3 h-3 inline mr-1" /> Registrar aquí
                                    </button>
                                  </div>
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
          <h2 className="text-title">Historial de sesiones</h2>
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
        Consulta sesiones completadas y de progreso, o registra actividad retrospectiva desde el mismo punto de entrada.
      </p>

      <div className="relative flex flex-col gap-3 border-b border-border-line/30 pb-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
            <input
              type="search"
              value={sessionQuery}
              onChange={event => setSessionQuery(event.target.value)}
              placeholder="Buscar sesiones o elemento…"
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-base text-text-main border border-border-line rounded-full outline-none focus:border-[#a2b29f]"
            />
            {sessionQuery && (
              <button type="button" onClick={() => setSessionQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-text-main bg-transparent border-0 cursor-pointer" title="Limpiar búsqueda">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="button" onClick={() => openRetrospectiveForm()} className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-text-main hover:bg-base-dim/40 bg-transparent cursor-pointer">
            <Plus className="inline w-3.5 h-3.5 mr-1.5" /> Registrar sesión
          </button>
        </div>
        {sessionQuery.trim() && (
          <div className="flex flex-col border border-border-line/60 bg-base">
            <div className="px-3 py-2 text-[9px] font-mono uppercase tracking-widest text-text-dim border-b border-border-line/40">Registrar para</div>
            {matchingTasks.length > 0 ? matchingTasks.slice(0, 6).map(task => (
              <button key={task.id} type="button" onClick={() => openRetrospectiveForm(task)} className="flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-base-dim/40 border-b border-border-line/30 last:border-0 bg-transparent cursor-pointer">
                <span className="min-w-0 truncate text-xs text-text-main">{task.text}</span>
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-wider text-primary">Registrar sesión</span>
              </button>
            )) : (
              <p className="px-3 py-2.5 text-xs text-text-dim">No hay elementos coincidentes para registrar.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 bg-transparent py-4 border-b border-border-line/30">
        {showAddForm && (
          <div className="pt-4 border-t border-border-line/40 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Registrar sesión retrospectiva</span>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main bg-transparent border-0 cursor-pointer">Cancelar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <div className="flex flex-col gap-1 sm:col-span-1 md:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-mono text-text-dim uppercase block mb-1.5">Elemento</label>
                {selectedTask ? (
                  <div className="flex items-center justify-between border border-border-line rounded-full px-4 py-2.5 bg-base-dim text-xs min-h-[38px]">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim">{selectedTask.type}</span>
                      <span className="font-semibold text-text-main truncate">{selectedTask.text}</span>
                    </div>
                    <button type="button" onClick={() => setRetroTaskId('')} className="text-text-dim hover:text-text-main p-1 cursor-pointer bg-transparent border-0" title="Cambiar elemento desde la búsqueda superior">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="min-h-[38px] flex items-center px-4 text-xs text-text-dim border border-dashed border-border-line rounded-full">Busca y elige un elemento en la barra superior.</p>
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
                      className="w-20 text-xs px-3 py-1 border border-border-line rounded-full bg-base text-center font-mono font-bold text-text-main outline-none"
                      value={retroDuration || 0}
                      onChange={e => setRetroDuration(Number(e.target.value))}
                    />
                    <span className="text-xs text-text-dim font-mono font-bold">horas</span>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-[var(--color-border-line)]/30" />

                <label className={cn("flex items-center gap-2.5 select-none", selectedTask?.type === 'Rutina' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={retroMarkCompleted}
                      disabled={selectedTask?.type === 'Rutina'}
                      onChange={e => setRetroMarkCompleted(e.target.checked)}
                    />
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all duration-150",
                      retroMarkCompleted
                        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-base)]"
                        : "border-border-line bg-transparent text-transparent hover:border-[var(--color-primary)]"
                    )}>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  </div>
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
                    if (retroMarkCompleted) {
                      const t = tasks.find(x => x.id === retroTaskId);
                      if (t) {
                        onToggleTask(t, Number(retroDuration), startIso, endIso);
                      }
                    } else {
                      onAddHistory({
                        userId: 'placeholder',
                        taskId: retroTaskId,
                        date: endIso,
                        duration: Number(retroDuration),
                        createdAt: new Date().toISOString(),
                        startTime: startIso,
                        endTime: endIso,
                        isCompletion: false
                      });
                    }

                    showToast("Sesión retrospectiva registrada con éxito", "success");

                    // Reset
                    setRetroTaskId('');
                    setRetroStart('');
                    setRetroEnd('');
                    setRetroDuration(0);
                    setSessionQuery('');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* SIMPLE ITEMS (TASKS/EVENTS) */}
        <div className="flex flex-col gap-4 h-fit bg-transparent">
          <div
            onClick={() => setShowSimple(!showSimple)}
            className="flex items-center justify-between border-b border-border-line/40 pb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Proyectos y Tareas
              <span className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.2 border border-border-line/50 font-normal">
                {simpleExecs.length.toString().padStart(2, '0')}
              </span>
            </h3>
            <span className="text-[10px] font-mono text-text-dim uppercase flex items-center gap-1 group-hover:text-text-main transition-colors">
              {showSimple ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
          {showSimple && renderHistoryList(simpleExecs, "Sin sesiones de tareas o proyectos.", false)}
        </div>

        {/* RECURRING ITEMS (HABITS/ROUTINES) */}
        <div className="flex flex-col gap-4 h-fit bg-transparent">
          <div
            onClick={() => setShowRecurring(!showRecurring)}
            className="flex items-center justify-between border-b border-border-line/40 pb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Hábitos y Rutinas
              <span className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.2 border border-border-line/50 font-normal">
                {recurringExecs.length.toString().padStart(2, '0')}
              </span>
            </h3>
            <span className="text-[10px] font-mono text-text-dim uppercase flex items-center gap-1 group-hover:text-text-main transition-colors">
              {showRecurring ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
          {showRecurring && renderHistoryList(recurringExecs, "Sin hábitos o rutinas registradas.", true)}
        </div>

        {/* PULSES */}
        <div className="flex flex-col gap-4 h-fit bg-transparent">
          <div
            onClick={() => setShowPulses(!showPulses)}
            className="flex items-center justify-between border-b border-border-line/40 pb-3 cursor-pointer select-none group"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Pulsos
              <span className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.2 border border-border-line/50 font-normal">
                {pulseExecs.length.toString().padStart(2, '0')}
              </span>
            </h3>
            <span className="text-[10px] font-mono text-text-dim uppercase flex items-center gap-1 group-hover:text-text-main transition-colors">
              {showPulses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </div>
          {showPulses && renderHistoryList(pulseExecs, "Sin pulsos registrados.", false)}
        </div>

      </div>
    </div>
  );
}
