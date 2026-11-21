import React, { useState } from 'react';
import {
  Target,
  Activity,
  Clock,
  Inbox,
  Database,
  X,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  CheckCircle2,
  Anchor,
  ArrowUpRight,
} from 'lucide-react';
import {
  Config,
  AppTask,
  HistoryRecord,
  ProgressSnapshot,
  Intention,
} from '../types';
import { calculateBiologicalPhase, getImminentPeriodWarning } from '../domain/cycle';
import { getEnergyEngineDetails } from '../domain/energy';
import { getLunarDetailsForDate } from '../domain/lunar';
import { extractSafeTime, timeToMins, isSameDay, cn } from '../lib/utils';
import TaskItem from './TaskItem';
import CategoryBadge from './ui/CategoryBadge';
import FilterDropdown from './ui/FilterDropdown';
import SortDropdown from './ui/SortDropdown';
import TemporalIndicator from './ui/TemporalIndicator';
import { formatDateOnly, isRoutineConfigured } from '../domain/recurrenceProgress';
import {
  getPulseLogValue,
  getPulseOccurrenceCount,
  hasPulseSafeDayConfirmation,
  normalizePulsePolarity,
} from '../domain/trackingProgress';
import { getTaskEnergyBreakdown } from '../domain/energyAllocation';
import {
  canTrackTask,
  DailyHabitEligibility,
  getDailyHabitEligibility,
  getItemTemporalIndicators,
  getTodayPlacement,
  isRoutineCycleClosed,
  isUnscheduledBacklogTask,
  isVerifiedHabitCompletion,
  wasChildHabitCompletedInAppearance,
} from '../domain/appearance';
import { getProjectPresentation, projectMatchesEnergyFilter } from '../domain/projectPresentation';
import { isTaskEffectivelyPaused } from '../domain/pause';
import { getCommitmentLabelsForTask, getTodayCommitmentSummaries } from '../domain/commitmentProgress';
import { getTaskIdsForItem } from '../domain/intentionProgress';
import { getHistoryDateKey, getProjectForTask } from '../domain/workTracking';
import {
  getDefaultExpandedMomentId,
  getMomentsForDate,
  ResolvedMoment,
  resolveTaskMomentId,
} from '../domain/moments';
import CommitmentProgressPanel from './CommitmentProgressPanel';
import {
  buildHabitDurationSummaryIndex,
  buildRoutineDurationSummaryIndex,
} from '../domain/habitDuration';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  progressSnapshots: ProgressSnapshot[];
  intentions?: Intention[];
  onToggleTask: (task: AppTask) => void;
  onAddEvent: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onPauseTask?: (id: string) => void;
  onResumeTask?: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onTogglePulseSafeDay: (taskId: string) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  activeTimer?: { taskId: string; isRunning: boolean } | null;
  onStartTimer?: (taskId: string) => void;
  onUpdateConfig?: (c: Partial<Config>) => void;
  onNavigate?: (view: string, taskId?: string) => void;
}

type TodayEntryBucket = 'due' | 'optional' | 'done';

interface ClassifiedTodayEntry {
  task: AppTask;
  bucket: TodayEntryBucket;
  eligibility?: DailyHabitEligibility;
  displayTask: AppTask;
}

const MOMENT_DOT_CLASSES: Record<string, string> = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
};

const MOMENT_BORDER_CLASSES: Record<string, string> = {
  slate: 'border-l-slate-400/70',
  blue: 'border-l-blue-500/70',
  orange: 'border-l-orange-500/70',
  purple: 'border-l-purple-500/70',
  emerald: 'border-l-emerald-500/70',
  amber: 'border-l-amber-500/70',
  red: 'border-l-red-500/70',
  green: 'border-l-green-500/70',
  teal: 'border-l-teal-500/70',
  cyan: 'border-l-cyan-500/70',
};

