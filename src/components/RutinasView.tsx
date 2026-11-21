import React, { useMemo, useState } from 'react';
import { AppTask, Config, HistoryRecord, ProgressSnapshot } from '../types';
import { isPulseSafeDayConfirmation } from '../domain/trackingProgress';
import TaskItem from './TaskItem';
import FilterDropdown from './ui/FilterDropdown';
import SortDropdown from './ui/SortDropdown';
import GroupDropdown from './ui/GroupDropdown';
import { CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Edit2, Repeat, X, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, isSameDay } from '../lib/utils';
import CategoryBadge from './ui/CategoryBadge';
import UniversalItemForm from './UniversalItemForm';
import ItemDetails from './ItemDetails';
import { formatDateOnly, isRoutineConfigured } from '../domain/recurrenceProgress';
import {
  getAppearanceDate,
  getItemTemporalIndicators,
  getNextRoutineAppearanceDate,
  getRoutineCycleRangeForTask,
  isRoutineCycleClosed,
  limitCardMetadata,
} from '../domain/appearance';
import TemporalIndicator from './ui/TemporalIndicator';
import CompactDate from './ui/CompactDate';
import { getRoutineCycleProgress, getRoutineHabitCycleState, isRoutineReadyToClose } from '../domain/occurrenceResults';
import { buildHabitDurationSummaryIndex, getRoutineDurationSummary } from '../domain/habitDuration';
import { ActivityDurationAverage, DurationComparison, SECONDARY_METRIC_TYPOGRAPHY_CLASS } from './DurationSummaryMetric';
import { isTaskEffectivelyPaused } from '../domain/pause';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history?: HistoryRecord[];
  progressSnapshots: ProgressSnapshot[];
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onPauseTask?: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  focusTaskId?: string | null;
  activeTimer?: {
    taskId: string;
    startTime: string;
    sessionStart?: string;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null;
  onStartTimer?: (taskId: string) => void;
}

