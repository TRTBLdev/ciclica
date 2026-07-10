import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType, ChecklistItem } from '../types';
import { isFutureDate } from '../lib/utils';
import { CheckSquare, Square, RotateCw, X, Lock, Edit2, Save, ChevronDown, ChevronUp, Plus, Repeat, Circle, CheckCircle2, ArrowUpFromLine, Folder, Play, ArrowUpRight, Search, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { calculateBiologicalPhase } from '../domain/cycle';
import { cn } from '../lib/utils';
import CategoryBadge from './ui/CategoryBadge';
import PriorityBadge from './ui/PriorityBadge';
import AllocationBadge from './ui/AllocationBadge';


const GripIcon = () => (
  <svg className="w-3.5 h-3.5 text-text-dim/40 cursor-grab active:cursor-grabbing shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

function getTypeIcon(type: TaskType) {
  switch (type) {
    case 'Tarea':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
        </svg>
      );
    case 'Proyecto':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.25A2.25 2.25 0 0 0 4.5 17.5h15a2.25 2.25 0 0 0 2.25-2.25v-.25m-19.5-6.5V5.25A2.25 2.25 0 0 1 4.5 3h5.25l1.5 2.25h8.25a2.25 2.25 0 0 1 2.25 2.25v1.5" />
        </svg>
      );
    case 'Rutina':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001m-5.007 5.007v-5.007m-5.78-4.913a8.967 8.967 0 0 1 7.604 3.443m-7.604-3.443L6.75 4.5M1.5 12a8.986 8.986 0 0 0 4.568 7.828m0 0-.79-2.09M1.5 12h5m2.5 4.5a8.967 8.967 0 0 0 7.604-3.443m0 0 1.639 2.09" />
        </svg>
      );
    case 'Hábito':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none text-emerald-600 dark:text-emerald-500" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V6m0 0 3.5 3.5M12 6L8.5 9.5M12 11c3 0 5-2 5-5m-5 9c-3 0-5-2-5-5" />
        </svg>
      );
    case 'Pulso':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12h3.25L9 3l4.5 18L17.25 12h4.5" />
        </svg>
      );
  }
}



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
  onNavigate?: (view: string, taskId?: string) => void;
  showMoveArrows?: boolean;
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
  onNavigateToLocation,
  onNavigate,
  showMoveArrows = false
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
  const [editAllocationType, setEditAllocationType] = useState<'fixed' | 'growth' | 'mixed'>(task.allocationType || 'growth');
  const [isExpanded, setIsExpanded] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCheckboxHovered, setIsCheckboxHovered] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);

  const [editNotes, setEditNotes] = useState(task.notes || '');
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  const handleToggleChecklistItem = (itemId: string) => {
    if (!onUpdate) return;
    const newChecklist = (task.checklist || []).map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    onUpdate(task.id, { checklist: newChecklist });
  };

  // Helper to find visual sibling items (same parent, same type)
  const getSiblings = () => {
    const parentId = task.parentId || '';
    const siblingsList = allTasks.filter(t => (t.parentId || '') === parentId && t.type === task.type);

    const pending = siblingsList.filter(t => !(t.type === 'Hábito' ? isFutureDate(t.fechaPlanificada) : t.completed));
    const completed = siblingsList.filter(t => (t.type === 'Hábito' ? isFutureDate(t.fechaPlanificada) : t.completed));

    const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withOrders = baseline.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : (idx + 1) * 1000
    }));
    const sortedPending = withOrders.sort((a, b) => a.order - b.order);

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };

  const siblings = getSiblings();
  const idx = siblings.findIndex(s => s.id === task.id);
  const isFirstItem = idx <= 0;
  const isLastItem = idx === -1 || idx === siblings.length - 1;

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (!onUpdate) return;

    if (idx <= 0) return; // Already at the top

    const targetIdx = idx - 1;
    let newOrder = 1000;

    if (targetIdx === 0) {
      newOrder = siblings[0].order - 1000;
    } else {
      const prevOrder = siblings[targetIdx - 1].order;
      const nextOrder = siblings[targetIdx].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    onUpdate(task.id, { order: newOrder });
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (!onUpdate) return;

    if (idx === -1 || idx === siblings.length - 1) return; // Already at the bottom

    const targetIdx = idx + 1;
    let newOrder = 1000;

    if (targetIdx === siblings.length - 1) {
      newOrder = siblings[siblings.length - 1].order + 1000;
    } else {
      const prevOrder = siblings[targetIdx].order;
      const nextOrder = siblings[targetIdx + 1].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    onUpdate(task.id, { order: newOrder });
  };

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
      setEditAllocationType(task.allocationType || 'growth');
      setEditNotes(task.notes || '');
      setEditChecklist(task.checklist || []);
      setNewChecklistItemText('');
    }
  }, [isEditing, task]);

  const subtasks = allTasks.filter(t => t.parentId === task.id);
  const getSubtasksWithOrders = () => {
    const isCompletedVisual = (t: AppTask) => t.type === 'Hábito' ? isFutureDate(t.fechaPlanificada) : t.completed;

    const pending = subtasks.filter(t => !isCompletedVisual(t));
    const completed = subtasks.filter(t => isCompletedVisual(t));

    const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withOrders = baseline.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : (idx + 1) * 1000
    }));
    const sortedPending = withOrders.sort((a, b) => a.order - b.order);

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };

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
        allocationType: editAllocationType,
        notes: editNotes,
        checklist: editChecklist,
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



  const locked = isLocked();
  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const isActualSubtask = !!(parentTask && parentTask.type !== 'Proyecto');
  const displayCategory = task.category || (parentTask ? parentTask.category : '');
  const displaySubCategory = task.subCategory || (parentTask ? parentTask.subCategory : '');
  const areaConfig = config?.areas?.[displayCategory || ''];
  const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
  const isHabit = task.type === 'Hábito';
  const isHabitCompleted = isHabit && isFutureDate(task.fechaPlanificada);
  const isCompletedVisual = isHabit ? isHabitCompleted : task.completed;
  
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
    if (task.priority) return <PriorityBadge priority={task.priority} />;
    return null;
  };

  const daysPending = (() => {
    if (isCompletedVisual) return 0;
    const refDateStr = task.lastExecutedAt || task.fechaPlanificada;
    if (!refDateStr) return 0;
    const refDate = new Date(refDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    refDate.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - refDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  })();

  return (
    <div 
      id={`task-item-${task.id}`}
      className={cn(
        "relative group flex flex-col p-4 transition-all duration-200",
        isCompletedVisual && !isEditing ? "grayscale" : "",
        locked ? "opacity-60 grayscale" : "",
        isSubtask ? "ml-2 md:ml-4 mt-1 relative before:content-[''] before:absolute before:-left-3 md:-left-4 before:-top-4 before:bottom-1/2 before:w-[1px] before:border-l before:border-b before:border-border-line before:rounded-bl" : ""
      )}
    >
      
      <div className="flex items-start gap-3 md:gap-4 w-full">
        <button 
          onClick={() => { if (!locked) onToggle(task); }} 
          disabled={locked}
          onMouseEnter={() => { if (!locked) setIsCheckboxHovered(true); }}
          onMouseLeave={() => setIsCheckboxHovered(false)}
          className={cn(
            "mt-1 flex-shrink-0 focus:outline-none z-10 bg-transparent transition-all duration-200 flex items-center justify-center w-5 h-5 rounded-full hover:bg-base-dim/40",
            locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          {isCompletedVisual ? (
            (task.type === 'Rutina' || task.type === 'Hábito') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            ) : (
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            )
          ) : isCheckboxHovered ? (
            (task.type === 'Rutina' || task.type === 'Hábito') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600/60 dark:text-emerald-500/60" />
            ) : (
              <CheckSquare className="w-4 h-4 text-emerald-600/60 dark:text-emerald-500/60" />
            )
          ) : (
            <span className="text-text-main/70 group-hover:text-text-main transition-colors flex items-center justify-center shrink-0">
              {getTypeIcon(task.type)}
            </span>
          )}
        </button>
        
        <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2 mb-1.5 mt-0.5">
            <input 
              autoFocus
              type="text" 
              className="w-full px-2.5 md:px-4 py-1 md:py-1.5 text-sm bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
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
                    if (newType === 'Proyecto' || newType === 'Rutina') {
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
                    {/* Asignación Energética — SIEMPRE visible, incluso para subtareas */}
                    <div className="relative flex items-center bg-transparent rounded-md" title="Asignación Energética">
                      <select 
                        className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none cursor-pointer" 
                        value={editAllocationType} 
                        onChange={e => setEditAllocationType(e.target.value as any)}
                      >
                        <option value="growth">⚡ Inversión</option>
                        <option value="fixed">🛡️ Soporte Vital</option>
                        <option value="mixed">☯️ Mixto</option>
                      </select>
                      <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                    </div>
                  </>
                );
              })()}
            </div>
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

            {/* UI de notes */}
            <div className="flex flex-col gap-1 text-left w-full mt-3">
              <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Notas:</span>
              <textarea
                placeholder="Notas y contexto..."
                className="w-full min-h-[80px] p-3 text-xs bg-base text-text-main border border-border-line rounded-xl focus:outline-none focus:border-[#a2b29f] resize-y font-sans font-light"
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
              />
            </div>

            {/* UI de checklist */}
            <div className="flex flex-col gap-2 text-left w-full mt-3">
              <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Checklist (Guía Operativa):</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {editChecklist.length === 0 ? (
                  <span className="text-[10px] text-primary italic pl-2">Sin ítems</span>
                ) : (
                  editChecklist.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-base-dim/20 px-3 py-1.5 rounded-lg border border-border-line/40">
                      <span className={cn("text-xs text-text-main", item.done && "line-through opacity-60")}>{item.text}</span>
                      <button
                        type="button"
                        onClick={() => setEditChecklist(editChecklist.filter(i => i.id !== item.id))}
                        className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Añadir ítem al checklist..."
                  className="flex-1 px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                  value={newChecklistItemText}
                  onChange={e => setNewChecklistItemText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newChecklistItemText.trim()) {
                        const newItem: ChecklistItem = {
                          id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                          text: newChecklistItemText.trim(),
                          done: false
                        };
                        setEditChecklist([...editChecklist, newItem]);
                        setNewChecklistItemText('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newChecklistItemText.trim()) {
                      const newItem: ChecklistItem = {
                        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        text: newChecklistItemText.trim(),
                        done: false
                      };
                      setEditChecklist([...editChecklist, newItem]);
                      setNewChecklistItemText('');
                    }
                  }}
                  className="px-3 py-1.5 bg-primary text-base-dim rounded-full text-xs font-mono uppercase tracking-wider font-bold hover:opacity-90 cursor-pointer border-0 outline-none flex items-center justify-center"
                >
                  +
                </button>
              </div>
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
          <>
            <div className="flex items-center gap-3 flex-wrap mb-2 text-left w-full">
              <p 
                onClick={() => {
                  if (!locked && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) {
                    onStartTimer(task.id);
                  }
                }}
                className={cn(
                  "text-base flex-1 min-w-0 break-words flex items-center gap-2", 
                  isCompletedVisual ? "text-text-dim opacity-55 line-through decoration-[var(--color-text-dim)]/50" : "text-text-main font-normal",
                  (!locked && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) ? "cursor-pointer hover:text-primary transition-colors" : ""
                )}
                title={(!locked && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) ? "Hacer clic para iniciar tracker ⏱️" : undefined}
              >
                {daysPending >= 4 && (
                  <span 
                    className={cn(
                      "inline-block w-2 h-2 rounded-full shrink-0 animate-pulse",
                      daysPending >= 8 ? "bg-red-400" : "bg-amber-400"
                    )}
                    title={`Pendiente hace ${daysPending} días`}
                  />
                )}
                <span>{task.text}</span>
              </p>
              {locked && <span className="flex items-center gap-1 text-xs font-mono font-medium uppercase tracking-widest text-[#b45f06] border border-[#e4e2dd] px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Bloqueada</span>}
            </div>
            
            <div className="flex flex-wrap items-center justify-between w-full mt-2 gap-y-1.5 gap-x-2 md:pr-4">
              {(task.type === 'Tarea' || task.type === 'Proyecto') && <div>{prioBadge()}</div>}
              {!hideAreaCategory && (!isActualSubtask || task.type === 'Hábito') && (displayCategory || displaySubCategory) && (
                <CategoryBadge 
                  area={displayCategory || undefined}
                  subCategory={displaySubCategory || undefined}
                  config={config}
                  onClick={onNavigate ? (e) => {
                    e.stopPropagation();
                    if (displayCategory) {
                      onNavigate('areas', displayCategory);
                    }
                  } : undefined}
                />
              )}
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
              {isFutureDate(task.fechaPlanificada) && !isHabit && !isActualSubtask && <span className="flex items-center h-5 text-[10px] text-text-dim leading-none">📅 Futuro</span>}
              {task.allocationType && (
                <AllocationBadge allocation={task.allocationType} />
              )}
              
              {!isSubtask && !isActualSubtask && parentTask && parentTask.type === 'Proyecto' && (
                <span 
                  onClick={(e) => {
                    if (onNavigate) {
                      e.stopPropagation();
                      onNavigate('proyectos', parentTask.id);
                    }
                  }}
                  className={cn(
                    "flex items-center h-5 gap-1 text-[10px] text-text-dim font-mono leading-none",
                    onNavigate && "cursor-pointer hover:text-text-main transition-colors"
                  )} 
                  title={onNavigate ? `Pertenece a: ${parentTask.text}. Haz clic para ver en Proyectos.` : `Pertenece a: ${parentTask.text}`}
                >
                  <Folder className="w-2.5 h-2.5 text-yellow-500 fill-transparent stroke-[2]" /> {parentTask.text}
                </span>
              )}
              
              {!isSubtask && isActualSubtask && parentTask && parentTask.type !== 'Proyecto' && (
                 <span 
                   onClick={(e) => {
                     if (onNavigate) {
                       e.stopPropagation();
                       onNavigate(parentTask.type === 'Rutina' ? 'rutinas' : 'proyectos', parentTask.id);
                     }
                   }}
                   className={cn(
                     "flex items-center h-5 gap-1 text-[10px] font-mono text-text-dim leading-none",
                     onNavigate && "cursor-pointer hover:text-text-main transition-colors"
                   )} 
                   title={onNavigate ? `Subtarea de: ${parentTask.text}. Haz clic para ver.` : `Subtarea de: ${parentTask.text}`}
                 >
                  ↳ {parentTask.type === 'Rutina' ? '🔁' : '📁'} {parentTask.text}
                </span>
              )}
              
              {/* Active tracker badge or start tracker button */}
              {activeTimer?.taskId === task.id ? (
                <span className="inline-flex items-center h-5 gap-1 text-[10px] font-mono font-medium uppercase tracking-wider text-[#b45f06] border border-[#e4e2dd] bg-[#fce5cd] px-2 rounded-full animate-pulse leading-none">
                  🔴 Trackeando
                </span>
              ) : (
                !task.completed && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && !locked && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onStartTimer(task.id); }}
                    className="p-1 hover:bg-base-dim/40 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none flex items-center justify-center"
                    title="Iniciar tracker ⏱️"
                  >
                    <svg className="w-3.5 h-3.5 text-[#b45f06] hover:text-[#5d5d5d] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 2h6" />
                      <path d="M12 2v3" />
                      <circle cx="12" cy="14" r="8" />
                      <polygon points="11 11, 11 17, 15 14" fill="currentColor" />
                    </svg>
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

        <div className="flex flex-col items-center gap-1.5 shrink-0 w-6 pt-1">
          {/* Chevron */}
          {(!!task.notes || (task.checklist && task.checklist.length > 0) || hasSubtasks) && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="text-[#a2b29f] hover:text-[#2d2d2d] p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors" 
              title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 3 dots options */}
          <div className="relative flex items-center justify-center">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                const rect = e.currentTarget.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setOpenUpwards(spaceBelow < 250);
                setIsMenuOpen(!isMenuOpen); 
              }}
              className="text-[#a2b29f] hover:text-text-main p-0.5 cursor-pointer bg-transparent border-0 rounded-full hover:bg-base-dim/50 flex items-center justify-center transition-colors"
              title="Opciones"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsMenuOpen(false)} />
                <div className={cn(
                  "absolute right-0 z-50 w-40 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left",
                  openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                )}>
                  {onUpdate && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); setIsMenuOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                      >
                        <svg className="w-3 h-3 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        Editar
                      </button>
                      <button 
                        onClick={handleMoveUp}
                        disabled={isFirstItem}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                        Mover arriba
                      </button>
                      <button 
                        onClick={handleMoveDown}
                        disabled={isLastItem}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        Mover abajo
                      </button>
                    </>
                  )}
                  {task.parentId && onUpdate && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        const parentT = allTasks.find(t => t.id === task.parentId);
                        const newParentId = (parentT && parentT.type !== 'Proyecto') ? (parentT.parentId || '') : '';
                        onUpdate(task.id, { parentId: newParentId });
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                    >
                      <ArrowUpFromLine className="w-3 h-3 text-text-dim" />
                      Subir de nivel
                    </button>
                  )}
                  {onNavigateToLocation && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onNavigateToLocation(); setIsMenuOpen(false); }} 
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                    >
                      <ArrowUpRight className="w-3 h-3 text-text-dim" />
                      Ir a ubicación
                    </button>
                  )}
                  <div className="h-[1px] bg-border-line/40 my-1"></div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      if (window.confirm(`¿Estás segura de que deseas eliminar permanentemente "${task.text}"?`)) {
                        onDelete();
                      }
                    }} 
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50/15 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                  >
                    <X className="w-3 h-3 text-red-500" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reordering Arrows */}
          {showMoveArrows && (
            <div className="flex flex-col gap-0.5 items-center">
              <button 
                onClick={handleMoveUp}
                disabled={isFirstItem}
                className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                title="Mover arriba"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleMoveDown}
                disabled={isLastItem}
                className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                title="Mover abajo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="w-full mt-3 pl-4 md:pl-6 flex flex-col gap-3 relative before:content-[''] before:absolute before:left-2 md:before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100 pr-2">
          
          {/* Notes display */}
          {task.notes && (
            <div className="text-left bg-base-dim/40 p-4 rounded-2xl border border-border-line/40 text-xs text-text-main whitespace-pre-wrap font-sans font-light leading-relaxed mb-1">
              <div className="text-[9px] text-text-dim font-mono uppercase tracking-widest mb-1.5 font-bold">Notas</div>
              {task.notes}
            </div>
          )}

           {/* Checklist display */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="text-left bg-base-dim/40 p-4 rounded-2xl border border-border-line/40 text-xs text-text-main flex flex-col gap-2.5 mb-1">
              <div className="text-[9px] text-text-dim font-mono uppercase tracking-widest font-bold">Guía de Pasos (Checklist)</div>
              <div className="flex flex-col gap-2">
                {task.checklist.map(item => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="rounded border-border-line text-primary focus:ring-primary w-4 h-4 cursor-pointer bg-base"
                    />
                    <span className={cn("text-xs text-text-main font-light", item.done && "line-through opacity-50")}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks rendering */}
          {hasSubtasks && (
            <div className="flex flex-col gap-1.5 w-full mt-1.5 pl-2 border-l-2 border-border-line/20">
              <div className="text-[9px] text-text-dim font-mono uppercase tracking-widest mb-1 font-bold">Subtareas</div>
              {getSubtasksWithOrders().map(sub => (
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
                  hideAreaCategory={true}
                  activeTimer={activeTimer}
                  onStartTimer={onStartTimer}
                  showMoveArrows={showMoveArrows}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