export default function HoyView({
  config,
  tasks,
  history,
  progressSnapshots,
  intentions = [],
  onToggleTask,
  onDeleteTask,
  onDuplicateTask,
  onPauseTask,
  onResumeTask,
  onUpdateTask,
  onTogglePulseSafeDay,
  onAddTask,
  activeTimer,
  onStartTimer,
  onUpdateConfig,
  onNavigate,
}: Props) {
  const [currentDay, setCurrentDay] = useState(() => formatDateOnly(new Date()));
  const phase = calculateBiologicalPhase(config);
  const phaseDetails = getEnergyEngineDetails(phase, config?.cycleConfig?.trackingType);
  const ENERGY_LIMIT = phaseDetails.limit;
  const todayLunar = getLunarDetailsForDate(new Date());

  // Pulso editing state
  const [editingPulsoId, setEditingPulsoId] = useState<string | null>(null);
  const [editPulsoForm, setEditPulsoForm] = useState({
    text: '',
    targetCount: 1,
    unitLabel: 'veces',
    polaridad: 'Reforzar',
    category: '',
    subCategory: '',
  });
  const [openMenuPulsoId, setOpenMenuPulsoId] = useState<string | null>(null);

  // View UI state
  const [showPulsos, setShowPulsos] = useState(true);
  const [showHechoHoy, setShowHechoHoy] = useState(true);
  const [showCuandoPueda, setShowCuandoPueda] = useState(true);
  const [showFlowLogger, setShowFlowLogger] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [userMomentToggles, setUserMomentToggles] = useState<Record<string, boolean>>({});
  const [expandedDoneGroups, setExpandedDoneGroups] = useState<Record<string, boolean>>({});
  const [sortCuandoPuedaBy, setSortCuandoPuedaBy] = useState('manual');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterAllocation, setFilterAllocation] = useState('Todas');
  const [filterTypeGroup, setFilterTypeGroup] = useState<'Todas' | 'habitos_rutinas' | 'tareas_proyectos'>('Todas');

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const next = formatDateOnly(new Date());
      setCurrentDay(previous => (previous === next ? previous : next));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const habitDurationSummaries = React.useMemo(
    () => buildHabitDurationSummaryIndex(tasks, history, progressSnapshots, currentDay),
    [tasks, history, progressSnapshots, currentDay],
  );
  const routineDurationSummaries = React.useMemo(
    () => buildRoutineDurationSummaryIndex(tasks, habitDurationSummaries),
    [tasks, habitDurationSummaries],
  );
  const todayCommitments = React.useMemo(
    () => getTodayCommitmentSummaries(intentions, tasks, history, progressSnapshots, currentDay),
    [intentions, tasks, history, progressSnapshots, currentDay],
  );

  React.useEffect(() => {
    if (selectedCommitmentId && !todayCommitments.some(summary => summary.id === selectedCommitmentId)) {
      setSelectedCommitmentId(null);
    }
  }, [selectedCommitmentId, todayCommitments]);

  const selectedCommitmentTaskIds = React.useMemo(() => {
    if (!selectedCommitmentId) return null;
    const summary = todayCommitments.find(item => item.id === selectedCommitmentId);
    if (!summary) return null;
    const ids = new Set<string>(getTaskIdsForItem(summary.item, tasks));
    summary.actions.forEach(action => {
      ids.add(action.task.id);
      if (action.task.parentId) ids.add(action.task.parentId);
    });
    return ids;
  }, [selectedCommitmentId, todayCommitments, tasks]);

  const matchesHeaderFilters = (t: AppTask): boolean => {
    if (filterArea !== 'Todas' && t.category !== filterArea) return false;
    if (filterAllocation !== 'Todas') {
      const matchesAlloc = t.type === 'Proyecto'
        ? projectMatchesEnergyFilter(t, tasks, filterAllocation)
        : t.allocationType === filterAllocation;
      if (!matchesAlloc) return false;
    }
    if (filterTypeGroup === 'habitos_rutinas' && t.type !== 'Hábito' && t.type !== 'Rutina') return false;
    if (filterTypeGroup === 'tareas_proyectos' && t.type !== 'Tarea' && t.type !== 'Proyecto') return false;
    return true;
  };

  const matchesCommitmentFilter = (t: AppTask): boolean => {
    if (!selectedCommitmentTaskIds) return true;
    if (selectedCommitmentTaskIds.has(t.id)) return true;
    if (t.type === 'Rutina' || t.type === 'Proyecto') {
      return tasks.some(child => child.parentId === t.id && selectedCommitmentTaskIds.has(child.id));
    }
    return false;
  };

  const getSortedTasks = (taskList: AppTask[], criterion: string): AppTask[] => {
    const sorted = [...taskList];
    if (criterion === 'manual') {
      sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (criterion === 'name') {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    } else if (criterion === 'date') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  };

  const sortMomentEntries = (entries: ClassifiedTodayEntry[]): ClassifiedTodayEntry[] => {
    return [...entries].sort((a, b) => {
      const timeA = extractSafeTime(a.task.hora);
      const timeB = extractSafeTime(b.task.hora);
      if (timeA && timeB) {
        const diff = timeToMins(timeA) - timeToMins(timeB);
        if (diff !== 0) return diff;
      } else if (timeA && !timeB) {
        return -1;
      } else if (!timeA && timeB) {
        return 1;
      }
      const orderDiff = (a.task.order || 0) - (b.task.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
    });
  };

  const handleDrop = (e: React.DragEvent, targetId: string, list: AppTask[]) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const draggedItem = tasks.find(t => t.id === draggedId);
    if (!draggedItem) return;
    if (!list.some(t => t.id === draggedId) || !list.some(t => t.id === targetId)) return;

    const currentIndex = list.findIndex(t => t.id === draggedId);
    const targetIndex = list.findIndex(t => t.id === targetId);
    const newList = [...list];
    newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    newList.forEach((t, idx) => {
      onUpdateTask(t.id, { order: (idx + 1) * 1000 });
    });
    setDraggedId(null);
  };

  const handleMoveTaskInList = (taskId: string, list: AppTask[], targetIndex: number) => {
    const currentIndex = list.findIndex(t => t.id === taskId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= list.length) return;
    const newList = [...list];
    const [moved] = newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, moved);
    newList.forEach((t, idx) => {
      onUpdateTask(t.id, { order: (idx + 1) * 1000 });
    });
  };

  const backlogTasks = tasks.filter(t => isUnscheduledBacklogTask(t, tasks, currentDay));

  const pulsos = tasks.filter(t => {
    if (t.type !== 'Pulso' || isTaskEffectivelyPaused(t, tasks)) return false;
    if (filterArea !== 'Todas' && t.category !== filterArea) return false;
    return true;
  });

  // Energy calculations (kept for the 1-line compact energy header)
  const todayRecords = history.filter(h => getHistoryDateKey(h) === currentDay);
  let fixedHoursToday = 0;
  let growthHoursToday = 0;
  todayRecords.forEach(h => {
    const task = tasks.find(t => t.id === h.taskId);
    const duration = h.duration || 0;
    if (task) {
      const energy = getTaskEnergyBreakdown(task, tasks, duration);
      fixedHoursToday += energy.support;
      growthHoursToday += energy.investment;
    } else {
      growthHoursToday += duration;
    }
  });
  const totalSoporteReal = fixedHoursToday;
  const totalInversionReal = growthHoursToday;
  const hoursWorkedToday = fixedHoursToday + growthHoursToday;

  const getPhaseBudgets = (phaseName: string) => {
    switch (phaseName) {
      case 'dinamica': return { soporte: 2.0, inversion: 10.0 };
      case 'expresiva': return { soporte: 2.0, inversion: 8.0 };
      case 'creativa': return { soporte: 3.0, inversion: 5.0 };
      case 'reflexiva': return { soporte: 4.0, inversion: 1.0 };
      default: return { soporte: 2.0, inversion: 6.0 };
    }
  };
  const { inversion: inversionBudget } = getPhaseBudgets(phase);

  // Gather active + completed-today entries
  const classifiedEntries: ClassifiedTodayEntry[] = [];
  const seenTaskIds = new Set<string>();

  tasks.forEach(t => {
    if (t.type === 'Rutina' && !isRoutineConfigured(t)) return;
    if (!matchesHeaderFilters(t) || !matchesCommitmentFilter(t)) return;
    const placement = getTodayPlacement(t, tasks, history, progressSnapshots, currentDay);
    if (placement !== 'timeline' && placement !== 'flexible') return;

    let displayTask = t;
    if (t.type === 'Proyecto') {
      const presentation = getProjectPresentation(t, tasks, history, currentDay);
      displayTask = { ...t, duracion: presentation.openEstimate };
      classifiedEntries.push({ task: t, displayTask, bucket: 'due', eligibility: 'due' });
      seenTaskIds.add(t.id);
      return;
    }

    if (t.type === 'Hábito') {
      const elig = getDailyHabitEligibility(t, tasks, history, progressSnapshots, currentDay);
      if (elig === 'covered') return;
      classifiedEntries.push({ task: t, displayTask, bucket: elig, eligibility: elig });
      seenTaskIds.add(t.id);
      return;
    }

    if (t.type === 'Rutina') {
      const childHabits = tasks.filter(
        c => c.parentId === t.id && c.type === 'Hábito' && !isTaskEffectivelyPaused(c, tasks, currentDay),
      );
      if (childHabits.length === 0) {
        classifiedEntries.push({ task: t, displayTask, bucket: 'due', eligibility: 'due' });
        seenTaskIds.add(t.id);
        return;
      }

      let hasDue = false;
      let hasOptional = false;
      let hasDoneToday = false;
      childHabits.forEach(c => {
        if (wasChildHabitCompletedInAppearance(t, c, history, currentDay)) {
          hasDoneToday = true;
          return;
        }
        const childElig = getDailyHabitEligibility(c, tasks, history, progressSnapshots, currentDay);
        if (childElig === 'due') hasDue = true;
        else if (childElig === 'optional') hasOptional = true;
      });

      if (hasDue) {
        classifiedEntries.push({ task: t, displayTask, bucket: 'due', eligibility: 'due' });
        seenTaskIds.add(t.id);
      } else if (hasOptional) {
        classifiedEntries.push({ task: t, displayTask, bucket: 'optional', eligibility: 'optional' });
        seenTaskIds.add(t.id);
      } else if (hasDoneToday) {
        classifiedEntries.push({ task: t, displayTask, bucket: 'done' });
        seenTaskIds.add(t.id);
      }
      return;
    }

    classifiedEntries.push({ task: t, displayTask, bucket: 'due', eligibility: 'due' });
    seenTaskIds.add(t.id);
  });

  // Also capture standalone habits, tasks, projects, and closed routines completed today so they fold into "✓ N hechos"
  tasks.forEach(t => {
    if (seenTaskIds.has(t.id) || t.type === 'Pulso') return;
    if (!matchesHeaderFilters(t) || !matchesCommitmentFilter(t)) return;
    if (t.parentId && getProjectForTask(t.parentId, tasks)) return;

    if (t.type === 'Hábito' && !t.parentId) {
      const doneToday = history.some(
        record => isVerifiedHabitCompletion(t, record) && getHistoryDateKey(record) === currentDay,
      );
      if (doneToday) {
        classifiedEntries.push({ task: t, displayTask: t, bucket: 'done' });
        seenTaskIds.add(t.id);
      }
      return;
    }

    if ((t.type === 'Tarea' || t.type === 'Proyecto') && t.completed && !t.parentId) {
      const doneTodayByExec = t.lastExecutedAt ? isSameDay(t.lastExecutedAt, `${currentDay}T12:00:00`) : false;
      const doneTodayByHist = todayRecords.some(r => r.taskId === t.id && r.isCompletion === true);
      if (doneTodayByExec || doneTodayByHist) {
        classifiedEntries.push({ task: t, displayTask: t, bucket: 'done' });
        seenTaskIds.add(t.id);
      }
      return;
    }

    if (t.type === 'Rutina' && isRoutineCycleClosed(t, progressSnapshots, currentDay)) {
      const closedToday = todayRecords.some(r => r.taskId === t.id && r.isCompletion === true)
        || progressSnapshots.some(
          s => s.kind === 'routine-cycle' && s.taskId === t.id && (s.resolvedAt || s.periodEnd) === currentDay,
        );
      if (closedToday) {
        classifiedEntries.push({ task: t, displayTask: t, bucket: 'done' });
        seenTaskIds.add(t.id);
      }
    }
  });

  // Group into Momentos + Cuando pueda
  const moments = getMomentsForDate(config?.separators, currentDay);
  const momentBuckets = new Map<string, {
    moment: ResolvedMoment;
    dueItems: ClassifiedTodayEntry[];
    optionalItems: ClassifiedTodayEntry[];
    doneItems: ClassifiedTodayEntry[];
  }>();
  moments.forEach(moment => {
    momentBuckets.set(moment.id, {
      moment,
      dueItems: [],
      optionalItems: [],
      doneItems: [],
    });
  });

  const cuandoPuedaDue: ClassifiedTodayEntry[] = [];
  const cuandoPuedaOptional: ClassifiedTodayEntry[] = [];
  const cuandoPuedaDone: ClassifiedTodayEntry[] = [];

  classifiedEntries.forEach(entry => {
    const resolvedId = resolveTaskMomentId(entry.task, moments);
    if (resolvedId && momentBuckets.has(resolvedId)) {
      const bucket = momentBuckets.get(resolvedId)!;
      if (entry.bucket === 'due') bucket.dueItems.push(entry);
      else if (entry.bucket === 'optional') bucket.optionalItems.push(entry);
      else bucket.doneItems.push(entry);
    } else {
      if (entry.bucket === 'due') cuandoPuedaDue.push(entry);
      else if (entry.bucket === 'optional') cuandoPuedaOptional.push(entry);
      else cuandoPuedaDone.push(entry);
    }
  });

  const visibleMomentGroups = Array.from(momentBuckets.values())
    .filter(group => group.dueItems.length > 0 || group.optionalItems.length > 0 || group.doneItems.length > 0)
    .map(group => ({
      ...group,
      dueItems: sortMomentEntries(group.dueItems),
      optionalItems: sortMomentEntries(group.optionalItems),
      doneItems: sortMomentEntries(group.doneItems),
    }));

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const defaultExpandedMomentId = getDefaultExpandedMomentId(
    visibleMomentGroups.map(group => ({
      moment: group.moment,
      dueCount: group.dueItems.length,
      optionalCount: group.optionalItems.length,
    })),
    nowMins,
  );

  // Build "Hecho hoy" closure items (merging logs + completed items without duplication)
  const getRecordTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  interface HechoHoyItem {
    id: string;
    taskId?: string;
    text: string;
    parentText?: string;
    timeLabel: string;
    timestamp: number;
    duration: number;
    isCompletion: boolean;
    isPulse: boolean;
    pulseLogValue?: string;
    category?: string;
    subCategory?: string;
  }

  const recordTaskIds = new Set<string>();
  const hechoHoyItems: HechoHoyItem[] = todayRecords.map(rec => {
    recordTaskIds.add(rec.taskId);
    const recTask = tasks.find(t => t.id === rec.taskId);
    const parentTask = recTask?.parentId ? tasks.find(p => p.id === recTask.parentId) : undefined;
    const isPulse = recTask?.type === 'Pulso';
    return {
      id: `rec-${rec.id}`,
      taskId: recTask?.id,
      text: recTask ? recTask.text : (rec.taskSnapshotText || '(Elemento eliminado)'),
      parentText: parentTask?.text,
      timeLabel: getRecordTime(rec.date),
      timestamp: new Date(rec.date).getTime() || 0,
      duration: rec.duration || 0,
      isCompletion: Boolean(rec.isCompletion),
      isPulse,
      pulseLogValue: isPulse && recTask ? getPulseLogValue(recTask, rec) : undefined,
      category: recTask?.category || parentTask?.category,
      subCategory: recTask?.subCategory || parentTask?.subCategory,
    };
  });

  // Include tasks completed today that lack a history record on currentDay
  classifiedEntries
    .filter(entry => entry.bucket === 'done' && !recordTaskIds.has(entry.task.id))
    .forEach(entry => {
      const t = entry.task;
      const ts = t.lastExecutedAt ? new Date(t.lastExecutedAt).getTime() : Date.now();
      hechoHoyItems.push({
        id: `done-${t.id}`,
        taskId: t.id,
        text: t.text,
        timeLabel: t.lastExecutedAt ? getRecordTime(t.lastExecutedAt) : 'Hoy',
        timestamp: ts,
        duration: 0,
        isCompletion: true,
        isPulse: false,
        category: t.category,
        subCategory: t.subCategory,
      });
    });

  hechoHoyItems.sort((a, b) => b.timestamp - a.timestamp);
  const completedCountToday = hechoHoyItems.filter(item => item.isCompletion).length;

  const periodWarning = getImminentPeriodWarning(config);

  const getPhaseIcon = (p: string) => {
    switch (p) {
      case 'reflexiva': return '🩸';
      case 'dinamica': return '⚡';
      case 'expresiva': return '🌸';
      case 'creativa': return '🍃';
      default: return '🔮';
    }
  };

  const renderTaskCard = (entry: ClassifiedTodayEntry, extraProps?: Partial<React.ComponentProps<typeof TaskItem>>) => (
    <TaskItem
      key={entry.task.id}
      task={entry.displayTask}
      config={config}
      allTasks={tasks}
      history={history}
      progressSnapshots={progressSnapshots}
      onToggle={onToggleTask}
      onDelete={() => onDeleteTask(entry.task.id)}
      onUpdate={onUpdateTask}
      onAddTask={onAddTask}
      onDeleteTask={onDeleteTask}
      onDuplicateTask={onDuplicateTask}
      onPauseTask={onPauseTask}
      onResumeTask={onResumeTask}
      activeTimer={activeTimer}
      onStartTimer={onStartTimer}
      onNavigate={onNavigate}
      context="today"
      dailyEligibility={entry.bucket === 'optional' ? 'optional' : entry.eligibility}
      commitmentLabels={getCommitmentLabelsForTask(intentions, tasks, entry.task.id, currentDay, currentDay)}
      durationSummary={habitDurationSummaries.get(entry.task.id)}
      routineDurationSummary={routineDurationSummaries.get(entry.task.id)}
      {...extraProps}
    />
  );

  const sortedCuandoPuedaDue = getSortedTasks(
    cuandoPuedaDue.map(e => e.displayTask),
    sortCuandoPuedaBy,
  );
  const sortedCuandoPuedaOptional = getSortedTasks(
    cuandoPuedaOptional.map(e => e.displayTask),
    sortCuandoPuedaBy,
  );
  const cuandoPuedaEntryMap = new Map<string, ClassifiedTodayEntry>(
    [...cuandoPuedaDue, ...cuandoPuedaOptional, ...cuandoPuedaDone].map(entry => [entry.task.id, entry]),
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in w-full px-5 md:px-10 py-6 md:py-8 pb-12 mx-auto">
      {/* Compact 1-line Header */}
      <header className="w-full flex flex-col gap-3 border-b border-border-line pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Title + Biological Phase */}
          <div className="flex items-center gap-2.5 flex-wrap text-left">
            <h2 className="text-title flex items-center gap-2.5 mr-1">
              <Target className="w-5 h-5 stroke-[2]" /> Foco de Hoy {getPhaseIcon(phase)}
            </h2>

            <span
              className={cn(
                'text-[10px] tracking-wider font-mono uppercase px-2.5 py-0.5 rounded-full border',
                phaseDetails.borderColor,
                phaseDetails.pillBg,
              )}
              title={phaseDetails.details}
            >
              {phaseDetails.label}
            </span>

            {config?.cycleConfig?.menstruates !== false && config?.cycleConfig?.enableLunarMirror && (
              <span className="text-[10px] tracking-wider font-mono uppercase px-2.5 py-0.5 rounded-full border border-border-line/60 bg-base-dim/10 text-text-main flex items-center gap-1 font-semibold">
                <span>{todayLunar.emoji}</span>
                <span>{todayLunar.phaseName}</span>
              </span>
            )}

            {config?.cycleConfig?.menstruates !== false && config?.cycleConfig?.trackingType === 'menstrual' && (
              <button
                type="button"
                onClick={() => setShowFlowLogger(!showFlowLogger)}
                aria-expanded={showFlowLogger}
                aria-label={showFlowLogger ? 'Contraer registro de ciclo' : 'Expandir registro de ciclo'}
                title={showFlowLogger ? 'Contraer registro de ciclo' : 'Expandir registro de ciclo'}
                className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-text-main hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none"
              >
                {showFlowLogger ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Ciclo</span>
              </button>
            )}

            <span className="text-text-dim/30 font-mono text-[10px]">|</span>

            <label htmlFor="manual-cycle-phase" className="sr-only">
              Ajustar fase actual manualmente
            </label>
            <select
              id="manual-cycle-phase"
              name="manualCyclePhase"
              className="appearance-none bg-transparent text-[10px] font-mono text-[#a2b29f] hover:text-text-main cursor-pointer outline-none transition-colors border-b border-transparent hover:border-[#a2b29f]"
              value={config?.cycleConfig?.currentManualPhase || 'none'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateConfig?.({
                  cycleConfig: {
                    ...config?.cycleConfig,
                    trackingType: config?.cycleConfig?.trackingType || 'none',
                    currentManualPhase: val === 'none' ? undefined : (val as any),
                  },
                });
              }}
              title="Ajustar fase actual manualmente"
            >
              <option value="none">🔄 Auto</option>
              <option value="dinamica">Folicular (Dinámica)</option>
              <option value="expresiva">Ovulatoria (Expresiva)</option>
              <option value="creativa">Lútea (Creativa)</option>
              <option value="reflexiva">Menstrual (Reflexiva)</option>
            </select>
          </div>

          {/* Right: Date + Compact Energy Meter + Filter */}
          <div className="flex items-center justify-between lg:justify-end gap-4 flex-wrap">
            <span className="text-[10px] tracking-[0.16em] text-[#a2b29f] uppercase font-mono leading-none">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>

            <div className="flex items-center gap-2.5 min-w-[180px]" title={`Soporte: ${totalSoporteReal.toFixed(1)}h · Inversión: ${totalInversionReal.toFixed(1)}/${inversionBudget.toFixed(1)}h`}>
              <div className="w-24 h-[5px] bg-[var(--color-border-line)] relative rounded-full overflow-hidden flex shrink-0">
                {fixedHoursToday > 0 && (
                  <div
                    style={{ width: `${Math.min(100, (fixedHoursToday / ENERGY_LIMIT) * 100)}%` }}
                    className="bg-[#81b29a] h-full transition-all duration-300"
                  />
                )}
                {growthHoursToday > 0 && (
                  <div
                    style={{ width: `${Math.min(100, (growthHoursToday / ENERGY_LIMIT) * 100)}%` }}
                    className="bg-[#d4af37] h-full transition-all duration-300"
                  />
                )}
              </div>
              <span className="text-[10px] font-mono text-text-main font-semibold tabular-nums whitespace-nowrap">
                {hoursWorkedToday.toFixed(1)}/{ENERGY_LIMIT.toFixed(1)}h
              </span>
              <span className="hidden sm:inline text-[9px] font-mono text-text-dim tabular-nums whitespace-nowrap">
                🛡️{totalSoporteReal.toFixed(1)} · ⚡{totalInversionReal.toFixed(1)}/{inversionBudget.toFixed(1)}
              </span>
            </div>

            <FilterDropdown
              align="right"
              configs={[
                {
                  key: 'typeGroup',
                  label: 'Tipo',
                  options: [
                    { label: 'Todos los tipos', value: 'Todas' },
                    { label: 'Hábitos y Rutinas', value: 'habitos_rutinas' },
                    { label: 'Tareas y Proyectos', value: 'tareas_proyectos' },
                  ],
                },
                {
                  key: 'area',
                  label: 'Área',
                  options: [
                    { label: 'Todas las áreas', value: 'Todas' },
                    ...Object.keys(config?.areas || {}).map(cat => ({ label: cat, value: cat })),
                  ],
                },
                {
                  key: 'allocation',
                  label: 'Inversión',
                  options: [
                    { label: 'Todas las asignaciones', value: 'Todas' },
                    { label: 'Soporte Vital 🛡️', value: 'fixed' },
                    { label: 'Inversión ⚡', value: 'growth' },
                    { label: 'Mixto ☯️', value: 'mixed' },
                  ],
                },
              ]}
              activeFilters={{
                typeGroup: filterTypeGroup,
                area: filterArea,
                allocation: filterAllocation,
              }}
              onChange={(key, val) => {
                if (key === 'typeGroup') setFilterTypeGroup(val as any);
                if (key === 'area') setFilterArea(val);
                if (key === 'allocation') setFilterAllocation(val);
              }}
            />
          </div>
        </div>

        {/* Menstrual Flow Logger (expandable inline) */}
        {config?.cycleConfig?.menstruates !== false && config?.cycleConfig?.trackingType === 'menstrual' && showFlowLogger && (
          <div className="w-full glass-matte p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top-2 duration-300 mt-1">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-bold text-text-main flex items-center gap-2 font-sans">
                🩸 Registro de Intensidad del Periodo
              </span>
              <span className="text-[10px] text-text-dim leading-relaxed max-w-sm font-mono">
                Registra el flujo hoy. Día 1 se detecta tras 10 días secos. La fase reflexiva se extiende si continúas registrando flujo.
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { val: 0, label: 'Seco', color: 'hover:bg-[#efede8]/40 hover:text-black border-border-line text-slate-500 bg-white/50', activeColor: 'bg-[#81b29a]/20 text-[#81b29a] border-[#81b29a] font-bold' },
                { val: 1, label: 'Ligero', color: 'hover:bg-[#73c2b8]/10 hover:text-[#73c2b8] border-[#73c2b8]/30 text-[#73c2b8] bg-white/50', activeColor: 'bg-[#73c2b8] text-white border-[#73c2b8] font-bold' },
                { val: 2, label: 'Moderado', color: 'hover:bg-[#e07a5f]/10 hover:text-[#e07a5f] border-[#e07a5f]/30 text-[#e07a5f] bg-white/50', activeColor: 'bg-[#e07a5f] text-white border-[#e07a5f] font-bold' },
                { val: 3, label: 'Abundante', color: 'hover:bg-[#d4af37]/10 hover:text-[#d4af37] border-[#d4af37]/30 text-[#d4af37] bg-white/50', activeColor: 'bg-[#d4af37] text-white border-[#d4af37] font-bold' },
              ].map(f => {
                const todayStr = currentDay;
                const currentFlow = config?.cycleConfig?.flowLogs?.[todayStr] || 0;
                const isActive = currentFlow === f.val;

                return (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => {
                      const newFlowLogs = { ...(config?.cycleConfig?.flowLogs || {}) };
                      newFlowLogs[todayStr] = f.val;
                      onUpdateConfig?.({
                        cycleConfig: {
                          ...config?.cycleConfig,
                          trackingType: 'menstrual',
                          flowLogs: newFlowLogs,
                        },
                      });
                    }}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-medium rounded-xl border transition-all cursor-pointer',
                      isActive ? f.activeColor : f.color,
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Imminent Period Warning Alert */}
      {periodWarning && (
        <div className="glass-matte p-3.5 rounded-2xl flex items-center gap-3 text-xs text-text-main animate-in slide-in-from-top-2 duration-200">
          <span className="text-lg">🩸</span>
          <div className="flex-1 text-left">
            <span className="font-bold">Alerta de Transición Cíclica:</span> Se estima que tu periodo iniciará en{' '}
            <span className="font-bold font-mono">
              {periodWarning.daysUntilPeriod} {periodWarning.daysUntilPeriod === 1 ? 'día' : 'días'}
            </span>
            . Considera planificar tareas de menor esfuerzo mental para descansar.
          </div>
        </div>
      )}

      {/* Main Responsive Layout: 1 col mobile -> 2/3 + 1/3 on PC (>=lg), single page scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2/3): Compromisos + Momentos + Cuando pueda + Enlace Backlog */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <CommitmentProgressPanel
            summaries={todayCommitments}
            title="Compromisos de hoy"
            variant="pills"
            selectedCommitmentId={selectedCommitmentId}
            onToggleFilter={id => setSelectedCommitmentId(prev => (prev === id ? null : id))}
          />

          {/* Timeline */}
          <section className="flex flex-col gap-3" aria-label="Timeline">
            <div className="flex items-center justify-between border-b border-border-line/30 pb-2">
              <h3 className="text-subtitle flex items-center gap-2 text-left">
                <Clock className="w-4 h-4 text-text-main silhouette-icon" /> Timeline
              </h3>
              <button
                type="button"
                onClick={() => onNavigate?.('configuracion')}
                className="text-[10px] text-text-dim hover:text-text-main font-mono uppercase tracking-wider cursor-pointer bg-transparent border-0 underline underline-offset-4"
              >
                Configurar momentos
              </button>
            </div>

            {visibleMomentGroups.length === 0 ? (
              <p className="text-xs text-text-dim text-left py-2">
                {moments.length === 0
                  ? 'No tienes momentos configurados para hoy. Configura bloques u horarios desde Ajustes.'
                  : 'Sin acciones programadas dentro de los momentos de hoy.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleMomentGroups.map(group => {
                  const { moment, dueItems, optionalItems, doneItems } = group;
                  const isExpanded = userMomentToggles[moment.id] ?? (defaultExpandedMomentId === moment.id);
                  const isDoneListOpen = Boolean(expandedDoneGroups[moment.id]);
                  const dotClass = MOMENT_DOT_CLASSES[moment.color || ''] || 'bg-primary';
                  const borderClass = MOMENT_BORDER_CLASSES[moment.color || ''] || 'border-l-border-line';
                  const hasDue = dueItems.length > 0;

                  return (
                    <section
                      key={moment.id}
                      className={cn(
                        'border border-border-line/40 border-l-2 bg-base transition-colors',
                        borderClass,
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setUserMomentToggles(prev => ({
                            ...prev,
                            [moment.id]: !isExpanded,
                          }))
                        }
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-transparent border-0 hover:bg-base-dim/20 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-text-dim shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
                          )}
                          <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} aria-hidden="true" />
                          <span className="text-sm font-medium text-text-main">{moment.text}</span>
                          {moment.kind === 'trigger' ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border-line/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-dim">
                              <Anchor className="w-2.5 h-2.5" /> Gatillo · {moment.hora}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-text-dim">{moment.hora}</span>
                          )}
                          {moment.detalle && (
                            <span className="text-xs text-text-dim font-light truncate">{moment.detalle}</span>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2 font-mono text-[10px]">
                          {hasDue ? (
                            <span className="text-text-main font-semibold tabular-nums">
                              {dueItems.length} {dueItems.length === 1 ? 'pendiente' : 'pendientes'}
                            </span>
                          ) : optionalItems.length > 0 ? (
                            <span className="text-text-dim tabular-nums">
                              {optionalItems.length} {optionalItems.length === 1 ? 'opcional' : 'opcionales'}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Al día</span>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-border-line/25 flex flex-col gap-2 animate-in fade-in duration-150">
                          {dueItems.length > 0 && (
                            <ul className="m-0 list-none space-y-2 p-0">
                              {dueItems.map(entry => (
                                <li key={entry.task.id}>{renderTaskCard(entry)}</li>
                              ))}
                            </ul>
                          )}

                          {optionalItems.length > 0 && (
                            <ul className="m-0 list-none space-y-2 p-0">
                              {optionalItems.map(entry => (
                                <li key={entry.task.id}>{renderTaskCard(entry)}</li>
                              ))}
                            </ul>
                          )}

                          {doneItems.length > 0 && (
                            <div className="pt-2 border-t border-border-line/20">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDoneGroups(prev => ({
                                    ...prev,
                                    [moment.id]: !isDoneListOpen,
                                  }))
                                }
                                aria-expanded={isDoneListOpen}
                                className="inline-flex items-center gap-1.5 border-0 bg-transparent px-1 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                <span>
                                  ✓ {doneItems.length} {doneItems.length === 1 ? 'hecho' : 'hechos'}
                                </span>
                                {isDoneListOpen ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {isDoneListOpen && (
                                <ul className="m-0 mt-1.5 list-none space-y-2 p-0">
                                  {doneItems.map(entry => (
                                    <li key={entry.task.id}>{renderTaskCard(entry)}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>

          {/* Flexible (items without momentId or hora) */}
          <section className="flex flex-col gap-3 border-t border-border-line/40 pt-5" aria-label="Flexible">
            <div className="flex items-center justify-between">
              <h3
                onClick={() => setShowCuandoPueda(!showCuandoPueda)}
                aria-label={showCuandoPueda ? 'Contraer Flexible' : 'Expandir Flexible'}
                aria-expanded={showCuandoPueda}
                className="text-subtitle flex items-center gap-2 cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                {showCuandoPueda ? (
                  <ChevronUp className="w-3.5 h-3.5 text-text-dim" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-text-dim" />
                )}
                <Inbox className="w-4 h-4 text-text-main silhouette-icon" /> Flexible
                {(cuandoPuedaDue.length > 0 || cuandoPuedaOptional.length > 0) && (
                  <span className="font-mono text-[10px] font-normal text-text-dim">
                    ({cuandoPuedaDue.length}
                    {cuandoPuedaOptional.length > 0 ? ` + ${cuandoPuedaOptional.length} opc.` : ''})
                  </span>
                )}
              </h3>
              <SortDropdown
                align="right"
                options={[
                  { label: 'Orden manual', value: 'manual' },
                  { label: 'Prioridad', value: 'priority' },
                  { label: 'Fecha de creación', value: 'date' },
                  { label: 'Alfabético', value: 'name' },
                ]}
                currentValue={sortCuandoPuedaBy}
                onChange={setSortCuandoPuedaBy}
              />
            </div>

            {showCuandoPueda && (
              <div className="animate-in duration-200 fade-in flex flex-col gap-2">
                {sortedCuandoPuedaDue.length === 0 && sortedCuandoPuedaOptional.length === 0 && cuandoPuedaDone.length === 0 ? (
                  <p className="text-xs text-[#a2b29f] text-left pl-2">Sin elementos flexibles.</p>
                ) : (
                  <>
                    {sortedCuandoPuedaDue.length > 0 && (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {sortedCuandoPuedaDue.map((t, idx, arr) => {
                          const entry = cuandoPuedaEntryMap.get(t.id);
                          if (!entry) return null;
                          return (
                            <li
                              key={t.id}
                              draggable={sortCuandoPuedaBy === 'manual'}
                              onDragStart={e => {
                                e.dataTransfer.setData('text/plain', t.id);
                                setDraggedId(t.id);
                              }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => handleDrop(e, t.id, arr)}
                              className={cn(sortCuandoPuedaBy === 'manual' ? 'cursor-grab active:cursor-grabbing' : '')}
                            >
                              {renderTaskCard(entry, {
                                showMoveArrows: sortCuandoPuedaBy === 'manual',
                                onMoveUp:
                                  sortCuandoPuedaBy === 'manual' && idx > 0
                                    ? () => handleMoveTaskInList(t.id, arr, idx - 1)
                                    : undefined,
                                onMoveDown:
                                  sortCuandoPuedaBy === 'manual' && idx < arr.length - 1
                                    ? () => handleMoveTaskInList(t.id, arr, idx + 1)
                                    : undefined,
                                canMoveUp: idx > 0,
                                canMoveDown: idx < arr.length - 1,
                              })}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {sortedCuandoPuedaOptional.length > 0 && (
                      <ul className="m-0 list-none space-y-2 p-0">
                        {sortedCuandoPuedaOptional.map(t => {
                          const entry = cuandoPuedaEntryMap.get(t.id);
                          if (!entry) return null;
                          return <li key={t.id}>{renderTaskCard(entry)}</li>;
                        })}
                      </ul>
                    )}

                    {cuandoPuedaDone.length > 0 && (
                      <div className="pt-2 border-t border-border-line/20">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDoneGroups(prev => ({
                              ...prev,
                              __cuando_pueda__: !prev.__cuando_pueda__,
                            }))
                          }
                          aria-expanded={Boolean(expandedDoneGroups.__cuando_pueda__)}
                          className="inline-flex items-center gap-1.5 border-0 bg-transparent px-1 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          <span>
                            ✓ {cuandoPuedaDone.length} {cuandoPuedaDone.length === 1 ? 'hecho' : 'hechos'}
                          </span>
                          {expandedDoneGroups.__cuando_pueda__ ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {expandedDoneGroups.__cuando_pueda__ && (
                          <ul className="m-0 mt-1.5 list-none space-y-2 p-0">
                            {cuandoPuedaDone.map(entry => (
                              <li key={entry.task.id}>{renderTaskCard(entry)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Subtle Backlog navigation link (Backlog lives in Agenda) */}
          <div className="pt-3 border-t border-border-line/30 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate?.('agenda-backlog')}
              className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-xs font-mono uppercase tracking-wider text-text-dim hover:text-primary transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Backlog ({backlogTasks.length}) → Agenda</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right Column (1/3 on PC, flows below on mobile): Pulsos (if active) + Hecho hoy */}
        <aside className="lg:col-span-1 flex flex-col gap-6 lg:border-l lg:border-border-line/60 lg:pl-8 min-w-0">
          {/* Pulsos Diarios (only rendered when active pulses exist) */}
          {pulsos.length > 0 && (
            <section className="flex flex-col gap-3 animate-in fade-in duration-300" aria-label="Pulsos Diarios">
              <h3
                onClick={() => setShowPulsos(!showPulsos)}
                aria-label={showPulsos ? 'Contraer pulsos diarios' : 'Expandir pulsos diarios'}
                aria-expanded={showPulsos}
                title={showPulsos ? 'Contraer pulsos diarios' : 'Expandir pulsos diarios'}
                className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 transition-all select-none border-b border-border-line/30 pb-2"
              >
                <span className="flex items-center gap-2">
                  {showPulsos ? <ChevronUp className="w-3.5 h-3.5 text-text-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim" />}
                  <Activity className="w-4 h-4 text-emerald-500" /> Pulsos Diarios
                </span>
              </h3>

              {showPulsos && (
                <div className="flex flex-col gap-2 w-full animate-in fade-in duration-300">
                  {pulsos.map(t => {
                    const count = getPulseOccurrenceCount(history, t.id, new Date());
                    const target = t.targetCount || 1;
                    const unit = t.unitLabel || 'veces';
                    const isAbandoning = normalizePulsePolarity(t.polaridad) === 'Abandonar';
                    const safeDayConfirmed = isAbandoning && hasPulseSafeDayConfirmation(history, t.id, new Date());
                    const progress = safeDayConfirmed ? 100 : Math.min((count / target) * 100, 100);
                    const isDone = isAbandoning ? safeDayConfirmed : count >= target;
                    const unstartedIndicator = getItemTemporalIndicators(t, tasks, history).find(
                      indicator => indicator.kind === 'unstarted',
                    );

                    if (editingPulsoId === t.id) {
                      return (
                        <div key={t.id} className="border border-border-line p-2.5 flex flex-col gap-2.5 animate-in zoom-in-95 duration-200 bg-base-dim/10 text-left">
                          <input
                            type="text"
                            className="px-2 py-0.5 bg-base border border-border-line text-xs text-text-main focus:outline-none focus:border-[#a2b29f] w-full font-sans"
                            value={editPulsoForm.text}
                            onChange={e => setEditPulsoForm({ ...editPulsoForm, text: e.target.value })}
                            placeholder="Nombre del pulso..."
                          />
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1 text-[9px] border border-border-line px-1.5 py-0.5 bg-base text-text-main font-mono w-fit">
                              <span className="text-text-dim">Meta:</span>
                              <input
                                type="number"
                                min={1}
                                className="w-8 bg-transparent text-center font-bold focus:outline-none border-b border-border-line text-text-main"
                                value={editPulsoForm.targetCount}
                                onChange={e => setEditPulsoForm({ ...editPulsoForm, targetCount: Number(e.target.value) })}
                              />
                              <input
                                type="text"
                                className="w-12 bg-transparent font-bold focus:outline-none text-center border-b border-border-line text-text-main"
                                value={editPulsoForm.unitLabel}
                                onChange={e => setEditPulsoForm({ ...editPulsoForm, unitLabel: e.target.value })}
                                placeholder="un."
                              />
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              <select
                                className="px-1.5 py-0.5 bg-base border border-border-line text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                                value={editPulsoForm.polaridad}
                                onChange={e => setEditPulsoForm({ ...editPulsoForm, polaridad: e.target.value })}
                                title="Polaridad"
                              >
                                <option value="Reforzar">Reforzar</option>
                                <option value="Abandonar">Abandonar</option>
                              </select>
                              <select
                                className="px-1.5 py-0.5 bg-base border border-border-line text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                                value={editPulsoForm.category}
                                onChange={e => setEditPulsoForm({ ...editPulsoForm, category: e.target.value, subCategory: '' })}
                                title="Área"
                              >
                                <option value="">Sin Área</option>
                                {Object.keys(config?.areas || {}).map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                              {editPulsoForm.category && typeof config?.areas?.[editPulsoForm.category] !== 'string' && (config?.areas?.[editPulsoForm.category] as any)?.categories?.length > 0 && (
                                <select
                                  className="px-1.5 py-0.5 bg-base border border-border-line text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                                  value={editPulsoForm.subCategory}
                                  onChange={e => setEditPulsoForm({ ...editPulsoForm, subCategory: e.target.value })}
                                  title="Categoría"
                                >
                                  <option value="">Sin Cat.</option>
                                  {((config?.areas?.[editPulsoForm.category] as any).categories || []).map((sc: string) => (
                                    <option key={sc} value={sc}>{sc}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 items-center">
                            <button
                              type="button"
                              onClick={() => setEditingPulsoId(null)}
                              className="text-[8.5px] font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editPulsoForm.text.trim()) return;
                                onUpdateTask(t.id, {
                                  text: editPulsoForm.text.trim(),
                                  targetCount: editPulsoForm.targetCount,
                                  unitLabel: editPulsoForm.unitLabel,
                                  polaridad: editPulsoForm.polaridad as any,
                                  category: editPulsoForm.category || undefined,
                                  subCategory: editPulsoForm.subCategory || undefined,
                                });
                                setEditingPulsoId(null);
                              }}
                              className="text-[8.5px] font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0"
                              disabled={!editPulsoForm.text.trim()}
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={t.id}
                        className="relative group py-2 px-2.5 flex items-center border-b border-border-line/30 last:border-b-0 text-left gap-2"
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-medium text-text-main truncate" title={t.text}>{t.text}</h4>
                            {t.category && <CategoryBadge area={t.category} subCategory={t.subCategory} config={config} />}
                            {t.polaridad && (
                              <span className="text-[7.5px] font-mono uppercase tracking-wider px-1 rounded-full border border-dashed border-border-line/50 text-text-dim leading-none">
                                {isAbandoning ? '📉' : '📈'}
                              </span>
                            )}
                            {unstartedIndicator && <TemporalIndicator indicator={unstartedIndicator} />}
                          </div>
                          <div className="h-[1.5px] w-full bg-[#efede8]/60 dark:bg-border-line/50 relative overflow-hidden">
                            <div
                              className={cn('h-full transition-all duration-300 absolute top-0 left-0', isDone ? 'bg-[#81b29a]' : 'bg-[#73c2b8]')}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onUpdateTask(t.id, { currentCount: Math.max(0, count - 1), completed: isAbandoning ? false : Math.max(0, count - 1) >= target })}
                                className="w-[24px] h-[24px] rounded-full border border-border-line flex items-center justify-center text-xs text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-all cursor-pointer bg-transparent font-medium shrink-0"
                                title="Decrementar"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateTask(t.id, { currentCount: Math.min(target * 2, count + 1), completed: isAbandoning ? false : (count + 1) >= target })}
                                className="w-[24px] h-[24px] rounded-full border border-[#73c2b8]/40 flex items-center justify-center text-xs text-[#73c2b8] hover:bg-[#73c2b8]/10 hover:text-text-main transition-all cursor-pointer bg-transparent font-medium shrink-0"
                                title="Incrementar"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[10px] font-mono text-text-dim leading-none">
                              {count} <span className="opacity-60">/ {target} {unit}</span>
                            </span>
                            {isAbandoning && count === 0 && (
                              <button
                                type="button"
                                onClick={() => onTogglePulseSafeDay(t.id)}
                                className={cn(
                                  'text-[8px] font-mono uppercase tracking-wider cursor-pointer bg-transparent border-0 hover:underline',
                                  safeDayConfirmed ? 'text-[#81b29a]' : 'text-text-dim',
                                )}
                              >
                                {safeDayConfirmed ? 'Deshacer día libre' : 'Confirmar día libre'}
                              </button>
                            )}
                            {isDone && (
                              <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-[#81b29a] leading-none">Listo</span>
                            )}
                          </div>
                        </div>

                        <div className="relative flex items-center justify-center shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuPulsoId(openMenuPulsoId === t.id ? null : t.id);
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
                          {openMenuPulsoId === t.id && (
                            <>
                              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuPulsoId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditPulsoForm({
                                      text: t.text,
                                      targetCount: t.targetCount || 1,
                                      unitLabel: t.unitLabel || 'veces',
                                      polaridad: t.polaridad || 'Reforzar',
                                      category: t.category || '',
                                      subCategory: t.subCategory || '',
                                    });
                                    setEditingPulsoId(t.id);
                                    setOpenMenuPulsoId(null);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                                >
                                  <Edit2 className="w-3 h-3 text-text-dim" />
                                  Editar
                                </button>
                                {onDuplicateTask && (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); onDuplicateTask(t.id); setOpenMenuPulsoId(null); }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                                  >
                                    Duplicar
                                  </button>
                                )}
                                {onPauseTask && !t.completed && (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); onPauseTask(t.id); setOpenMenuPulsoId(null); }}
                                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                                  >
                                    Pausar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (window.confirm(`¿Estás segura de que deseas eliminar permanentemente el pulso "${t.text}"?`)) {
                                      setOpenMenuPulsoId(null);
                                      onDeleteTask(t.id);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-50/15 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                                >
                                  <X className="w-3 h-3 text-red-500" />
                                  Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Logs (Daily closure: merges recorded sessions + Completions) */}
          <section className={cn('flex flex-col gap-3', pulsos.length > 0 && 'border-t border-border-line/50 pt-5')} aria-label="Logs">
            <div className="flex items-center justify-between border-b border-border-line/30 pb-2 gap-2">
              <h3
                onClick={() => setShowHechoHoy(!showHechoHoy)}
                aria-expanded={showHechoHoy}
                className="text-subtitle flex items-center gap-2 cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                {showHechoHoy ? <ChevronUp className="w-3.5 h-3.5 text-text-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim" />}
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Logs
              </h3>
              <span className="text-[10px] font-mono text-text-dim tabular-nums">
                {completedCountToday} {completedCountToday === 1 ? 'completado' : 'completados'} · {hoursWorkedToday.toFixed(1)}h
              </span>
            </div>

            {showHechoHoy && (
              hechoHoyItems.length === 0 ? (
                <p className="text-xs text-text-dim/80 text-left py-2">
                  Tu cierre del día irá apareciendo aquí conforme completes o cronometres bloques.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-1 p-0 animate-in fade-in duration-200">
                  {hechoHoyItems.map(item => {
                    const recordTask = item.taskId ? tasks.find(t => t.id === item.taskId) : undefined;
                    const canStartTimer =
                      !item.isPulse
                      && !!recordTask
                      && !!onStartTimer
                      && activeTimer?.taskId !== recordTask.id
                      && canTrackTask(recordTask, tasks, history);

                    return (
                      <li
                        key={item.id}
                        onClick={() => {
                          if (canStartTimer && recordTask) {
                            onStartTimer(recordTask.id);
                          }
                        }}
                        title={canStartTimer ? 'Hacer clic para continuar el timer ⏱️' : undefined}
                        className={cn(
                          'flex items-center justify-between gap-2 py-2 px-2 border-b border-border-line/20 last:border-b-0 text-left group rounded-md transition-colors',
                          canStartTimer && 'cursor-pointer hover:bg-base-dim/15',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-text-dim shrink-0 tabular-nums">{item.timeLabel}</span>
                          {item.isCompletion ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : item.isPulse ? (
                            <Activity className="w-3 h-3 text-[#73c2b8] shrink-0" />
                          ) : (
                            <Clock className="w-3 h-3 text-[#73c2b8] shrink-0" />
                          )}
                          <div className="min-w-0 flex flex-col">
                            <span
                              className={cn(
                                'text-xs text-text-main truncate',
                                canStartTimer && 'group-hover:text-primary transition-colors',
                              )}
                              title={item.parentText ? `${item.parentText} · ${item.text}` : item.text}
                            >
                              {item.text}
                            </span>
                            {item.parentText && (
                              <span className="text-[9px] font-mono text-text-dim truncate">{item.parentText}</span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {item.category && <CategoryBadge area={item.category} subCategory={item.subCategory} config={config} />}
                          {item.isPulse && item.pulseLogValue ? (
                            <span className="font-mono text-[10px] font-medium text-[#73c2b8] tabular-nums">
                              {item.pulseLogValue}
                            </span>
                          ) : item.duration > 0 ? (
                            <span className="font-mono text-[10px] font-bold text-[#73c2b8] tabular-nums">
                              +{item.duration.toFixed(2)}h
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
