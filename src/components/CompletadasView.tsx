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
import { cn, getAreaColorClasses } from '../lib/utils';
import { useToast } from './ToastProvider';
import CategoryBadge from './ui/CategoryBadge';
import { isSameRecurringClosureSlot } from '../domain/occurrenceResults';
import {
  DEFAULT_HISTORY_PERIOD,
  filterHistoryRecords,
  getHistoryDayKey,
  getHistoryContextTaskIds,
  getHistorySearchSuggestions,
  getRetrospectiveSessionTargets,
  getVisibleHistoryRecords,
  groupHistoryRecords,
  HISTORY_PAGE_SIZE,
  HistoryPeriod,
  HistorySearchScope,
  HistorySearchSuggestion,
  HistorySection,
} from '../domain/historyPresentation';
import HistorySearchControls from './HistorySearchControls';

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

const getInitialVisibleCounts = (): Record<HistorySection, number> => ({
  simple: HISTORY_PAGE_SIZE,
  recurring: HISTORY_PAGE_SIZE,
  pulses: HISTORY_PAGE_SIZE,
});

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
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyScopeSelection, setHistoryScopeSelection] = useState<HistorySearchSuggestion | null>(null);
  const [retroQuery, setRetroQuery] = useState('');
  const [showSimple, setShowSimple] = useState(true);
  const [showRecurring, setShowRecurring] = useState(true);
  const [showPulses, setShowPulses] = useState(true);
  const [subTasksMarkCompleted, setSubTasksMarkCompleted] = useState<Record<string, boolean>>({});

  const taskById = useMemo(
    () => new Map(tasks.map(task => [task.id, task])),
    [tasks],
  );

  const childrenByParentId = useMemo(() => {
    const index = new Map<string, AppTask[]>();
    for (const task of tasks) {
      if (!task.parentId) continue;
      const children = index.get(task.parentId) || [];
      children.push(task);
      index.set(task.parentId, children);
    }
    return index;
  }, [tasks]);

  const selectedTask = taskById.get(retroTaskId);

  const retrospectiveTasks = useMemo(() => {
    return getRetrospectiveSessionTargets(tasks, retroQuery);
  }, [tasks, retroQuery]);

  const historySuggestions = useMemo(
    () => getHistorySearchSuggestions(historyQuery, tasks, history),
    [historyQuery, tasks, history],
  );

  const historyScope = useMemo<HistorySearchScope | undefined>(() => {
    if (!historyScopeSelection) return undefined;
    if (historyScopeSelection.kind === 'item') {
      return { kind: 'item', id: historyScopeSelection.id };
    }
    const hasLiveContext = taskById.has(historyScopeSelection.id);
    return {
      kind: 'context',
      id: historyScopeSelection.id,
      taskIds: hasLiveContext
        ? getHistoryContextTaskIds(historyScopeSelection.id, tasks)
        : undefined,
    };
  }, [historyScopeSelection, taskById, tasks]);

  const [period, setPeriod] = useState<HistoryPeriod>(DEFAULT_HISTORY_PERIOD);
  const [visibleCounts, setVisibleCounts] = useState<Record<HistorySection, number>>(getInitialVisibleCounts);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history]);

  const filteredHistory = useMemo(() => {
    return filterHistoryRecords(
      sortedHistory,
      taskById,
      period,
      historyQuery,
      config?.cycleConfig?.lastCycleStartDate,
      new Date(),
      historyScope,
    );
  }, [
    sortedHistory,
    taskById,
    period,
    historyQuery,
    config?.cycleConfig?.lastCycleStartDate,
    historyScope,
  ]);

  const historyGroups = useMemo(
    () => groupHistoryRecords(filteredHistory, taskById),
    [filteredHistory, taskById],
  );

  const historyIndexes = useMemo(() => {
    const byId = new Map<string, HistoryRecord>();
    const firstByTask = new Map<string, HistoryRecord>();
    const byTaskDay = new Map<string, HistoryRecord>();

    for (const record of history) {
      byId.set(record.id, record);
      if (!firstByTask.has(record.taskId)) firstByTask.set(record.taskId, record);
      const taskDayKey = `${record.taskId}|${getHistoryDayKey(record.date)}`;
      if (!byTaskDay.has(taskDayKey)) byTaskDay.set(taskDayKey, record);
    }

    return { byId, firstByTask, byTaskDay };
  }, [history]);

  const expandedIdSet = useMemo(() => new Set(expandedIds), [expandedIds]);

  const resetVisibleCounts = () => {
    setVisibleCounts(getInitialVisibleCounts());
  };

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
    setRetroMarkCompleted(task ? !task.completed : true);
    if (task) {
      setRetroQuery(task.text);
    }
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

        const currentRecord = historyIndexes.byId.get(id);
        const currentTask = currentRecord ? taskById.get(currentRecord.taskId) : undefined;
        const isRecurringCompletion = currentRecord?.isCompletion === true
          && (currentTask?.type === 'Hábito' || currentTask?.type === 'Rutina');
        const duplicate = isRecurringCompletion && history.some(record => (
          record.id !== id
          && record.taskId === currentRecord!.taskId
          && record.isCompletion === true
          && currentTask
          && isSameRecurringClosureSlot(currentTask, tasks, record.date, finalEndISO)
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
    const task = taskById.get(h.taskId);
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
            const childHabits = (childrenByParentId.get(task.id) || []).filter(t => t.type === 'Hábito');
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
        const parentT = taskById.get(task.parentId);
        if (parentT && parentT.type === 'Rutina') {
          const parentLog = historyIndexes.byTaskDay.get(`${parentT.id}|${getHistoryDayKey(h.date)}`);
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

  const renderHistoryList = (
    list: HistoryRecord[],
    emptyMsg: string,
    isRecurringList: boolean,
    section: HistorySection,
  ) => {
    if (list.length === 0) {
      return (
        <div className="py-12 text-center flex flex-col items-center justify-center text-text-dim border border-dashed border-border-line/30 bg-transparent text-left">
          <CheckCircle2 className="w-8 h-8 text-[var(--color-border-line)]/50 mb-3" />
          <p className="text-text-dim font-mono text-xs uppercase tracking-wider">{emptyMsg}</p>
        </div>
      );
    }

    const visibleList = getVisibleHistoryRecords(list, period, visibleCounts[section]);
    const remainingCount = list.length - visibleList.length;

    return (
      <div className="flex flex-col text-left">
        {visibleList.map(h => {
          const task = taskById.get(h.taskId);
          const isEditing = editingId === h.id;
          const isExpanded = expandedIdSet.has(h.id);

          const displayCategory = task?.category || '';
          const areaConfig = config?.areas?.[displayCategory];
          const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

          const evDate = new Date(h.date);
          const formattedDate = evDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
          const formattedTime = evDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

          const childTasks = task ? childrenByParentId.get(task.id) || [] : [];
          const isProjectClosure = task?.type === 'Proyecto' && h.isCompletion === true && (h.duration || 0) === 0;
          const isPartialRecurringClosure = h.isCompletion === true
            && (task?.type === 'Hábito' || task?.type === 'Rutina')
            && h.completionPercent !== undefined
            && h.completionPercent < 100;
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
                        ) : isPartialRecurringClosure ? (
                          <small className="select-none border border-[var(--color-primary)]/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary" title="La aparición se cerró conservando el avance actual">
                            Cierre parcial · {h.completionPercent}%
                          </small>
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
                    let childLog = historyIndexes.byTaskDay.get(`${child.id}|${getHistoryDayKey(h.date)}`);
                    if (!childLog && (child.type === 'Tarea' || child.type === 'Pulso')) {
                      childLog = historyIndexes.firstByTask.get(child.id);
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
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setVisibleCounts(current => ({
                ...current,
                [section]: current[section] + HISTORY_PAGE_SIZE,
              }));
            }}
            className="mt-4 self-center border-0 bg-transparent px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
          >
            Cargar más ({remainingCount})
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="animate-in fade-in flex flex-col gap-6 px-5 md:px-8 xl:px-10 pt-8 pb-16 max-w-[1600px] mx-auto w-full text-left">
      <HistorySearchControls
        period={period}
        query={historyQuery}
        selectedScope={historyScopeSelection}
        suggestions={historySuggestions}
        onPeriodChange={nextPeriod => {
          setPeriod(nextPeriod);
          resetVisibleCounts();
        }}
        onQueryChange={query => {
          setHistoryQuery(query);
          resetVisibleCounts();
        }}
        onSelectScope={suggestion => {
          setHistoryScopeSelection(suggestion);
          setHistoryQuery('');
          resetVisibleCounts();
        }}
        onClearScope={() => {
          setHistoryScopeSelection(null);
          resetVisibleCounts();
        }}
        onOpenRegistration={() => openRetrospectiveForm()}
      />

      <section className="flex flex-col gap-3 bg-transparent py-4 border-b border-border-line/30">
        {showAddForm && (
          <section className="pt-4 border-t border-border-line/40 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            <header className="flex items-center justify-between gap-3">
              <strong className="text-[10px] font-mono uppercase tracking-widest text-primary">Registrar sesión retrospectiva</strong>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main bg-transparent border-0 cursor-pointer">Cancelar</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <fieldset className="relative flex flex-col gap-1 sm:col-span-1 md:col-span-2 lg:col-span-1 border-0 p-0 m-0">
                <legend className="text-[10px] font-mono text-text-dim uppercase mb-1.5">Elemento</legend>
                {selectedTask ? (
                  <output className="grid grid-cols-[minmax(0,1fr)_auto] items-center border border-border-line rounded-full px-4 py-2 bg-base-dim text-xs min-h-[38px]">
                    <strong className="font-semibold text-text-main truncate">{selectedTask.text}</strong>
                    <button type="button" onClick={() => {
                      setRetroTaskId('');
                      setRetroQuery('');
                    }} className="text-text-dim hover:text-text-main p-1 cursor-pointer bg-transparent border-0" title="Cambiar elemento">
                      <X className="w-4 h-4" />
                    </button>
                    <small className="col-span-2 text-[9px] font-mono uppercase tracking-wider text-text-dim">{selectedTask.type}</small>
                  </output>
                ) : (
                  <>
                    <label className="relative">
                      <small className="sr-only">Buscar tarea o hábito</small>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
                      <input
                        type="search"
                        value={retroQuery}
                        onChange={event => setRetroQuery(event.target.value)}
                        placeholder="Buscar tarea o hábito…"
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-base text-text-main border border-border-line rounded-full outline-none focus:border-[#a2b29f]"
                      />
                    </label>
                    {retroQuery.trim() && (
                      <nav aria-label="Elementos para registrar" className="absolute z-10 top-full left-0 right-0 border border-border-line/70 bg-base">
                        <ul className="list-none m-0 p-0">
                          {retrospectiveTasks.length > 0 ? retrospectiveTasks.map(task => (
                            <li key={task.id} className="border-b border-border-line/30 last:border-0">
                              <button
                                type="button"
                                onClick={() => openRetrospectiveForm(task)}
                                className="w-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left hover:bg-base-dim/40 bg-transparent border-0 cursor-pointer"
                              >
                                <strong className="min-w-0 truncate text-xs text-text-main font-medium">{task.text}</strong>
                                <small className="text-[9px] font-mono uppercase tracking-wider text-primary">{task.type}</small>
                              </button>
                            </li>
                          )) : (
                            <li className="px-3 py-2.5 text-xs text-text-dim">No hay tareas o hábitos coincidentes.</li>
                          )}
                        </ul>
                      </nav>
                    )}
                  </>
                )}
              </fieldset>

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

                <label className={cn("flex items-center gap-2.5 select-none", selectedTask?.completed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={retroMarkCompleted}
                      disabled={selectedTask?.completed}
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
                    <span className="text-xs font-semibold text-text-main">
                      {selectedTask?.completed ? 'Ya completada en el planificador' : 'Completar en planificador'}
                    </span>
                    <span className="text-[10px] text-text-dim font-mono uppercase">
                      {selectedTask?.completed ? 'La sesión se añadirá al historial' : 'Marcar tarea como hecha'}
                    </span>
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
                      const t = taskById.get(retroTaskId);
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
                    setRetroQuery('');
                    setShowAddForm(false);
                  }
                }}
                disabled={!retroTaskId || !retroStart || !retroEnd}
                className="text-xs font-mono font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer bg-transparent border-0 outline-none disabled:opacity-40"
              >
                + Guardar Sesión Log
              </button>
            </div>
          </section>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-10">

        {/* SIMPLE ITEMS (TASKS/EVENTS) */}
        <section className="flex flex-col gap-4 h-fit bg-transparent min-w-0">
          <button
            type="button"
            onClick={() => setShowSimple(!showSimple)}
            className="w-full flex items-center justify-between border-0 border-b border-border-line/40 pb-3 cursor-pointer select-none group bg-transparent text-left"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Proyectos y Tareas
              <output className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.5 border border-border-line/50 font-normal">
                {historyGroups.simple.length.toString().padStart(2, '0')}
              </output>
            </h3>
            {showSimple ? <ChevronUp className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" />}
          </button>
          {showSimple && renderHistoryList(historyGroups.simple, "Sin sesiones de tareas o proyectos.", false, 'simple')}
        </section>

        {/* RECURRING ITEMS (HABITS/ROUTINES) */}
        <section className="flex flex-col gap-4 h-fit bg-transparent min-w-0">
          <button
            type="button"
            onClick={() => setShowRecurring(!showRecurring)}
            className="w-full flex items-center justify-between border-0 border-b border-border-line/40 pb-3 cursor-pointer select-none group bg-transparent text-left"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Hábitos y Rutinas
              <output className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.5 border border-border-line/50 font-normal">
                {historyGroups.recurring.length.toString().padStart(2, '0')}
              </output>
            </h3>
            {showRecurring ? <ChevronUp className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" />}
          </button>
          {showRecurring && renderHistoryList(historyGroups.recurring, "Sin hábitos o rutinas registradas.", true, 'recurring')}
        </section>

        {/* PULSES */}
        <section className="flex flex-col gap-4 h-fit bg-transparent min-w-0">
          <button
            type="button"
            onClick={() => setShowPulses(!showPulses)}
            className="w-full flex items-center justify-between border-0 border-b border-border-line/40 pb-3 cursor-pointer select-none group bg-transparent text-left"
          >
            <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase flex items-center gap-2">
              Pulsos
              <output className="text-[11px] font-mono text-text-dim bg-base-dim px-2 py-0.5 border border-border-line/50 font-normal">
                {historyGroups.pulses.length.toString().padStart(2, '0')}
              </output>
            </h3>
            {showPulses ? <ChevronUp className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main" />}
          </button>
          {showPulses && renderHistoryList(historyGroups.pulses, "Sin pulsos registrados.", false, 'pulses')}
        </section>

      </section>
    </main>
  );
}
