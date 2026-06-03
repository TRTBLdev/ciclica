import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType } from '../types';
import { isFutureDate } from '../lib/utils';
import { CheckSquare, Square, RotateCw, X, Lock, Edit2, Save, ChevronDown, ChevronUp, Plus, Repeat, Circle, CheckCircle2, ArrowUpFromLine, Folder, Play, ArrowUpRight } from 'lucide-react';
import { cn, getAreaColorClasses, calculateBiologicalPhase } from '../lib/utils';

interface Props {
  key?: React.Key;
  task: AppTask;
  config: Config | null;
  allTasks: AppTask[];
  onToggle: (task: AppTask) => void;
  onDelete: () => void;
  onUpdate?: (id: string, updates: Partial<AppTask>) => void;
  onAddTask?: (task: Omit<AppTask, 'id'>) => void;
  onDeleteTask?: (id: string) => void;
  isSubtask?: boolean;
  hideAreaCategory?: boolean;
  activeTimer?: { taskId: string; isRunning: boolean } | null;
  onStartTimer?: (taskId: string) => void;
  history?: HistoryRecord[];
  onNavigateToLocation?: () => void;
}

export default function TaskItem({ 
  task, 
  config, 
  allTasks, 
  onToggle, 
  onDelete, 
  onUpdate, 
  onAddTask, 
  onDeleteTask, 
  isSubtask = false, 
  hideAreaCategory = false,
  activeTimer,
  onStartTimer,
  history,
  onNavigateToLocation
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority || 'Baja');
  const [editHora, setEditHora] = useState(task.hora || '');
  const [editFrecuencia, setEditFrecuencia] = useState(task.frecuencia || 1);
  const [editFrecuenciaUnidad, setEditFrecuenciaUnidad] = useState(task.frecuenciaUnidad || 'días');
  const [editView, setEditView] = useState(task.view || 'Backlog');
  const parentTaskHere = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const isRutinaParent = parentTaskHere && parentTaskHere.type === 'Rutina';
  const [editArea, setEditArea] = useState(task.category || '');
  const [editSubCategory, setEditSubCategory] = useState(task.subCategory || '');
  const [editParentId, setEditParentId] = useState(task.parentId || '');
  const [editFechaPlanificada, setEditFechaPlanificada] = useState(task.fechaPlanificada ? new Date(task.fechaPlanificada).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
  const [editDuracion, setEditDuracion] = useState<number>(task.duracion || 0);
  const [editType, setEditType] = useState<TaskType>(task.type);
  const [editDependencyId, setEditDependencyId] = useState(task.dependencyId || '');
  const [depSearch, setDepSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  React.useEffect(() => {
    if (isEditing) {
      setEditText(task.text);
      setEditPriority(task.priority || 'Baja');
      setEditHora(task.hora || '');
      setEditFrecuencia(task.frecuencia || 1);
      setEditFrecuenciaUnidad(task.frecuenciaUnidad || 'días');
      setEditView(task.view || 'Backlog');
      setEditArea(task.category || '');
      setEditSubCategory(task.subCategory || '');
      setEditParentId(task.parentId || '');
      setEditFechaPlanificada(task.fechaPlanificada ? new Date(task.fechaPlanificada).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
      setEditDuracion(task.duracion || 0);
      setEditType(task.type);
      setEditDependencyId(task.dependencyId || '');
      setDepSearch('');
    }
  }, [isEditing, task]);

  const subtasks = allTasks.filter(t => t.parentId === task.id);
  const activeProjects = allTasks.filter(t => t.type === 'Proyecto' && !t.completed);
  const activeRoutines = allTasks.filter(t => t.type === 'Rutina' && !t.completed);
  const hasSubtasks = subtasks.length > 0;

  const isLocked = () => {
    if (!task.dependencyId) return false;
    const blockingTask = allTasks.find(t => t.id === task.dependencyId);
    return blockingTask ? !blockingTask.completed : false;
  };

  const handleSave = () => {
    if (editText.trim() && onUpdate) {
      const updates: any = { 
        text: editText.trim(), 
        priority: editPriority,
        view: editView,
        category: editArea,
        subCategory: editSubCategory,
        parentId: editParentId,
        type: editType,
        dependencyId: editDependencyId,
      };
      
      const planDate = new Date(editFechaPlanificada);
      // Mantener la hora si ya la tenía programada u otra.
      if (!isNaN(planDate.getTime())) {
         updates.fechaPlanificada = planDate.toISOString();
      }

      if (editType === 'Tarea' && editParentId !== '') {
        const parentT = allTasks.find(t => t.id === editParentId);
        if (parentT) {
          updates.category = parentT.category || editArea;
          updates.subCategory = parentT.subCategory || '';
        }
      }

      if (editHora) {
        updates.hora = editHora;
        // Si pone hora, asumimos que va para Hoy
        if (editView !== 'Hoy') {
          updates.view = 'Hoy';
        }
      } else {
        updates.hora = '';
      }
      
      if (editType === 'Hábito' || editType === 'Rutina') {
        updates.frecuencia = Number(editFrecuencia);
        updates.frecuenciaUnidad = editFrecuenciaUnidad;
      }

      if (editType === 'Tarea' || editType === 'Hábito') {
        updates.duracion = Number(editDuracion);
      }

      onUpdate(task.id, updates);
    }
    setIsEditing(false);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !onAddTask) return;

    onAddTask({
      userId: 'placeholder', // Overridden by useData
      text: newTaskText.trim(),
      category: task.category,
      subCategory: task.subCategory, // Inherit
      type: 'Tarea',
      parentId: task.id,
      completed: false,
      createdAt: new Date().toISOString()
    });

    setNewTaskText('');
    setAddingSubtask(false);
    setIsExpanded(true);
  };

  const locked = isLocked();
  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const isActualSubtask = !!(parentTask && parentTask.type !== 'Proyecto');
  const displayCategory = task.category || (parentTask ? parentTask.category : '');
  const displaySubCategory = task.subCategory || (parentTask ? parentTask.subCategory : '');
  const areaConfig = config?.areas?.[displayCategory || ''];
  const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
  const isHabit = task.type === 'Hábito';
  
  const getTrackedDuration = () => {
    if (!history) return 0;
    if (task.type !== 'Proyecto' && task.type !== 'Rutina' && !hasSubtasks) {
      return history.filter(h => h.taskId === task.id).reduce((acc, h) => acc + (h.duration || 0), 0);
    }
    const childrenIds = allTasks.filter(t => t.parentId === task.id).map(t => t.id);
    return history.filter(h => childrenIds.includes(h.taskId)).reduce((acc, h) => acc + (h.duration || 0), 0);
  };

  const trackedHours = getTrackedDuration();

  const plannedHours = (task.type === 'Proyecto' || task.type === 'Rutina' || hasSubtasks)
    ? allTasks.filter(t => t.parentId === task.id).reduce((acc, t) => acc + (t.duracion || 0), 0)
    : (task.duracion || 0);

  const getHabitCompletionPercentage = () => {
    if (task.type !== 'Hábito' || !history) return null;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const checksInPeriod = history.filter(h => h.taskId === task.id && new Date(h.date) >= thirtyDaysAgo).length;
    
    const freq = task.frecuencia || 1;
    const unit = task.frecuenciaUnidad || 'días';
    
    let expectedChecks = 30;
    if (unit === 'días') {
      expectedChecks = 30 / freq;
    } else if (unit === 'semanas') {
      expectedChecks = (30 / 7) * freq;
    } else if (unit === 'meses') {
      expectedChecks = freq;
    }
    
    // Autocuidado compasivo: congelar metas durante la Fase Reflexiva
    const phase = calculateBiologicalPhase(config);
    let targetAdjustment = 1.0;
    if (phase === 'reflexiva') {
      targetAdjustment = 0.7; // reduces expectation by 30% for menstrual ease
    }
    
    const finalExpected = Math.max(1, Math.round(expectedChecks * targetAdjustment));
    return Math.min(100, Math.round((checksInPeriod / finalExpected) * 100));
  };

  const prioBadge = () => {
    if (task.priority === 'Alta') return <span className="flex items-center h-5 px-2 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border border-red-200 bg-red-100 text-red-700 leading-none">🔥 Alta</span>;
    if (task.priority === 'Media') return <span className="flex items-center h-5 px-2 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border border-amber-200 bg-amber-100 text-amber-700 leading-none">🟡 Media</span>;
    if (task.priority === 'Baja') return <span className="flex items-center h-5 px-2 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border border-emerald-200 bg-emerald-100 text-emerald-700 leading-none">🟢 Baja</span>;
    return null;
  };

  return (
    <div 
      id={`task-item-${task.id}`}
      className={cn(
        "relative group flex flex-col p-4 transition-all duration-200",
        task.completed && !isEditing ? "grayscale" : "",
        locked ? "opacity-60 pointer-events-none grayscale" : "",
        isSubtask ? "ml-8 mt-1 relative before:content-[''] before:absolute before:-left-4 before:-top-4 before:bottom-1/2 before:w-[1px] before:border-l before:border-b before:border-border-line before:rounded-bl" : ""
      )}
    >
      
      <div className="flex items-start gap-3 md:gap-4 w-full">
        <button onClick={() => onToggle(task)} className="mt-1 flex-shrink-0 focus:outline-none z-10 bg-transparent hover:opacity-70 transition-opacity">
          {(task.type === 'Rutina' || task.type === 'Hábito') ? (
            task.completed ? <CheckCircle2 className="w-4 h-4 cursor-pointer text-text-main opacity-40" /> : <Circle className="w-4 h-4 cursor-pointer text-text-main" />
          ) : (
            task.completed ? <CheckSquare className="w-4 h-4 text-text-main opacity-40" /> : <Square className="w-4 h-4 text-text-main" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2 mb-1.5 mt-0.5">
            <input 
              autoFocus
              type="text" 
              className="w-full px-4 py-1.5 text-sm bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <div className="flex flex-wrap gap-2 text-left">
              {/* Selector de Tipo para conversión */}
              <div className="flex items-center gap-1.5 bg-transparent rounded-md pl-2 pr-1 relative" title="Convertir Tipo de Elemento">
                <span className="text-xs text-text-dim uppercase font-mono">Tipo:</span>
                <select
                  className="appearance-none py-1 bg-base text-text-main text-xs font-bold border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none cursor-pointer pr-6"
                  value={editType}
                  onChange={e => {
                    const newType = e.target.value as TaskType;
                    setEditType(newType);
                    // Clear parentId if switching to top-level types
                    if (newType === 'Proyecto' || newType === 'Rutina' || newType === 'Meta') {
                      setEditParentId('');
                    } else if (newType === 'Hábito' && editType === 'Tarea') {
                      setEditParentId('');
                    } else if (newType === 'Tarea' && editType === 'Hábito') {
                      setEditParentId('');
                    }
                  }}
                >
                  <option value="Tarea">📝 Tarea</option>
                  <option value="Proyecto">📁 Proyecto</option>
                  <option value="Rutina">🔁 Rutina</option>
                  <option value="Hábito">🌱 Hábito</option>
                  <option value="Meta">🎯 Meta de Enfoque</option>
                  <option value="Pulso">💓 Pulso (Multi-Diario)</option>
                </select>
                <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
              </div>

              {(editType === 'Hábito' || editType === 'Rutina') && (
                <div className="flex items-center gap-1 bg-transparent rounded-md pl-2 pr-1 relative">
                  <span className="text-xs text-text-dim font-mono">Cada</span>
                  <input 
                    type="number" 
                    min={1} 
                    className="w-10 py-1 bg-base text-text-main text-xs font-medium focus:outline-none text-center border-b border-border-line" 
                    value={editFrecuencia} 
                    onChange={e => setEditFrecuencia(Number(e.target.value))}
                  />
                  <select 
                    className="appearance-none py-1 bg-base text-text-main text-xs font-medium border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none cursor-pointer pr-6" 
                    value={editFrecuenciaUnidad} 
                    onChange={e => setEditFrecuenciaUnidad(e.target.value)}
                  >
                    <option value="días">días</option>
                    <option value="semanas">semanas</option>
                    <option value="meses">meses</option>
                  </select>
                  <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                </div>
              )}

              {/* Dynamic Subtask check for form inputs */}
              {(() => {
                const editParentTask = editParentId ? allTasks.find(pt => pt.id === editParentId) : null;
                const isEditActualSubtask = !!(editParentTask && editParentTask.type !== 'Proyecto');
                return (
                  <>
                    {!isEditActualSubtask && (
                      <>
                        <input 
                          type="time" 
                          className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono outline-none" 
                          value={editHora}
                          onChange={e => setEditHora(e.target.value)}
                        />
                        {(editType === 'Tarea' || editType === 'Pulso') && (
                          <div className="relative flex items-center bg-transparent rounded-md">
                            <select 
                              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none" 
                              value={editView} 
                              onChange={e => setEditView(e.target.value)}
                            >
                               <option value="Hoy">☀️ Hoy</option>
                               <option value="Backlog">📥 Backlog</option>
                            </select>
                            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                          </div>
                        )}
                      </>
                    )}

                    {(editType === 'Tarea' || editType === 'Proyecto') && (
                      <div className="relative flex items-center bg-transparent rounded-md">
                        <select 
                          className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none" 
                          value={editPriority} 
                          onChange={e => setEditPriority(e.target.value)}
                        >
                           <option value="Baja">🟢 Prioridad Baja</option>
                           <option value="Media">🟡 Prioridad Media</option>
                           <option value="Alta">🔥 Prioridad Alta</option>
                        </select>
                        <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                      </div>
                    )}

                    {(!isEditActualSubtask || editType === 'Hábito') && (
                      <div className="flex gap-2 items-center flex-wrap">
                        <div className="relative flex items-center bg-transparent rounded-md">
                          <select 
                            className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full max-w-[150px] truncate focus:outline-none" 
                            value={editArea} 
                            onChange={e => { setEditArea(e.target.value); setEditSubCategory(''); }}
                            title="Área"
                          >
                            <option value="">Sin Área</option>
                            {Object.keys(config?.areas || {}).map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                        </div>
                        
                        {editArea && typeof config?.areas?.[editArea] !== 'string' && (config?.areas?.[editArea] as any)?.categories?.length > 0 && (
                          <div className="relative flex items-center bg-transparent rounded-md">
                            <select 
                              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full max-w-[150px] truncate focus:outline-none" 
                              value={editSubCategory}
                              onChange={e => setEditSubCategory(e.target.value)}
                              title="Categoría"
                            >
                              <option value="">Sin Categoría</option>
                              {((config?.areas?.[editArea] as any)?.categories || []).map((sc: string) => (
                                <option key={sc} value={sc}>{sc}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                          </div>
                        )}

                        {editType !== 'Rutina' && editType !== 'Proyecto' && (
                          <div className="flex items-center gap-1 bg-transparent rounded-md pl-2 pr-1 relative" title="Relación Padre (Convertir en Subtarea)">
                            <span className="text-xs text-text-dim font-mono uppercase">Padre:</span>
                            <select 
                              className="appearance-none py-1.5 bg-base text-text-main text-xs font-bold border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none max-w-[140px] truncate cursor-pointer pr-6" 
                              value={editParentId} 
                              onChange={e => setEditParentId(e.target.value)}
                            >
                              <option value="">Top-Level</option>
                              {editType === 'Hábito' ? (
                                <optgroup label="Rutinas">
                                  {activeRoutines.map(r => (
                                    <option key={r.id} value={r.id}>{r.text}</option>
                                  ))}
                                </optgroup>
                              ) : (
                                <>
                                  <optgroup label="Proyectos">
                                    {activeProjects.map(p => (
                                      <option key={p.id} value={p.id}>{p.text}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Otras Tareas">
                                    {allTasks.filter(t => t.type === 'Tarea' && t.id !== task.id && t.parentId !== task.id && !t.completed).map(t => (
                                      <option key={t.id} value={t.id}>↳ {t.text}</option>
                                    ))}
                                  </optgroup>
                                </>
                              )}
                            </select>
                            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                          </div>
                        )}

                        {(editType === 'Hábito' || editType === 'Rutina' || editType === 'Pulso') && (
                          <input 
                            type="date"
                            className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono w-[120px]"
                            value={editFechaPlanificada}
                            onChange={e => setEditFechaPlanificada(e.target.value)}
                            title="Fecha Planificada"
                          />
                        )}
                        {(editType === 'Tarea' || editType === 'Hábito') && (
                          <div className="flex items-center gap-1 bg-base border border-border-line rounded-full px-3 py-1.5" title="Duración estimada (horas)">
                            <input 
                              type="number" 
                              min={0} 
                              step="0.1"
                              className="w-10 bg-transparent text-text-main text-xs font-bold focus:outline-none text-center" 
                              value={editDuracion || ''} 
                              onChange={e => setEditDuracion(Number(e.target.value))}
                              placeholder="0.0"
                            />
                            <span className="text-xs text-text-dim font-mono font-bold">h</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            {/* Prerequisite search list */}
            {editType === 'Tarea' && editParentId && allTasks.find(p => p.id === editParentId && p.type === 'Proyecto') && (
              <div className="flex flex-col gap-1 text-left w-full sm:w-80 mt-2 pb-1 relative z-30 select-none">
                <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Depende de (Prerrequisito):</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar tarea compañera..."
                    className="w-full px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                    value={depSearch}
                    onChange={e => setDepSearch(e.target.value)}
                  />
                  {editDependencyId && (
                    <div className="flex justify-between items-center text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-600 px-3 py-1.5 mt-1.5 rounded-xl">
                      <span className="truncate">Espera a: {allTasks.find(t => t.id === editDependencyId)?.text || 'Tarea'}</span>
                      <button 
                        type="button" 
                        onClick={() => setEditDependencyId('')}
                        className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer text-xs"
                      >
                        ✕ quitar
                      </button>
                    </div>
                  )}
                  {depSearch.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-base border border-border-line shadow-lg max-h-40 overflow-y-auto flex flex-col p-1 rounded-xl glass-matte">
                      {allTasks.filter(t => t.parentId === editParentId && t.id !== task.id && t.type === 'Tarea' && !t.completed && t.text.toLowerCase().includes(depSearch.toLowerCase())).map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setEditDependencyId(t.id);
                            setDepSearch('');
                          }}
                          className="px-2 py-1.5 rounded hover:bg-base-dim/40 cursor-pointer text-xs text-text-main truncate text-left"
                        >
                          {t.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
            <div className="flex items-center gap-6 mt-3">
              <button onClick={handleSave} className="text-text-main text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer hover:underline">
                + Guardar
              </button>
              <button onClick={() => setIsEditing(false)} className="text-text-dim text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer hover:underline">
                ✕ Cancelar
              </button>
            </div>
          </div>
        ) : (
        <div className="flex items-center gap-3 flex-wrap mb-2 text-left">
            <p className={cn("text-base", task.completed ? "text-text-dim opacity-55 line-through decoration-[var(--color-text-dim)]/50" : "text-text-main font-normal")}>
              {task.text}
            </p>
            {onUpdate && (
              <button onClick={() => setIsEditing(true)} className="opacity-100 md:opacity-0 group-hover:opacity-100 ml-1 text-[#a2b29f] hover:text-[#5d5d5d] transition-opacity p-1">
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {locked && <span className="flex items-center gap-1 text-xs font-mono font-medium uppercase tracking-widest text-[#b45f06] border border-[#e4e2dd] px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Bloqueada</span>}
          </div>
        )}
        
        <div className="flex flex-wrap items-center justify-between w-full mt-2 gap-y-1.5 gap-x-2 md:pr-4">
          {(task.type === 'Tarea' || task.type === 'Proyecto') && <div>{prioBadge()}</div>}
          {!hideAreaCategory && (!isActualSubtask || task.type === 'Hábito') && displayCategory && <span className={cn("flex items-center h-5 text-[10px] font-mono font-medium uppercase tracking-wider border px-2 rounded-full leading-none", getAreaColorClasses(color))}>{displayCategory}</span>}
          {!hideAreaCategory && (!isActualSubtask || task.type === 'Hábito') && displaySubCategory && <span className={cn("flex items-center h-5 text-[10px] font-mono font-medium uppercase tracking-wider border px-2 rounded-full leading-none", getAreaColorClasses(color))}>{displaySubCategory}</span>}
          {task.type === 'Hábito' && (
            <span className="flex items-center h-5 text-[10px] text-text-dim font-mono font-normal leading-none" title="Cumplimiento en los últimos 30 días">
              🌱 {(() => {
                const percent = getHabitCompletionPercentage();
                return percent !== null ? `${percent}%` : '0%';
              })()} de Cumplimiento {task.frecuencia ? `(Meta: ${task.frecuencia}x/${task.frecuenciaUnidad})` : ''}
            </span>
          )}
          {task.hora && <span className="flex items-center h-5 text-[10px] text-text-dim font-mono font-normal leading-none">{task.hora}</span>}
          {(task.type === 'Proyecto' || task.type === 'Rutina' || hasSubtasks) ? (
            (plannedHours > 0 || trackedHours > 0) && (
              <span className="flex items-center h-5 text-[10px] text-text-dim font-mono font-normal leading-none" title="Acumulado real vs planeado">
                {trackedHours.toFixed(2)}h real / {plannedHours.toFixed(1)}h plan
              </span>
            )
          ) : (
            (plannedHours > 0 || trackedHours > 0) && (
              <span className="flex items-center h-5 text-[10px] text-text-dim font-mono font-normal leading-none" title="Progreso real vs estimado">
                {trackedHours > 0 ? `${trackedHours.toFixed(2)}h real ` : ''}{plannedHours > 0 ? `(Est: ${plannedHours}h)` : ''}
              </span>
            )
          )}
          {task.dependencyId && <span className="flex items-center h-5 text-[10px] text-[#b45f06] leading-none">Espera a #{task.dependencyId.slice(-4)}</span>}
          {isFutureDate(task.fechaPlanificada) && !isHabit && <span className="flex items-center h-5 text-[10px] text-text-dim leading-none">📅 Futuro</span>}
          
          {!isSubtask && !isActualSubtask && parentTask && parentTask.type === 'Proyecto' && (
            <span className="flex items-center h-5 gap-1 text-[10px] text-text-dim font-mono leading-none" title={`Pertenece a: ${parentTask.text}`}>
              <Folder className="w-2.5 h-2.5 text-yellow-500 fill-transparent stroke-[2]" /> {parentTask.text}
            </span>
          )}
          
          {!isSubtask && isActualSubtask && parentTask && parentTask.type !== 'Proyecto' && (
             <span className="flex items-center h-5 gap-1 text-[10px] font-mono text-text-dim leading-none" title={`Subtarea de: ${parentTask.text}`}>
              ↳ {parentTask.text}
            </span>
          )}
          
          {/* Active tracker badge or start tracker button */}
          {activeTimer?.taskId === task.id ? (
            <span className="inline-flex items-center h-5 gap-1 text-[10px] font-mono font-medium uppercase tracking-wider text-[#b45f06] border border-[#e4e2dd] bg-[#fce5cd] px-2 rounded-full animate-pulse leading-none">
              🔴 Trackeando
            </span>
          ) : (
            !task.completed && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && (
              <button 
                onClick={(e) => { e.stopPropagation(); onStartTimer(task.id); }}
                className="inline-flex items-center h-5 gap-1 text-[10px] font-mono font-medium uppercase text-[#b45f06] hover:text-[#5d5d5d] transition-colors cursor-pointer leading-none"
                title="Iniciar temporizador en tiempo real"
              >
                <Play className="w-2.5 h-2.5" /> Iniciar tracker
              </button>
            )
          )}
        </div>
      </div>
      
      {/* Removed completion toggle div from here to move it to the left side */}

      <div className="opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition-all ml-2 mt-1 md:mt-0 self-start">
        {(hasSubtasks || (!isHabit && task.type !== 'Rutina' && !isActualSubtask && onAddTask)) && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-[#a2b29f] hover:text-[#2d2d2d] p-1" 
            title={isExpanded ? "Ocultar subtareas" : (task.type === 'Rutina' ? "Ver hábitos" : "Ver/Añadir subtareas")}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
        {task.parentId && onUpdate && (
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              const parentT = allTasks.find(t => t.id === task.parentId);
              const newParentId = (parentT && parentT.type !== 'Proyecto') ? (parentT.parentId || '') : '';
              onUpdate(task.id, { parentId: newParentId });
            }}
            className="text-[#a2b29f] hover:text-[#2d2d2d] p-1 transition-colors"
            title={
              parentTask && parentTask.type === 'Proyecto' 
                ? "Subir de Nivel: Convertir en Tarea Independiente (sacar del Proyecto)" 
                : "Subir de Nivel: Promover de subtarea a tarea de proyecto o principal"
            }
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
          </button>
        )}
        {onNavigateToLocation && (
          <button 
            onClick={(e) => { e.stopPropagation(); onNavigateToLocation(); }} 
            className="text-primary hover:text-text-main p-1 cursor-pointer bg-transparent border-0" 
            title="Ir a su ubicación en vista principal"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onDelete} className="text-primary hover:text-red-500 p-1" title="Borrar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      </div>

      {isExpanded && (
        <div className="w-full mt-3 pl-8 flex flex-col gap-2 relative before:content-[''] before:absolute before:left-3.5 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
          {subtasks.map(sub => (
            <TaskItem 
              key={sub.id} 
              task={sub} 
              config={config} 
              allTasks={allTasks} 
              history={history}
              onToggle={onToggle} 
              onDelete={() => onDeleteTask && onDeleteTask(sub.id)} 
              onUpdate={onUpdate}
              onAddTask={onAddTask}
              onDeleteTask={onDeleteTask}
              isSubtask 
              hideAreaCategory={sub.type !== 'Hábito'}
            />
          ))}
          {(!isHabit && task.type !== 'Rutina' && onAddTask) && (
            <div className="flex flex-col gap-1 mt-1 z-10 w-full pr-2">
              <form onSubmit={handleAddSubtask} className="flex items-center">
                <input 
                  type="text" 
                  placeholder="Nombre de la subtarea..."
                  className="flex-1 px-4 py-1.5 text-sm bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f] z-10"
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                />
                <button type="submit" disabled={!newTaskText.trim()} className="text-text-main disabled:opacity-40 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:opacity-75 transition-opacity ml-4 cursor-pointer hover:underline bg-transparent border-0 outline-none">
                  + Añadir
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