export default function RutinasView({
  config,
  tasks,
  history,
  progressSnapshots,
  onToggleTask,
  onDeleteTask,
  onDuplicateTask,
  onPauseTask,
  onUpdateTask,
  onAddTask,
  focusTaskId,
  activeTimer,
  onStartTimer,
}: Props) {
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddPulso, setShowAddPulso] = useState(false);

  const [isRoutinesOpen, setIsRoutinesOpen] = useState(true);
  const [isHabitsOpen, setIsHabitsOpen] = useState(true);
  const [isPulsosOpen, setIsPulsosOpen] = useState(true);
  const [groupBy, setGroupBy] = useState<'type' | 'area'>('type');
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});
  const [hoveredRoutineId, setHoveredRoutineId] = useState<string | null>(null);

  const [expandedRoutines, setExpandedRoutines] = useState<string[]>([]);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editingPulsoId, setEditingPulsoId] = useState<string | null>(null);
  const [openMenuPulsoId, setOpenMenuPulsoId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'name'>('manual');
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterSubCategory, setFilterSubCategory] = useState('Todas');
  const [filterFrequency, setFilterFrequency] = useState('Todas');
  const [filterType, setFilterType] = useState('Todas');
  const [openMenuRoutineId, setOpenMenuRoutineId] = useState<string | null>(null);
  const [menuRoutineUpwards, setMenuRoutineUpwards] = useState(false);

  const todayKey = formatDateOnly(new Date());
  const habitDurationSummaries = useMemo(
    () => buildHabitDurationSummaryIndex(tasks, history || [], progressSnapshots, todayKey),
    [tasks, history, progressSnapshots, todayKey],
  );

  const availableSubCategories: string[] = useMemo(() => {
    if (filterArea === 'Todas') return [];
    const areaCfg = config?.areas?.[filterArea];
    if (!areaCfg || typeof areaCfg === 'string') return [];
    return areaCfg.categories || [];
  }, [config?.areas, filterArea]);

  const sortTasks = (taskList: AppTask[], criterion: string) => {
    const pending = taskList.filter(t => !t.completed);
    const completed = taskList.filter(t => t.completed);

    let sortedPending = [...pending];
    if (criterion === 'manual') {
      const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const withOrders = baseline.map((t, idx) => ({
        ...t,
        order: t.order !== undefined ? t.order : (idx + 1) * 1000,
      }));
      sortedPending = withOrders.sort((a, b) => a.order - b.order);
    } else if (criterion === 'name') {
      sortedPending.sort((a, b) => a.text.localeCompare(b.text));
    } else if (criterion === 'date') {
      sortedPending.sort((a, b) => {
        const aDate = getAppearanceDate(a);
        const bDate = getAppearanceDate(b);
        const aTime = aDate ? new Date(`${aDate}T00:00:00`).getTime() : new Date(a.createdAt).getTime();
        const bTime = bDate ? new Date(`${bDate}T00:00:00`).getTime() : new Date(b.createdAt).getTime();
        return aTime - bTime;
      });
    }

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };

  React.useEffect(() => {
    if (focusTaskId) {
      const foundTask = tasks.find(t => t.id === focusTaskId);
      if (foundTask) {
        let routineToExpand = '';
        if (foundTask.type === 'Rutina') {
          routineToExpand = foundTask.id;
        } else if (foundTask.parentId) {
          const parent = tasks.find(t => t.id === foundTask.parentId);
          if (parent && parent.type === 'Rutina') {
            routineToExpand = parent.id;
          }
        }

        if (routineToExpand) {
          setExpandedRoutines(prev => (prev.includes(routineToExpand) ? prev : [...prev, routineToExpand]));
        }

        setTimeout(() => {
          const el = document.getElementById(`task-item-${focusTaskId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-[var(--color-border-line)]/40', 'transition-all', 'duration-500');
            setTimeout(() => {
              el.classList.remove('bg-[var(--color-border-line)]/40');
            }, 2000);
          }
        }, 150);
      }
    }
  }, [focusTaskId, tasks]);

  let filteredRoutines = tasks.filter(t => t.type === 'Rutina' && !t.completed && !isTaskEffectivelyPaused(t, tasks));
  let filteredStandaloneHabits = tasks.filter(
    t => t.type === 'Hábito' && (!t.parentId || !tasks.some(p => p.id === t.parentId)) && !isTaskEffectivelyPaused(t, tasks),
  );
  let filteredPulsos = tasks.filter(t => t.type === 'Pulso' && !isTaskEffectivelyPaused(t, tasks));

  if (filterArea !== 'Todas') {
    filteredRoutines = filteredRoutines.filter(t => t.category === filterArea);
    filteredStandaloneHabits = filteredStandaloneHabits.filter(t => t.category === filterArea);
    filteredPulsos = filteredPulsos.filter(t => t.category === filterArea);
  }

  if (filterSubCategory !== 'Todas') {
    filteredRoutines = filteredRoutines.filter(t => t.subCategory === filterSubCategory);
    filteredStandaloneHabits = filteredStandaloneHabits.filter(t => t.subCategory === filterSubCategory);
    filteredPulsos = filteredPulsos.filter(t => t.subCategory === filterSubCategory);
  }

  if (filterFrequency !== 'Todas') {
    const matchesFreq = (t: AppTask) => {
      if (filterFrequency === 'diario') return t.frecuencia === 1 && t.frecuenciaUnidad === 'días';
      if (filterFrequency === 'semanal') return t.frecuenciaUnidad === 'semanas';
      if (filterFrequency === 'mensual') return t.frecuenciaUnidad === 'meses';
      return true;
    };
    filteredRoutines = filteredRoutines.filter(matchesFreq);
    filteredStandaloneHabits = filteredStandaloneHabits.filter(matchesFreq);
    if (filterFrequency !== 'diario') {
      filteredPulsos = [];
    }
  }

  if (filterType !== 'Todas') {
    if (filterType !== 'Rutina') filteredRoutines = [];
    if (filterType !== 'Hábito') filteredStandaloneHabits = [];
    if (filterType !== 'Pulso') filteredPulsos = [];
  }

  const routines = sortTasks(filteredRoutines, sortBy);
  const standaloneHabits = sortTasks(filteredStandaloneHabits, sortBy);
  const pulsos = filteredPulsos;

  const getRoutineSiblings = () => {
    const siblingsList = tasks.filter(t => t.type === 'Rutina');
    const pending = siblingsList.filter(t => !t.completed);
    const completed = siblingsList.filter(t => t.completed);

    const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withOrders = baseline.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : (idx + 1) * 1000,
    }));
    const sortedPending = withOrders.sort((a, b) => a.order - b.order);

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };

  const handleMoveRoutineUp = (routine: AppTask) => {
    const siblings = getRoutineSiblings();
    const idx = siblings.findIndex(s => s.id === routine.id);
    if (idx <= 0) return;
    const targetIdx = idx - 1;
    const newOrder = targetIdx === 0
      ? siblings[0].order - 1000
      : (siblings[targetIdx - 1].order + siblings[targetIdx].order) / 2;
    onUpdateTask(routine.id, { order: newOrder });
  };

  const handleMoveRoutineDown = (routine: AppTask) => {
    const siblings = getRoutineSiblings();
    const idx = siblings.findIndex(s => s.id === routine.id);
    if (idx === -1 || idx === siblings.length - 1) return;
    const targetIdx = idx + 1;
    const newOrder = targetIdx === siblings.length - 1
      ? siblings[siblings.length - 1].order + 1000
      : (siblings[targetIdx].order + siblings[targetIdx + 1].order) / 2;
    onUpdateTask(routine.id, { order: newOrder });
  };

  const toggleExpand = (id: string) => {
    setExpandedRoutines(prev => (prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]));
  };

  const renderRoutineCard = (routine: AppTask, listForOrdering: AppTask[]) => {
    const isExpanded = expandedRoutines.includes(routine.id);
    const rawSubtasks = tasks.filter(t => t.parentId === routine.id && t.type === 'Hábito' && !isTaskEffectivelyPaused(t, tasks));
    const pausedSubtaskCount = tasks.filter(t => t.parentId === routine.id && t.type === 'Hábito' && isTaskEffectivelyPaused(t, tasks)).length;
    const sortedSubtasks = sortTasks(rawSubtasks, sortBy);
    const habitCycleState = getRoutineHabitCycleState(routine, sortedSubtasks, history || [], progressSnapshots, new Date(), tasks);
    const subtasks = habitCycleState.orderedHabits;
    const remainingHabitLabel = habitCycleState.remainingCount === 0 && subtasks.length > 0
      ? 'ciclo completo'
      : `${habitCycleState.remainingCount} ${habitCycleState.remainingCount === 1 ? 'hábito pendiente' : 'hábitos pendientes'}`;
    const routineDurationSummary = getRoutineDurationSummary(subtasks, habitDurationSummaries);
    const configured = isRoutineConfigured(routine);
    const routineProgress = configured ? getRoutineCycleProgress(routine, tasks, history || [], progressSnapshots) : null;
    const routineReady = configured ? isRoutineReadyToClose(routine, tasks, history || [], progressSnapshots) : false;
    const cycleClosed = configured ? isRoutineCycleClosed(routine, progressSnapshots) : false;
    const nextRoutineAppearance = configured ? getNextRoutineAppearanceDate(routine, progressSnapshots) : undefined;
    const routineCycleEnd = configured ? getRoutineCycleRangeForTask(routine).end : undefined;
    const routineTemporalIndicators = getItemTemporalIndicators(routine, tasks, history || []);
    const hasRoutineDuration = routineDurationSummary.currentActualHours > 0 || routineDurationSummary.estimatedHours > 0;
    const routineMetadata = limitCardMetadata<React.ReactNode>([
      <output className={cn(SECONDARY_METRIC_TYPOGRAPHY_CLASS, 'h-5 whitespace-nowrap')}>
        {routineProgress || 0}% · {remainingHabitLabel}
      </output>,
      nextRoutineAppearance ? <CompactDate label="Próx." value={nextRoutineAppearance} /> : null,
      routineCycleEnd ? <CompactDate label="Cierra" value={routineCycleEnd} /> : null,
      pausedSubtaskCount > 0 ? <span className="font-mono text-[10px] text-text-dim">{pausedSubtaskCount} en pausa</span> : null,
      ...routineTemporalIndicators.map(indicator => <TemporalIndicator indicator={indicator} />),
      ...(hasRoutineDuration
        ? [
          <DurationComparison
            key="duration-comparison"
            actualHours={routineDurationSummary.currentActualHours}
            estimatedHours={routineDurationSummary.estimatedHours}
            className="shrink-0 whitespace-nowrap"
          />,
        ]
        : []),
    ], 4);

    if (editingRoutineId === routine.id) {
      return (
        <div key={routine.id} className="border border-border-line p-5 flex flex-col mb-4 bg-base-dim/10 text-left animate-in zoom-in-95 duration-200 rounded-2xl">
          <h4 className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-4">Editando Rutina</h4>
          <UniversalItemForm
            initialData={routine}
            config={config}
            allTasks={tasks}
            onSave={updates => {
              onUpdateTask(routine.id, updates);
              setEditingRoutineId(null);
            }}
            onCancel={() => setEditingRoutineId(null)}
          />
        </div>
      );
    }

    const idx = listForOrdering.findIndex(r => r.id === routine.id);
    const isFirstItem = idx <= 0;
    const isLastItem = idx === -1 || idx === listForOrdering.length - 1;
    const canCloseCycle = configured && routineReady && !cycleClosed;
    const isHovered = hoveredRoutineId === routine.id;

    return (
      <div key={routine.id} id={`task-item-${routine.id}`} className="relative py-5 flex flex-col mb-4 border-b last:border-b-0 border-border-line/40 group transition-all">
        <div className="flex items-start gap-3 md:gap-4 w-full">
          <button
            type="button"
            disabled={!canCloseCycle}
            onClick={() => {
              if (canCloseCycle) onToggleTask(routine);
            }}
            onMouseEnter={() => {
              if (canCloseCycle) setHoveredRoutineId(routine.id);
            }}
            onMouseLeave={() => setHoveredRoutineId(prev => (prev === routine.id ? null : prev))}
            aria-label={canCloseCycle ? `Cerrar ciclo de ${routine.text}` : routine.text}
            title={cycleClosed ? 'Ciclo cerrado' : canCloseCycle ? 'Cerrar ciclo de rutina' : undefined}
            className={cn(
              'mt-1 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-transparent border-0 transition-all',
              canCloseCycle ? 'cursor-pointer hover:bg-base-dim/40' : 'cursor-default',
            )}
          >
            {cycleClosed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            ) : canCloseCycle && isHovered ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600/75 dark:text-emerald-500/75" />
            ) : canCloseCycle ? (
              <Repeat className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            ) : (
              <Repeat className="w-4 h-4 text-text-main/70" />
            )}
          </button>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex gap-2 items-center flex-wrap mb-1">
              <h3 className="text-subtitle font-normal leading-tight group-hover:text-accent transition-colors overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {routine.text}
              </h3>
              <CategoryBadge area={routine.category} subCategory={routine.subCategory} config={config} />
              {!configured && (
                <button
                  type="button"
                  onClick={() => setEditingRoutineId(routine.id)}
                  className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/5 text-[9px] font-mono uppercase tracking-wider text-amber-700 cursor-pointer"
                >
                  Ciclo pendiente de configurar
                </button>
              )}
              {cycleClosed && (
                <span className="px-2 py-0.5 rounded-full border border-emerald-600/30 text-[9px] font-mono uppercase tracking-wider text-emerald-600">
                  Ciclo cerrado
                </span>
              )}
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden text-[10px] font-mono text-text-dim">
              {routineMetadata.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-text-dim/40">·</span>}
                  {item}
                </React.Fragment>
              ))}
            </div>
            <progress
              max={100}
              value={routineProgress || 0}
              aria-label={`Progreso de la rutina: ${routineProgress || 0}%`}
              className="mt-3 block h-0.5 w-full appearance-none overflow-hidden accent-emerald-600 [&::-webkit-progress-bar]:bg-border-line/40 [&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600"
            />
          </div>

          <div className="flex flex-col items-center gap-1.5 shrink-0 w-6 pt-1">
            <button
              title={isExpanded ? 'Contraer hábitos' : 'Expandir hábitos'}
              aria-label={isExpanded ? 'Contraer hábitos' : 'Expandir hábitos'}
              aria-expanded={isExpanded}
              onClick={() => toggleExpand(routine.id)}
              className="text-[#a2b29f] hover:text-[#2d2d2d] p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="relative flex items-center justify-center">
              <button
                onClick={e => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  setMenuRoutineUpwards(spaceBelow < 250);
                  setOpenMenuRoutineId(openMenuRoutineId === routine.id ? null : routine.id);
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

              {openMenuRoutineId === routine.id && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuRoutineId(null)} />
                  <div
                    className={cn(
                      'absolute right-0 z-50 w-40 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left',
                      menuRoutineUpwards ? 'bottom-full mb-1' : 'top-full mt-1',
                    )}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingRoutineId(routine.id);
                        setOpenMenuRoutineId(null);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                    >
                      <svg className="w-3 h-3 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      Editar
                    </button>
                    {sortBy === 'manual' && (
                      <>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleMoveRoutineUp(routine);
                            setOpenMenuRoutineId(null);
                          }}
                          disabled={isFirstItem}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                          Mover arriba
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleMoveRoutineDown(routine);
                            setOpenMenuRoutineId(null);
                          }}
                          disabled={isLastItem}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                          Mover abajo
                        </button>
                      </>
                    )}
                    <div className="h-[1px] bg-border-line/40 my-1"></div>
                    {onDuplicateTask && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDuplicateTask(routine.id);
                          setOpenMenuRoutineId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                      >
                        Duplicar
                      </button>
                    )}
                    {onPauseTask && !routine.completed && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onPauseTask(routine.id);
                          setOpenMenuRoutineId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                      >
                        Pausar
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOpenMenuRoutineId(null);
                        if (window.confirm(`¿Estás segura de que deseas eliminar permanentemente la rutina "${routine.text}" y todos sus hábitos?`)) {
                          onDeleteTask(routine.id);
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

            {sortBy === 'manual' && (
              <div className="flex flex-col gap-0.5 items-center">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleMoveRoutineUp(routine);
                  }}
                  disabled={isFirstItem}
                  className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                  title="Mover arriba"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleMoveRoutineDown(routine);
                  }}
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
          <section className="relative mt-4 flex flex-col gap-2 pl-4 animate-in fade-in duration-200" aria-label={`Hábitos de ${routine.text}`}>
            {routine.notes && (
              <div className="mb-3 border-b border-border-line/40 pb-2">
                <ItemDetails notes={routine.notes} onUpdateNotes={notes => onUpdateTask(routine.id, { notes })} />
              </div>
            )}
            <ActivityDurationAverage
              lastActivity={routineTemporalIndicators.find(indicator => indicator.kind === 'activity')?.title}
              averageHours={routineDurationSummary.combinedAverageHours}
              count={routineDurationSummary.contributingHabitCount}
              singularSample="hábito con ciclos completos"
              pluralSample="hábitos con ciclos completos"
              averageLabel="Duración promedio (hábitos)"
              className="m-0 font-mono text-[10px] text-text-dim"
            />
            {routineTemporalIndicators.some(indicator => indicator.kind !== 'activity') && (
              <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-[10px] text-text-dim">
                {routineTemporalIndicators
                  .filter(indicator => indicator.kind !== 'activity')
                  .map(indicator => (
                    <li key={indicator.kind}>{indicator.title}</li>
                  ))}
              </ul>
            )}
            <section className="z-10 mb-2 mt-1 flex w-full flex-col gap-1 pr-2" aria-label={`Añadir hábito a ${routine.text}`}>
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const val = e.target.elements[0].value.trim();
                  if (!val) return;
                  onAddTask({
                    userId: 'placeholder',
                    text: val,
                    type: 'Hábito',
                    parentId: routine.id,
                    category: routine.category,
                    subCategory: routine.subCategory,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    objetivoPorCiclo: 1,
                  });
                  e.target.reset();
                }}
                className="flex items-center"
              >
                <input
                  type="text"
                  placeholder="Añadir hábito a esta rutina..."
                  className="flex-1 px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                />
                <button type="submit" className="text-text-main text-xs font-bold font-mono uppercase tracking-wider hover:underline cursor-pointer bg-transparent border-0 outline-none ml-4">
                  + Añadir
                </button>
              </form>
            </section>
            <ul className="m-0 list-none space-y-1 p-0">
              {subtasks.map(sub => (
                <li key={sub.id}>
                  <TaskItem
                    task={sub}
                    config={config}
                    allTasks={tasks}
                    history={history}
                    onToggle={onToggleTask}
                    onDelete={() => onDeleteTask(sub.id)}
                    onUpdate={onUpdateTask}
                    onAddTask={onAddTask}
                    onDeleteTask={onDeleteTask}
                    onDuplicateTask={onDuplicateTask}
                    onPauseTask={onPauseTask}
                    isSubtask
                    hideAreaCategory={false}
                    showMoveArrows={sortBy === 'manual'}
                    activeTimer={activeTimer}
                    onStartTimer={onStartTimer}
                    context="routine"
                    durationSummary={habitDurationSummaries.get(sub.id)}
                    progressSnapshots={progressSnapshots}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  const renderStandaloneHabitCard = (habit: AppTask) => (
    <TaskItem
      key={habit.id}
      task={habit}
      config={config}
      allTasks={tasks}
      history={history}
      onToggle={onToggleTask}
      onDelete={() => onDeleteTask(habit.id)}
      onUpdate={onUpdateTask}
      onAddTask={onAddTask}
      onDeleteTask={onDeleteTask}
      onDuplicateTask={onDuplicateTask}
      onPauseTask={onPauseTask}
      isSubtask={false}
      hideAreaCategory={false}
      showMoveArrows={sortBy === 'manual'}
      activeTimer={activeTimer}
      onStartTimer={onStartTimer}
      context="routine"
      durationSummary={habitDurationSummaries.get(habit.id)}
      progressSnapshots={progressSnapshots}
    />
  );

  const renderPulsoCard = (t: AppTask) => {
    const count = (history || []).filter(
      h => h.taskId === t.id && !isPulseSafeDayConfirmation(h) && isSameDay(h.date, new Date().toISOString()),
    ).length;
    const target = t.targetCount || 1;
    const unit = t.unitLabel || 'veces';
    const progress = Math.min((count / target) * 100, 100);
    const isDone = count >= target;
    const unstartedIndicator = getItemTemporalIndicators(t, tasks, history || []).find(
      indicator => indicator.kind === 'unstarted',
    );

    if (editingPulsoId === t.id) {
      return (
        <div key={t.id} className="border border-border-line p-2 flex flex-col gap-2.5 animate-in zoom-in-95 duration-200 rounded-2xl bg-base-dim/10 text-left font-sans">
          <UniversalItemForm
            initialData={t}
            config={config}
            allTasks={tasks}
            onSave={updates => {
              onUpdateTask(t.id, updates);
              setEditingPulsoId(null);
            }}
            onCancel={() => setEditingPulsoId(null)}
          />
        </div>
      );
    }

    return (
      <div
        key={t.id}
        className="relative group py-1.5 px-3 flex items-center bg-transparent rounded-none transition-all animate-in zoom-in-95 duration-200 text-left flex-none w-fit min-w-[160px] max-w-[220px] border-r border-border-line/30 last:border-r-0 gap-2"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-medium text-text-main truncate font-sans" title={t.text}>
              {t.text}
            </h4>
            <CategoryBadge area={t.category} subCategory={t.subCategory} config={config} hideArea />
            {t.polaridad && (
              <span className="text-[7.5px] font-mono uppercase tracking-wider px-1 py-0.2 rounded-full border border-dashed border-border-line/50 text-text-dim leading-none">
                {t.polaridad === 'Abandonar' ? '📉' : '📈'}
              </span>
            )}
            {unstartedIndicator && <TemporalIndicator indicator={unstartedIndicator} />}
          </div>
          <div className="h-[1.5px] w-full bg-[#efede8]/60 dark:bg-border-line/50 relative rounded-none overflow-hidden">
            <div className={cn('h-full transition-all duration-300 absolute top-0 left-0', isDone ? 'bg-[#81b29a]' : 'bg-[#73c2b8]')} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex border border-border-line rounded-none bg-transparent overflow-hidden">
              <button
                onClick={() => onUpdateTask(t.id, { currentCount: Math.max(0, count - 1), completed: Math.max(0, count - 1) >= target })}
                className="w-[18px] h-[18px] flex items-center justify-center text-[9px] text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-colors cursor-pointer bg-transparent border-0 rounded-none font-bold"
              >
                -
              </button>
              <div className="w-[1px] bg-border-line" />
              <button
                onClick={() => onUpdateTask(t.id, { currentCount: Math.min(target * 2, count + 1), completed: count + 1 >= target })}
                className="w-[18px] h-[18px] flex items-center justify-center text-[9px] text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-colors cursor-pointer bg-transparent border-0 rounded-none font-bold"
              >
                +
              </button>
            </div>
            <span className="text-[9.5px] font-mono text-text-dim leading-none">
              {count} <span className="opacity-60">/ {target} {unit}</span>
            </span>
            {isDone && <span className="text-[7.5px] uppercase tracking-wider font-mono font-bold text-[#81b29a] leading-none">Listo</span>}
          </div>
        </div>
        <div className="relative flex items-center justify-center shrink-0 border-l border-border-line/70 pl-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
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
                  onClick={e => {
                    e.stopPropagation();
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
                    onClick={e => {
                      e.stopPropagation();
                      onDuplicateTask(t.id);
                      setOpenMenuPulsoId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                  >
                    Duplicar
                  </button>
                )}
                {onPauseTask && !t.completed && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onPauseTask(t.id);
                      setOpenMenuPulsoId(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                  >
                    Pausar
                  </button>
                )}
                <button
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
  };

  const areaGroupedData = useMemo(() => {
    const allItems = [...routines, ...standaloneHabits, ...pulsos];
    const areaOrder = Object.keys(config?.areas || {});
    allItems.forEach(item => {
      if (item.category && !areaOrder.includes(item.category)) areaOrder.push(item.category);
    });
    const keys = [...areaOrder, '__none__'];

    return keys
      .map(areaKey => {
        const matchArea = (item: AppTask) => (areaKey === '__none__' ? !item.category : item.category === areaKey);
        const areaRoutines = routines.filter(matchArea);
        const areaHabits = standaloneHabits.filter(matchArea);
        const areaPulsos = pulsos.filter(matchArea);
        const total = areaRoutines.length + areaHabits.length + areaPulsos.length;
        if (total === 0) return null;

        const cfg = areaKey === '__none__' ? undefined : config?.areas?.[areaKey];
        const configuredSubs = cfg && typeof cfg !== 'string' ? cfg.categories || [] : [];
        const subOrder = [...configuredSubs];
        [...areaRoutines, ...areaHabits, ...areaPulsos].forEach(item => {
          if (item.subCategory && !subOrder.includes(item.subCategory)) subOrder.push(item.subCategory);
        });

        const subGroups = [...subOrder, '__none__']
          .map(subKey => {
            const matchSub = (item: AppTask) => (subKey === '__none__' ? !item.subCategory : item.subCategory === subKey);
            const r = areaRoutines.filter(matchSub);
            const h = areaHabits.filter(matchSub);
            const p = areaPulsos.filter(matchSub);
            if (r.length + h.length + p.length === 0) return null;
            return {
              key: subKey,
              label: subKey === '__none__' ? 'Sin subcategoría' : subKey,
              routines: r,
              habits: h,
              pulsos: p,
            };
          })
          .filter((g): g is NonNullable<typeof g> => !!g);

        return {
          key: areaKey,
          label: areaKey === '__none__' ? 'Sin Área' : areaKey,
          total,
          subGroups,
        };
      })
      .filter((g): g is NonNullable<typeof g> => !!g);
  }, [config?.areas, routines, standaloneHabits, pulsos]);

  const filterConfigs = [
    {
      key: 'area',
      label: 'Área',
      options: [
        { label: 'Todas las áreas', value: 'Todas' },
        ...Object.keys(config?.areas || {}).map(cat => ({ label: cat, value: cat })),
      ],
    },
    ...(availableSubCategories.length > 0
      ? [
        {
          key: 'subCategory',
          label: 'Subcategoría',
          options: [
            { label: 'Todas las subcategorías', value: 'Todas' },
            ...availableSubCategories.map(sc => ({ label: sc, value: sc })),
          ],
        },
      ]
      : []),
    {
      key: 'frequency',
      label: 'Frecuencia',
      options: [
        { label: 'Todas las frecuencias', value: 'Todas' },
        { label: 'Diario 🔁', value: 'diario' },
        { label: 'Mediano Plazo (Semanas) 🗓️', value: 'semanal' },
        { label: 'Largo Plazo (Meses) 📅', value: 'mensual' },
      ],
    },
    {
      key: 'type',
      label: 'Tipo',
      options: [
        { label: 'Todos los tipos', value: 'Todas' },
        { label: 'Rutinas 🔁', value: 'Rutina' },
        { label: 'Hábitos simples 📝', value: 'Hábito' },
        { label: 'Pulsos ⚡', value: 'Pulso' },
      ],
    },
  ];

  return (
    <div className="animate-in fade-in flex flex-col gap-8 pb-16 pt-6 px-6 md:px-10 max-w-4xl mx-auto xl:mx-0 xl:max-w-none w-full text-left bg-transparent relative z-10">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full mb-2 gap-4 relative z-50">
        {/* Left Side: Filters, Sort, GroupBy */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            configs={filterConfigs}
            activeFilters={{
              area: filterArea,
              ...(availableSubCategories.length > 0 ? { subCategory: filterSubCategory } : {}),
              frequency: filterFrequency,
              type: filterType,
            }}
            onChange={(key, val) => {
              if (key === 'area') {
                setFilterArea(val);
                setFilterSubCategory('Todas');
              }
              if (key === 'subCategory') setFilterSubCategory(val);
              if (key === 'frequency') setFilterFrequency(val);
              if (key === 'type') setFilterType(val);
            }}
          />
          <SortDropdown
            align="left"
            options={[
              { label: 'Manual', value: 'manual' },
              { label: 'Prioridad', value: 'priority' },
              { label: 'Fecha', value: 'date' },
              { label: 'Nombre', value: 'name' },
            ]}
            currentValue={sortBy}
            onChange={val => setSortBy(val as any)}
          />
          <GroupDropdown
            align="left"
            options={[
              { label: 'Por tipo', value: 'type' },
              { label: 'Por área', value: 'area' },
            ]}
            currentValue={groupBy}
            defaultValue="type"
            onChange={val => setGroupBy(val as 'type' | 'area')}
          />
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center justify-end gap-4 font-sans text-[10px] uppercase tracking-widest font-bold">
          <button
            onClick={() => {
              setShowAddRoutine(!showAddRoutine);
              setShowAddHabit(false);
              setShowAddPulso(false);
            }}
            className={cn('hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors', showAddRoutine ? 'text-accent font-black' : 'text-text-main hover:text-text-dim')}
          >
            {showAddRoutine ? 'Cerrar' : '+ Nueva Rutina'}
          </button>
          <button
            onClick={() => {
              setShowAddHabit(!showAddHabit);
              setShowAddRoutine(false);
              setShowAddPulso(false);
            }}
            className={cn('hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors', showAddHabit ? 'text-accent font-black' : 'text-text-main hover:text-text-dim')}
          >
            {showAddHabit ? 'Cerrar' : '+ Hábito Simple'}
          </button>
          <button
            onClick={() => {
              setShowAddPulso(!showAddPulso);
              setShowAddRoutine(false);
              setShowAddHabit(false);
            }}
            className={cn('hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors', showAddPulso ? 'text-accent font-black' : 'text-text-main hover:text-text-dim')}
          >
            {showAddPulso ? 'Cerrar' : '+ Nuevo Pulso'}
          </button>
        </div>
      </div>

      {/* Collapsible Create Forms */}
      {showAddRoutine && (
        <div className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 rounded-2xl">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Contenedor de Rutina</h4>
          <UniversalItemForm
            defaultType="Rutina"
            config={config}
            allTasks={tasks}
            onSave={newTaskData => {
              onAddTask({
                userId: 'placeholder',
                text: newTaskData.text || 'Sin título',
                type: newTaskData.type || 'Rutina',
                completed: false,
                createdAt: new Date().toISOString(),
                ...newTaskData,
              });
              setShowAddRoutine(false);
            }}
            onCancel={() => setShowAddRoutine(false)}
          />
        </div>
      )}

      {showAddHabit && (
        <div className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 rounded-2xl">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Nuevo Hábito Recurrente</h4>
          <UniversalItemForm
            defaultType="Hábito"
            config={config}
            allTasks={tasks}
            onSave={newTaskData => {
              onAddTask({
                userId: 'placeholder',
                text: newTaskData.text || 'Sin título',
                type: newTaskData.type || 'Hábito',
                completed: false,
                createdAt: new Date().toISOString(),
                ...newTaskData,
              });
              setShowAddHabit(false);
            }}
            onCancel={() => setShowAddHabit(false)}
          />
        </div>
      )}

      {showAddPulso && (
        <div className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200 rounded-2xl">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Nuevo Pulso Diario</h4>
          <UniversalItemForm
            defaultType="Pulso"
            config={config}
            allTasks={tasks}
            onSave={newTaskData => {
              onAddTask({
                userId: 'placeholder',
                text: newTaskData.text || 'Sin título',
                type: newTaskData.type || 'Pulso',
                completed: false,
                createdAt: new Date().toISOString(),
                ...newTaskData,
              });
              setShowAddPulso(false);
            }}
            onCancel={() => setShowAddPulso(false)}
          />
        </div>
      )}

      {groupBy === 'area' ? (
        <div className="flex flex-col gap-6">
          {areaGroupedData.length === 0 ? (
            <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
              No hay rutinas, hábitos o pulsos que coincidan con los filtros actuales.
            </p>
          ) : (
            areaGroupedData.map(areaGroup => {
              const isAreaOpen = !collapsedAreas[areaGroup.key];
              return (
                <section key={areaGroup.key} className="border-b border-border-line/40 pb-6 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setCollapsedAreas(prev => ({ ...prev, [areaGroup.key]: isAreaOpen }))}
                    aria-expanded={isAreaOpen}
                    className="w-full flex items-center justify-between pb-2 cursor-pointer border-0 bg-transparent text-left border-b border-border-line/30"
                  >
                    <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-text-main font-bold">
                      {isAreaOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-dim" /> : <ChevronRight className="w-3.5 h-3.5 text-text-dim" />}
                      {areaGroup.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-dim">{areaGroup.total}</span>
                  </button>

                  {isAreaOpen && (
                    <div className="mt-4 flex flex-col gap-5 pl-2 md:pl-4">
                      {areaGroup.subGroups.map(subGroup => (
                        <div key={subGroup.key} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {subGroup.key !== '__none__' && areaGroup.key !== 'Sin Área' ? (
                              <CategoryBadge area={areaGroup.key} subCategory={subGroup.label} config={config} hideArea />
                            ) : (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{subGroup.label}</span>
                            )}
                          </div>
                          {subGroup.routines.map(routine => renderRoutineCard(routine, areaGroup.subGroups.flatMap(g => g.routines)))}
                          {subGroup.habits.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {subGroup.habits.map(renderStandaloneHabitCard)}
                            </div>
                          )}
                          {subGroup.pulsos.length > 0 && (
                            <div className="flex flex-wrap gap-y-3 w-full pt-1">
                              {subGroup.pulsos.map(renderPulsoCard)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] xl:gap-8">
          {/* ROUTINES LIST */}
          <div className="mb-6 min-w-0">
            <div
              onClick={() => setIsRoutinesOpen(!isRoutinesOpen)}
              className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
            >
              <div className="flex items-center gap-2">
                {isRoutinesOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                )}
                <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
                  Rutinas Activas
                </span>
              </div>
            </div>

            {isRoutinesOpen && (
              <div className="mt-4 animate-in fade-in duration-200 flex flex-col gap-2">
                {routines.length === 0 ? (
                  <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                    No hay rutinas activas.
                  </p>
                ) : (
                  routines.map(routine => renderRoutineCard(routine, routines))
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 xl:border-l xl:border-border-line/40 xl:pl-8">
            {/* STATS DE HABITOS SUELTOS */}
            <div className="mb-6">
              <div
                onClick={() => setIsHabitsOpen(!isHabitsOpen)}
                className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
              >
                <div className="flex items-center gap-2">
                  {isHabitsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                  )}
                  <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
                    Hábitos Individuales
                  </span>
                </div>
              </div>

              {isHabitsOpen && (
                <div className="mt-4 animate-in fade-in duration-200">
                  {standaloneHabits.length === 0 ? (
                    <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                      Sin hábitos individuales.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {standaloneHabits.map(renderStandaloneHabitCard)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PULSOS DIARIOS */}
            <div className="mb-6">
              <div
                onClick={() => setIsPulsosOpen(!isPulsosOpen)}
                className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
              >
                <div className="flex items-center gap-2">
                  {isPulsosOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                  )}
                  <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
                    Pulsos Diarios
                  </span>
                </div>
              </div>

              {isPulsosOpen && (
                <div className="mt-4 animate-in fade-in duration-200">
                  {pulsos.length === 0 ? (
                    <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                      Sin pulsos diarios en la lista general.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-y-3 w-full">
                      {pulsos.map(renderPulsoCard)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
