import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType, ChecklistItem } from '../types';
import { CheckSquare, Square, RotateCw, X, Lock, Edit2, Save, ChevronDown, ChevronUp, Plus, Repeat, CheckCircle2, ArrowUpFromLine, Folder, Play, ArrowUpRight, Search, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { calculateBiologicalPhase } from '../domain/cycle';
import { cn } from '../lib/utils';
import CategoryBadge from './ui/CategoryBadge';
import AllocationBadge from './ui/AllocationBadge';
import UniversalItemForm from './UniversalItemForm';
import { formatRelativeCalendarDate, getAppearanceMode, getChildHabitCycleCount, getChildHabitQuotaStatus, getItemTemporalIndicators, getNextAppearanceDate, getQuotaRange, getRoutineCycleProgressFromHistory, getRoutineCycleRangeForTask, getStandaloneQuotaCount, getTaskDateSummary, limitCardMetadata, isVerifiedHabitCompletion, wasChildHabitCompletedInAppearance } from '../domain/appearance';
import { isRoutineReadyToClose } from '../domain/occurrenceResults';
import { formatDateOnly } from '../domain/recurrenceProgress';
import CompactDate from './ui/CompactDate';
import TemporalIndicator, { temporalToneClassName } from './ui/TemporalIndicator';
import LinkedText from './ui/LinkedText';
import { getProjectForTask, getProjectTaskIds } from '../domain/workTracking';
import ProjectCard from './ProjectCard';
import { getInheritedProjectContext, getProjectPresentation } from '../domain/projectPresentation';
import ItemDetails from './ItemDetails';


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

export function getTypeIcon(type: TaskType, className?: string) {
  const getClassName = (defaultClass: string) => {
    if (!className) return defaultClass;
    if (type === 'Hábito' && !className.includes('text-')) {
      return `${className} text-emerald-600 dark:text-emerald-500`;
    }
    return className;
  };

  switch (type) {
    case 'Tarea':
      return (
        <svg className={getClassName("w-3.5 h-3.5 stroke-[2] fill-none")} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
        </svg>
      );
    case 'Proyecto':
      return (
        <svg className={getClassName("w-3.5 h-3.5 stroke-[2] fill-none")} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0A2.25 2.25 0 0 0 4.5 15h15a2.25 2.25 0 0 0 2.25-2.25m-19.5 0v.25A2.25 2.25 0 0 0 4.5 17.5h15a2.25 2.25 0 0 0 2.25-2.25v-.25m-19.5-6.5V5.25A2.25 2.25 0 0 1 4.5 3h5.25l1.5 2.25h8.25a2.25 2.25 0 0 1 2.25 2.25v1.5" />
        </svg>
      );
    case 'Rutina':
      return (
        <svg className={getClassName("w-3.5 h-3.5 stroke-[2] fill-none")} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001m-5.007 5.007v-5.007m-5.78-4.913a8.967 8.967 0 0 1 7.604 3.443m-7.604-3.443L6.75 4.5M1.5 12a8.986 8.986 0 0 0 4.568 7.828m0 0-.79-2.09M1.5 12h5m2.5 4.5a8.967 8.967 0 0 0 7.604-3.443m0 0 1.639 2.09" />
        </svg>
      );
    case 'Hábito':
      return (
        <svg className={getClassName("w-3.5 h-3.5 stroke-[2] fill-none text-emerald-600 dark:text-emerald-500")} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V6m0 0 3.5 3.5M12 6L8.5 9.5M12 11c3 0 5-2 5-5m-5 9c-3 0-5-2-5-5" />
        </svg>
      );
    case 'Pulso':
      return (
        <svg className={getClassName("w-3.5 h-3.5 stroke-[2] fill-none")} viewBox="0 0 24 24" stroke="currentColor">
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
  onEditProject?: (projectId: string) => void;
  onEditingChange?: (editing: boolean) => void;
  showMoveArrows?: boolean;
  context?: 'today' | 'backlog' | 'routine' | 'project' | 'default';
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
  onEditProject,
  onEditingChange,
  showMoveArrows = false,
  context = 'default'
}: Props) {  const [isEditing, setIsEditing] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const onEditingChangeRef = React.useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;
  const [editText, setEditText] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editFrecuencia, setEditFrecuencia] = useState(1);
  const [editFrecuenciaUnidad, setEditFrecuenciaUnidad] = useState('días');
  const [editView, setEditView] = useState('Backlog');
  const parentTaskHere = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const isRutinaParent = parentTaskHere && parentTaskHere.type === 'Rutina';
  const [editArea, setEditArea] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editFechaPlanificada, setEditFechaPlanificada] = useState('');
  const [editDuracion, setEditDuracion] = useState<number>(0);
  const [editType, setEditType] = useState<TaskType>(task.type);
  const [editDependencyId, setEditDependencyId] = useState('');
  const [depSearch, setDepSearch] = useState('');
  const [editAllocationType, setEditAllocationType] = useState<'fixed' | 'growth' | 'mixed'>('growth');
  const [editPriority, setEditPriority] = useState(task.priority || 'Baja');
  const [editNotes, setEditNotes] = useState('');
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const handleSave = () => {};
  const [isExpanded, setIsExpanded] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCheckboxHovered, setIsCheckboxHovered] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);

  const handleToggleChecklistItem = (itemId: string) => {
    if (!onUpdate) return;
    const newChecklist = (task.checklist || []).map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    const parentRoutine = task.parentId ? allTasks.find(candidate => candidate.id === task.parentId && candidate.type === 'Rutina') : undefined;
    onUpdate(task.id, {
      checklist: newChecklist,
      checklistCycleStart: parentRoutine ? getRoutineCycleRangeForTask(parentRoutine).start : task.checklistCycleStart,
    });
  };

  // Helper to find visual sibling items (same parent, same type)
  const getSiblings = () => {
    const parentId = task.parentId || '';
    const siblingsList = allTasks.filter(t => (t.parentId || '') === parentId && t.type === task.type);

    const pending = siblingsList.filter(t => !t.completed);
    const completed = siblingsList.filter(t => t.completed);

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

  const isActiveProjectContext = (context === 'today' || context === 'backlog') && task.type === 'Proyecto';
  const subtasks = allTasks.filter(t => t.parentId === task.id && (!isActiveProjectContext || !t.completed));
  const getSubtasksWithOrders = () => {
    const isCompletedVisual = (t: AppTask) => t.completed;

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
  const projectTaskIds = task.type === 'Proyecto' ? new Set(getProjectTaskIds(task.id, allTasks)) : undefined;
  const inheritedProject = getInheritedProjectContext(task, allTasks);
  const isProjectChild = !!inheritedProject;
  const activeTimerBelongsToProject = !!(
    task.type === 'Proyecto'
    && activeTimer?.taskId
    && projectTaskIds?.has(activeTimer.taskId)
  );
  const lastAutoExpandedTimerRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const activeTimerTaskId = activeTimer?.taskId || null;
    if (activeTimerBelongsToProject && activeTimerTaskId !== lastAutoExpandedTimerRef.current) {
      setIsExpanded(true);
    }
    lastAutoExpandedTimerRef.current = activeTimerTaskId;
  }, [activeTimer?.taskId, activeTimerBelongsToProject]);

  React.useEffect(() => {
    onEditingChangeRef.current?.(isEditing);
  }, [isEditing]);

  React.useEffect(() => () => onEditingChangeRef.current?.(false), []);

  const isLocked = () => {
    if (!task.dependencyId) return false;
    const blockingTask = allTasks.find(t => t.id === task.dependencyId);
    return blockingTask ? !blockingTask.completed : false;
  };

  // handleSave logic removed



  const locked = isLocked();
  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const isActualSubtask = !!(parentTask && parentTask.type !== 'Proyecto');
  const displayCategory = inheritedProject?.category || task.category || (parentTask ? parentTask.category : '');
  const displaySubCategory = inheritedProject?.subCategory || task.subCategory || (parentTask ? parentTask.subCategory : '');
  const areaConfig = config?.areas?.[displayCategory || ''];
  const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
  const isHabit = task.type === 'Hábito';
  const parentRoutine = parentTask?.type === 'Rutina' ? parentTask : undefined;
  const todayKey = formatDateOnly(new Date());
  const childCycleCount = parentRoutine ? getChildHabitCycleCount(parentRoutine, task, history || []) : 0;
  const childCycleTarget = Math.max(1, task.objetivoPorCiclo || 1);
  const childCompletedThisAppearance = parentRoutine ? wasChildHabitCompletedInAppearance(parentRoutine, task, history || [], todayKey) : false;
  const childTargetReached = !!parentRoutine && childCycleCount >= childCycleTarget;
  const occurrenceIsAvailable = !parentRoutine || !childCompletedThisAppearance;
  const routineProgress = task.type === 'Rutina' ? getRoutineCycleProgressFromHistory(task, allTasks, history || []) : 0;
  const canToggleRoutine = task.type === 'Rutina'
    && isRoutineReadyToClose(task, allTasks, history || [], []);
  const isCompletedVisual = parentRoutine ? childCompletedThisAppearance : task.completed;
  const isActionComplete = isCompletedVisual || childTargetReached;
  const lastCompletionDate = (history || [])
    .filter(record => task.type === 'Hábito' ? isVerifiedHabitCompletion(task, record) : record.taskId === task.id && record.isCompletion === true)
    .map(record => record.date.slice(0, 10))
    .sort()
    .at(-1) || task.lastExecutedAt?.slice(0, 10);
  const nextSearchDate = lastCompletionDate === todayKey
    ? formatDateOnly(new Date(new Date().setDate(new Date().getDate() + 1)))
    : todayKey;
  const quotaReached = getAppearanceMode(task) === 'quota' && getStandaloneQuotaCount(task, history || []) >= Math.max(1, task.quotaTarget || 1);
  const quotaRange = quotaReached ? getQuotaRange(task) : undefined;
  const dayAfterQuota = quotaRange ? (() => {
    const value = new Date(`${quotaRange.end}T12:00:00`);
    value.setDate(value.getDate() + 1);
    return formatDateOnly(value);
  })() : undefined;
  const nextAppearanceDate = !parentRoutine && !task.completed
    ? (dayAfterQuota || getNextAppearanceDate(task, nextSearchDate))
    : undefined;
  const checklistTotal = task.checklist?.length || 0;
  const completedChecklistItems = task.checklist?.filter(item => item.done).length || 0;
  const checklistProgress = checklistTotal > 0
    ? Math.round((completedChecklistItems / checklistTotal) * 100)
    : 0;
  const taskDateSummary = getTaskDateSummary(task, history || []);
  const trackedHoursToday = (history || [])
    .filter(record => record.taskId === task.id && formatDateOnly(new Date(record.date)) === todayKey)
    .reduce((sum, record) => sum + (record.duration || 0), 0);
  
  const getTrackedDuration = () => {
    if (!history) return 0;
    
    if (task.type === 'Proyecto') {
      return history.filter(h => projectTaskIds?.has(h.taskId)).reduce((acc, h) => acc + (h.duration || 0), 0);
    }
    
    if (task.type === 'Rutina' || hasSubtasks) {
      const childrenIds = allTasks.filter(t => t.parentId === task.id).map(t => t.id);
      let totalAvg = 0;
      for (const cid of childrenIds) {
        const cRecs = history.filter(h => h.taskId === cid && h.duration);
        if (cRecs.length > 0) {
          const uniqueDays = new Set(cRecs.map(h => h.date.substring(0, 10))).size;
          const cTotal = cRecs.reduce((acc, h) => acc + (h.duration || 0), 0);
          totalAvg += (cTotal / uniqueDays);
        }
      }
      const selfRecs = history.filter(h => h.taskId === task.id && h.duration);
      if (selfRecs.length > 0) {
         const uniqueDays = new Set(selfRecs.map(h => h.date.substring(0, 10))).size;
         const sTotal = selfRecs.reduce((acc, h) => acc + (h.duration || 0), 0);
         totalAvg += (sTotal / uniqueDays);
      }
      return totalAvg;
    }
    
    // Tarea, Hábito, Pulso
    const records = history.filter(h => h.taskId === task.id && h.duration);
    const total = records.reduce((acc, h) => acc + (h.duration || 0), 0);
    
    if (task.type === 'Hábito') {
      const uniqueDays = new Set(records.map(h => h.date.substring(0, 10))).size;
      return uniqueDays > 0 ? total / uniqueDays : 0;
    }
    
    return total;
  };

  const trackedHours = getTrackedDuration();

  const plannedHours = task.type === 'Proyecto'
    ? allTasks
      .filter(candidate => projectTaskIds?.has(candidate.id) && candidate.id !== task.id && !candidate.completed)
      .reduce((sum, candidate) => sum + (candidate.duracion || 0), 0)
    : (task.type === 'Rutina' || hasSubtasks)
      ? allTasks.filter(t => t.parentId === task.id).reduce((acc, t) => acc + (t.duracion || 0), 0)
      : (task.duracion || 0);

  const childQuotaStatus = parentRoutine ? getChildHabitQuotaStatus(parentRoutine, task, history || []) : undefined;
  const childQuotaMetadata = parentRoutine ? (
    <span
      className={cn(
        'h-5 whitespace-nowrap font-mono text-[10px] leading-5',
        childTargetReached ? 'text-emerald-700' : temporalToneClassName(childQuotaStatus!.tone),
      )}
      title={childQuotaStatus?.title}
      aria-label={childQuotaStatus?.title}
    >
      {childCycleCount}/{childCycleTarget}{childTargetReached ? ' · Logrado' : ''}
    </span>
  ) : null;

  const contextualMetadata: Array<React.ReactNode | null> = context === 'today' ? [
    isProjectChild ? null : task.hora || null,
    childQuotaMetadata,
    (trackedHoursToday > 0 || plannedHours > 0) ? `${trackedHoursToday.toFixed(2)}h/${plannedHours.toFixed(1)}h` : null,
  ] : context === 'backlog' ? [
    nextAppearanceDate && !isProjectChild ? <CompactDate label="Próx." value={nextAppearanceDate} /> : null,
    task.dependencyId ? `Dep. #${task.dependencyId.slice(-4)}` : null,
  ] : context === 'routine' ? [
    childQuotaMetadata || `Ciclo ${routineProgress}%`,
    checklistTotal > 0 ? `pasos ${completedChecklistItems}/${checklistTotal}` : null,
    trackedHours > 0 ? `${trackedHours.toFixed(2)}h` : null,
  ] : [
    nextAppearanceDate && !isProjectChild ? <CompactDate label="Próx." value={nextAppearanceDate} /> : null,
    (trackedHours > 0 || plannedHours > 0) ? `${trackedHours.toFixed(2)}h/${plannedHours.toFixed(1)}h` : null,
  ];
  const itemTemporalIndicators = getItemTemporalIndicators(task, allTasks, history || []);
  const temporalMetadata = itemTemporalIndicators.map(indicator => <TemporalIndicator indicator={indicator} />);
  const compactMetadata = limitCardMetadata<React.ReactNode>([
    ...temporalMetadata,
    ...contextualMetadata,
  ]);

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

  if (task.type === 'Proyecto' && isEditing) {
    return (
      <article className="border border-border-line bg-base-dim/10 p-5 text-left">
        <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Editando proyecto</h3>
        <UniversalItemForm
          initialData={task}
          config={config}
          allTasks={allTasks}
          onSave={updates => {
            if (onUpdate) onUpdate(task.id, updates);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </article>
    );
  }

  if (task.type === 'Proyecto' && !isEditing) {
    const presentation = getProjectPresentation(task, allTasks, history || []);
    const projectVariant = context === 'backlog'
      ? 'backlog'
      : task.hora ? 'timeline' : 'flexible';

    return (
      <ProjectCard
        project={task}
        presentation={presentation}
        config={config}
        variant={projectVariant}
        expanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(value => editingChildId ? true : !value)}
        onToggleProject={() => onToggle(task)}
        onEdit={onUpdate ? () => setIsEditing(true) : undefined}
        onDelete={onDelete}
      >
        <ul className="m-0 list-none space-y-1 p-0" aria-label={`Tareas pendientes de ${task.text}`}>
          {getSubtasksWithOrders().map(sub => (
            <li key={sub.id}>
              <TaskItem
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
                hideAreaCategory
                activeTimer={activeTimer}
                onStartTimer={onStartTimer}
                onNavigate={onNavigate}
                onEditProject={onEditProject}
                onEditingChange={editing => {
                  setEditingChildId(editing ? sub.id : current => current === sub.id ? null : current);
                  if (editing) setIsExpanded(true);
                }}
                showMoveArrows={showMoveArrows}
                context={context}
              />
            </li>
          ))}
        </ul>
      </ProjectCard>
    );
  }

  return (
    <div 
      id={`task-item-${task.id}`}
      className={cn(
        "relative group flex flex-col p-4 transition-all duration-200",
        isCompletedVisual && !isEditing ? "grayscale" : "",
        locked ? "opacity-60 grayscale" : "",
        isSubtask ? "mt-1" : ""
      )}
    >
      
      <div className="flex items-start gap-3 md:gap-4 w-full">
        <button 
          onClick={() => { if (!locked && occurrenceIsAvailable && !childTargetReached && (task.type !== 'Rutina' || canToggleRoutine)) onToggle(task); }}
          disabled={locked || !occurrenceIsAvailable || childTargetReached || (task.type === 'Rutina' && !canToggleRoutine)}
          onMouseEnter={() => { if (!locked && occurrenceIsAvailable && !childTargetReached && (task.type !== 'Rutina' || canToggleRoutine)) setIsCheckboxHovered(true); }}
          onMouseLeave={() => setIsCheckboxHovered(false)}
          className={cn(
            "mt-1 flex-shrink-0 focus:outline-none z-10 bg-transparent transition-all duration-200 flex items-center justify-center w-5 h-5 rounded-full hover:bg-base-dim/40",
            locked || !occurrenceIsAvailable || childTargetReached || (task.type === 'Rutina' && !canToggleRoutine) ? "cursor-default opacity-70" : "cursor-pointer"
          )}
        >
          {isActionComplete ? (
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
          <UniversalItemForm
            initialData={task}
            config={config}
            allTasks={allTasks}
            onSave={(updates) => {
              if (onUpdate) onUpdate(task.id, updates);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
            onEditProject={projectId => {
              if (onEditProject) onEditProject(projectId);
              else if (onNavigate) onNavigate('proyectos', projectId);
            }}
          />
        ) : false ? (
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
                      <span className={cn("text-xs text-text-main", item.done && "line-through opacity-60")}><LinkedText text={item.text} /></span>
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
                  if (task.type !== 'Rutina' && task.type !== 'Pulso' && !locked && occurrenceIsAvailable && !childTargetReached && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) {
                    onStartTimer(task.id);
                  }
                }}
                className={cn(
                  "text-base flex-1 min-w-0 break-words flex items-center gap-2 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
                  isCompletedVisual ? "text-text-dim opacity-55 line-through decoration-[var(--color-text-dim)]/50" : "text-text-main font-normal",
                  (task.type !== 'Rutina' && task.type !== 'Pulso' && !locked && occurrenceIsAvailable && !childTargetReached && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) ? "cursor-pointer hover:text-primary transition-colors" : ""
                )}
                title={(task.type !== 'Rutina' && task.type !== 'Pulso' && !locked && occurrenceIsAvailable && !childTargetReached && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && activeTimer?.taskId !== task.id) ? "Hacer clic para iniciar tracker ⏱️" : undefined}
              >
                <span>{task.text}</span>
              </p>
              {locked && <span className="flex items-center gap-1 text-xs font-mono font-medium uppercase tracking-widest text-[#b45f06] border border-[#e4e2dd] px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Bloqueada</span>}
            </div>
            
            <div className="flex flex-wrap items-center justify-between w-full mt-2 gap-y-1.5 gap-x-2 md:pr-4">
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
              {compactMetadata.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-[9px] text-text-dim/40">·</span>}
                  {typeof item === 'string'
                    ? <span className={cn("h-5 truncate font-mono text-[10px] leading-5 text-text-dim", childTargetReached && item.includes('Logrado') && "text-emerald-700")}>{item}</span>
                    : item}
                </React.Fragment>
              ))}
              {context === 'default' && task.allocationType && task.type !== 'Rutina' && task.type !== 'Hábito' && (
                <AllocationBadge allocation={task.allocationType} />
              )}
              
              {context === 'default' && !isSubtask && !isActualSubtask && parentTask && parentTask.type === 'Proyecto' && (
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
              
              {context === 'default' && !isSubtask && isActualSubtask && parentTask && parentTask.type !== 'Proyecto' && (
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
                task.type !== 'Rutina' && task.type !== 'Pulso' && !task.completed && occurrenceIsAvailable && !childTargetReached && !isCompletedVisual && (!isActualSubtask || task.type === 'Hábito') && onStartTimer && !locked && (
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
            {task.type !== 'Rutina' && checklistTotal > 0 && !isExpanded && (
              <div className="mt-3 flex items-center gap-3 w-full max-w-md" aria-label={`Checklist: ${completedChecklistItems} de ${checklistTotal} pasos completados`}>
                <span className="shrink-0 text-[9px] font-mono text-text-dim">{context === 'routine' ? 'pasos ' : ''}{completedChecklistItems}/{checklistTotal}</span>
                <div className="h-0.5 flex-1 bg-border-line/40 overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-emerald-600 transition-all duration-200" style={{ width: `${checklistProgress}%` }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

        <div className="flex flex-col items-center gap-1.5 shrink-0 w-6 pt-1">
          {/* Chevron */}
          {(!!task.notes || (task.checklist && task.checklist.length > 0) || hasSubtasks) && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="text-[#a2b29f] hover:text-[#2d2d2d] p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors" 
              title={isExpanded ? "Contraer detalles" : "Expandir detalles"}
              aria-label={isExpanded ? "Contraer detalles" : "Expandir detalles"}
              aria-expanded={isExpanded}
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
        <section className="mt-3 flex w-full flex-col gap-3 pl-4 pr-2 md:pl-6" aria-label={`Detalles de ${task.text}`}>
          {task.type !== 'Pulso' && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-text-dim">
              {task.type === 'Tarea' ? (
                <>
                  {(itemTemporalIndicators.find(indicator => indicator.kind === 'start') || !task.completed) && (
                    <span>{itemTemporalIndicators.find(indicator => indicator.kind === 'start')?.title || 'Inicio: Sin iniciar'}</span>
                  )}
                  {itemTemporalIndicators.find(indicator => indicator.kind === 'activity') && <span>{itemTemporalIndicators.find(indicator => indicator.kind === 'activity')?.title}</span>}
                  {itemTemporalIndicators.find(indicator => indicator.kind === 'deadline') && <span>{itemTemporalIndicators.find(indicator => indicator.kind === 'deadline')?.title}</span>}
                </>
              ) : task.type === 'Hábito' || task.type === 'Rutina' ? (
                <>
                  {itemTemporalIndicators.find(indicator => indicator.kind === 'activity') && <span>{itemTemporalIndicators.find(indicator => indicator.kind === 'activity')?.title}</span>}
                </>
              ) : (
                <>
                  <span>Inicio: {taskDateSummary.startDate ? formatRelativeCalendarDate(taskDateSummary.startDate) : 'Sin iniciar'}</span>
                  {taskDateSummary.lastActivityDate && <span>Última actividad: {formatRelativeCalendarDate(taskDateSummary.lastActivityDate)}</span>}
                </>
              )}
              {nextAppearanceDate && !isProjectChild && <span>Próxima aparición: {formatRelativeCalendarDate(nextAppearanceDate)}</span>}
              {task.type !== 'Tarea' && task.fechaLimite && <span>Fecha límite: {formatRelativeCalendarDate(task.fechaLimite)}</span>}
            </div>
          )}
          
          <ItemDetails
            notes={task.notes}
            checklist={task.checklist}
            onToggleChecklistItem={onUpdate ? handleToggleChecklistItem : undefined}
          />

          {/* Subtasks rendering */}
          {hasSubtasks && (
            <section className="mt-1.5 w-full" aria-label={`Subtareas de ${task.text}`}>
              <h4 className="mb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-text-dim">Subtareas</h4>
              <ul className="m-0 list-none space-y-1 p-0">
                {getSubtasksWithOrders().map(sub => (
                  <li key={sub.id}>
                    <TaskItem
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
                      context={context}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

        </section>
      )}
    </div>
  );
}
