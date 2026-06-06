import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType } from '../types';
import { isFutureDate } from '../lib/utils';
import { CheckSquare, Square, RotateCw, X, Lock, Edit2, Save, ChevronDown, ChevronUp, Plus, Repeat, Circle, CheckCircle2, ArrowUpFromLine, Folder, Play, ArrowUpRight, Search, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, getAreaColorClasses, calculateBiologicalPhase } from '../lib/utils';


// Helper to detect cycles in parent selection
const isDescendant = (childId: string, parentId: string, tasksList: AppTask[]): boolean => {
  let current = tasksList.find(t => t.id === childId);
  while (current && current.parentId) {
    if (current.parentId === parentId) return true;
    current = tasksList.find(t => t.id === current.parentId);
  }
  return false;
};

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
    case 'Meta':
      return (
        <svg className="w-3.5 h-3.5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
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

interface ParentSelectorProps {
  editType: TaskType;
  parentId: string;
  allTasks: AppTask[];
  taskId: string;
  onChange: (id: string) => void;
}

function ParentSelectorDropdown({ editType, parentId, allTasks, taskId, onChange }: ParentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const currentSelectionText = React.useMemo(() => {
    if (!parentId) return 'Top-Level (Sin Padre)';
    const parent = allTasks.find(t => t.id === parentId);
    if (!parent) return 'Top-Level (Sin Padre)';
    return parent.type === 'Proyecto' ? `📁 ${parent.text}` : `📝 ${parent.text}`;
  }, [parentId, allTasks]);

  const activeRoutines = allTasks.filter(t => t.type === 'Rutina' && !t.completed);
  const activeProjects = allTasks.filter(t => t.type === 'Proyecto' && !t.completed);

  // Top level active tasks
  const topLevelTasks = allTasks.filter(t => 
    t.type === 'Tarea' && 
    !t.parentId && 
    t.id !== taskId && 
    !t.completed
  );

  const searchLower = search.toLowerCase().trim();

  // Recursive match check for tree filtering
  const hasMatchingDescendant = (nodeId: string): boolean => {
    const children = allTasks.filter(t => t.parentId === nodeId && t.id !== taskId && !t.completed);
    return children.some(c => c.text.toLowerCase().includes(searchLower) || hasMatchingDescendant(c.id));
  };

  const shouldShowNode = (node: AppTask): boolean => {
    if (!searchLower) return true;
    const matchesSelf = node.text.toLowerCase().includes(searchLower);
    return matchesSelf || hasMatchingDescendant(node.id);
  };

  // Auto-expand nodes that match or contain matching descendants during search
  React.useEffect(() => {
    if (searchLower) {
      const newExpanded: Record<string, boolean> = {};
      allTasks.forEach(t => {
        if (hasMatchingDescendant(t.id)) {
          newExpanded[t.id] = true;
        }
      });
      setExpandedNodes(newExpanded);
    }
  }, [search, allTasks]);

  const renderNode = (item: AppTask, depth: number) => {
    if (!shouldShowNode(item)) return null;

    const children = allTasks.filter(t => t.parentId === item.id && t.id !== taskId && !isDescendant(t.id, taskId, allTasks) && !t.completed);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[item.id];

    return (
      <div key={item.id} className="flex flex-col">
        <div 
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={cn(
            "flex items-center justify-between py-1.5 pr-2 rounded-lg hover:bg-base-dim/40 cursor-pointer text-xs text-text-main group",
            parentId === item.id && "bg-[#a2b29f]/20 font-bold"
          )}
          onClick={() => {
            onChange(item.id);
            setIsOpen(false);
          }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px]">{item.type === 'Proyecto' ? '📁' : '📝'}</span>
            <span className="truncate">{item.text}</span>
          </div>
          {hasChildren && (
            <button 
              type="button"
              onClick={(e) => toggleNode(item.id, e)}
              className="p-1 hover:bg-base-dim/50 rounded text-text-dim hover:text-text-main transition-colors bg-transparent border-0 cursor-pointer flex items-center justify-center"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        {hasChildren && (isExpanded || !!searchLower) && (
          <div className="flex flex-col">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full sm:w-[180px] select-none text-left z-35">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-base border border-border-line rounded-full cursor-pointer text-xs font-bold text-text-main hover:border-[#a2b29f] transition-all max-w-[180px]"
      >
        <span className="truncate mr-2">{currentSelectionText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-dim flex-shrink-0" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
          
          <div className="absolute top-full left-0 mt-2 z-50 bg-base border border-border-line shadow-lg max-h-60 w-[240px] overflow-y-auto flex flex-col p-2 rounded-2xl glass-matte">
            <div className="relative flex items-center mb-2 px-1">
              <Search className="absolute left-3 w-3.5 h-3.5 text-text-dim pointer-events-none" />
              <input 
                type="text"
                placeholder="Buscar parent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-base-dim/20 border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f] text-text-main font-sans"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto pr-1">
              <div 
                className={cn(
                  "px-2 py-1.5 rounded-lg hover:bg-base-dim/40 cursor-pointer text-xs font-bold text-text-main",
                  !parentId && "bg-[#a2b29f]/20"
                )}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                ⚪ Top-Level (General)
              </div>

              {editType === 'Hábito' ? (
                <div className="flex flex-col gap-0.5 mt-1 border-t border-border-line/10 pt-1">
                  <div className="text-[9px] font-mono uppercase text-text-dim px-2 mb-1">Rutinas</div>
                  {activeRoutines.map(r => (
                    <div 
                      key={r.id}
                      className={cn(
                        "px-2 py-1.5 rounded-lg hover:bg-base-dim/40 cursor-pointer text-xs text-text-main truncate",
                        parentId === r.id && "bg-[#a2b29f]/20 font-bold"
                      )}
                      onClick={() => {
                        onChange(r.id);
                        setIsOpen(false);
                      }}
                    >
                      🔁 {r.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-1 border-t border-border-line/10 pt-1">
                  {activeProjects.length > 0 && (
                    <div className="flex flex-col">
                      <div className="text-[9px] font-mono uppercase text-text-dim px-2 mb-1">Proyectos</div>
                      {activeProjects.map(proj => renderNode(proj, 0))}
                    </div>
                  )}

                  {topLevelTasks.length > 0 && (
                    <div className="flex flex-col border-t border-border-line/10 mt-1.5 pt-1.5">
                      <div className="text-[9px] font-mono uppercase text-text-dim px-2 mb-1">Otras Tareas</div>
                      {topLevelTasks.map(task => renderNode(task, 0))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCheckboxHovered, setIsCheckboxHovered] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);

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
        isCompletedVisual && !isEditing ? "grayscale" : "",
        locked ? "opacity-60 pointer-events-none grayscale" : "",
        isSubtask ? "ml-2 md:ml-4 mt-1 relative before:content-[''] before:absolute before:-left-3 md:-left-4 before:-top-4 before:bottom-1/2 before:w-[1px] before:border-l before:border-b before:border-border-line before:rounded-bl" : ""
      )}
    >
      
      <div className="flex items-start gap-3 md:gap-4 w-full">
        <button 
          onClick={() => onToggle(task)} 
          onMouseEnter={() => setIsCheckboxHovered(true)}
          onMouseLeave={() => setIsCheckboxHovered(false)}
          className="mt-1 flex-shrink-0 focus:outline-none z-10 bg-transparent transition-all duration-200 flex items-center justify-center w-5 h-5 rounded-full hover:bg-base-dim/40 cursor-pointer"
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
                          <div className="flex items-center gap-1.5 bg-transparent rounded-md pl-1 relative" title="Relación Padre (Convertir en Subtarea)">
                            <span className="text-xs text-text-dim font-mono uppercase">Padre:</span>
                            <ParentSelectorDropdown 
                              editType={editType}
                              parentId={editParentId}
                              allTasks={allTasks}
                              taskId={task.id}
                              onChange={setEditParentId}
                            />
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
                  if (!isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) {
                    onStartTimer(task.id);
                  }
                }}
                className={cn(
                  "text-base flex-1 min-w-0 break-words", 
                  isCompletedVisual ? "text-text-dim opacity-55 line-through decoration-[var(--color-text-dim)]/50" : "text-text-main font-normal",
                  (!isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) && "cursor-pointer hover:text-primary transition-colors"
                )}
                title={(!isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) ? "Hacer clic para iniciar tracker ⏱️" : undefined}
              >
                {task.text}
              </p>
              {locked && <span className="flex items-center gap-1 text-xs font-mono font-medium uppercase tracking-widest text-[#b45f06] border border-[#e4e2dd] px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Bloqueada</span>}
            </div>
            
            <div className="flex flex-wrap items-center justify-between w-full mt-2 gap-y-1.5 gap-x-2 md:pr-4">
              {(task.type === 'Tarea' || task.type === 'Proyecto') && <div>{prioBadge()}</div>}
              {!hideAreaCategory && (!isActualSubtask || task.type === 'Hábito') && displayCategory && (
                <span 
                  onClick={(e) => {
                    if (onNavigate) {
                      e.stopPropagation();
                      onNavigate('areas', displayCategory);
                    }
                  }}
                  className={cn(
                    "flex items-center h-5 text-[10px] font-mono font-medium uppercase tracking-wider border px-2 rounded-full leading-none",
                    onNavigate && "cursor-pointer hover:opacity-80 transition-opacity",
                    getAreaColorClasses(color)
                  )}
                  title={onNavigate ? `Área: ${displayCategory}. Haz clic para ver en Estrategia.` : undefined}
                >
                  {displayCategory}
                </span>
              )}
              {!hideAreaCategory && (!isActualSubtask || task.type === 'Hábito') && displaySubCategory && (
                <span 
                  onClick={(e) => {
                    if (onNavigate) {
                      e.stopPropagation();
                      onNavigate('areas', displayCategory);
                    }
                  }}
                  className={cn(
                    "flex items-center h-5 text-[10px] font-mono font-medium uppercase tracking-wider border px-2 rounded-full leading-none",
                    onNavigate && "cursor-pointer hover:opacity-80 transition-opacity",
                    getAreaColorClasses(color)
                  )}
                  title={onNavigate ? `Área: ${displayCategory}. Haz clic para ver en Estrategia.` : undefined}
                >
                  {displaySubCategory}
                </span>
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
              {isFutureDate(task.fechaPlanificada) && !isHabit && <span className="flex items-center h-5 text-[10px] text-text-dim leading-none">📅 Futuro</span>}
              
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
                !task.completed && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onStartTimer(task.id); }}
                    className="p-1 hover:bg-base-dim/40 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none flex items-center justify-center"
                    title="Iniciar tracker ⏱️"
                  >
                    <svg className="w-3.5 h-3.5 text-[#b45f06] hover:text-[#5d5d5d] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
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
          {(hasSubtasks || (!isHabit && task.type !== 'Rutina' && !isActualSubtask && onAddTask)) && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="text-[#a2b29f] hover:text-[#2d2d2d] p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors" 
              title={isExpanded ? "Ocultar subtareas" : (task.type === 'Rutina' ? "Ver hábitos" : "Ver/Añadir subtareas")}
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
        <div className="w-full mt-3 pl-4 md:pl-6 flex flex-col gap-2 relative before:content-[''] before:absolute before:left-2 md:before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
          {(!isHabit && task.type !== 'Rutina' && onAddTask) && (
            <div className="flex flex-col gap-1 mt-1 mb-2 z-10 w-full pr-2">
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
              hideAreaCategory={sub.type !== 'Hábito'}
              showMoveArrows={showMoveArrows}
              activeTimer={activeTimer}
              onStartTimer={onStartTimer}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
