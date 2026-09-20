import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Repeat,
  Layers,
  Sparkles,
  Target,
  ArrowRight,
  Eye,
  Check,
  X,
  Compass,
  Clock,
  BookOpen,
  CheckSquare
} from 'lucide-react';
import { Config, AppTask, HistoryRecord, Intention, IntentionItem, IntentionScale } from '../types';
import { cn } from '../lib/utils';
import { formatLocalDate, parseLocalDate, findIntentionForPeriod } from '../domain/periodUtils';
import { getHistoryDateKey, getProjectForTask } from '../domain/workTracking';
import DedicationChart from './DedicationChart';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  intentions: Intention[];
  onAddIntention: (intention: Omit<Intention, 'id'>) => void;
  onUpdateIntention: (id: string, updates: Partial<Intention>) => void;
  onDeleteIntention: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<AppTask>) => void;
  onAddTask?: (task: Omit<AppTask, 'id'>) => void;
}

interface QuarterInfo {
  key: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;
  start: string;
  end: string;
  months: { name: string; monthIdx: number; start: string; end: string }[];
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function IntencionesPanelView({
  config,
  tasks,
  history,
  intentions,
  onAddIntention,
  onUpdateIntention,
  onDeleteIntention,
  onAddTask,
}: Props) {
  const [activeMobileTab, setActiveMobileTab] = useState<'intenciones' | 'dedicacion'>('intenciones');

  // Derive Current Date & Year
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);
  const currentYear = today.getFullYear();

  // Define the Year Range
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // Define the 4 Quarters and their months
  const quarters: QuarterInfo[] = useMemo(() => {
    return [
      {
        key: 'Q1',
        label: `Q1 ${currentYear}`,
        start: `${currentYear}-01-01`,
        end: `${currentYear}-03-31`,
        months: [
          { name: 'Enero', monthIdx: 0, start: `${currentYear}-01-01`, end: `${currentYear}-01-31` },
          { name: 'Febrero', monthIdx: 1, start: `${currentYear}-02-01`, end: `${currentYear}-02-${currentYear % 4 === 0 ? 29 : 28}` },
          { name: 'Marzo', monthIdx: 2, start: `${currentYear}-03-01`, end: `${currentYear}-03-31` },
        ]
      },
      {
        key: 'Q2',
        label: `Q2 ${currentYear}`,
        start: `${currentYear}-04-01`,
        end: `${currentYear}-06-30`,
        months: [
          { name: 'Abril', monthIdx: 3, start: `${currentYear}-04-01`, end: `${currentYear}-04-30` },
          { name: 'Mayo', monthIdx: 4, start: `${currentYear}-05-01`, end: `${currentYear}-05-31` },
          { name: 'Junio', monthIdx: 5, start: `${currentYear}-06-01`, end: `${currentYear}-06-30` },
        ]
      },
      {
        key: 'Q3',
        label: `Q3 ${currentYear}`,
        start: `${currentYear}-07-01`,
        end: `${currentYear}-09-30`,
        months: [
          { name: 'Julio', monthIdx: 6, start: `${currentYear}-07-01`, end: `${currentYear}-07-31` },
          { name: 'Agosto', monthIdx: 7, start: `${currentYear}-08-01`, end: `${currentYear}-08-31` },
          { name: 'Septiembre', monthIdx: 8, start: `${currentYear}-09-01`, end: `${currentYear}-09-30` },
        ]
      },
      {
        key: 'Q4',
        label: `Q4 ${currentYear}`,
        start: `${currentYear}-10-01`,
        end: `${currentYear}-12-31`,
        months: [
          { name: 'Octubre', monthIdx: 9, start: `${currentYear}-10-01`, end: `${currentYear}-10-31` },
          { name: 'Noviembre', monthIdx: 10, start: `${currentYear}-11-01`, end: `${currentYear}-11-30` },
          { name: 'Diciembre', monthIdx: 11, start: `${currentYear}-12-01`, end: `${currentYear}-12-31` },
        ]
      },
    ];
  }, [currentYear]);

  // Identify current active quarter and month
  const currentQKey = useMemo(() => {
    const m = today.getMonth();
    if (m <= 2) return 'Q1';
    if (m <= 5) return 'Q2';
    if (m <= 8) return 'Q3';
    return 'Q4';
  }, [today]);

  const currentMonthIdx = today.getMonth();

  // Accordion open/close state
  const [yearExpanded, setYearExpanded] = useState(true);
  const [expandedQuarters, setExpandedQuarters] = useState<Record<string, boolean>>({
    [currentQKey]: true
  });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [MONTH_NAMES_ES[currentMonthIdx]]: true
  });

  // Selected period for DedicationChart & right column
  const currentQuarterInfo = quarters.find(q => q.key === currentQKey)!;
  const [selectedPeriod, setSelectedPeriod] = useState<{
    scale: IntentionScale;
    start: string;
    end: string;
    label: string;
  }>({
    scale: 'quarter',
    start: currentQuarterInfo.start,
    end: currentQuarterInfo.end,
    label: currentQuarterInfo.label
  });

  // Helper to get or save an intention for a period
  const getIntention = (scale: IntentionScale, start: string, end: string) => {
    return findIntentionForPeriod(intentions, scale, start, end);
  };

  const handleUpdateTheme = (scale: IntentionScale, start: string, end: string, newTheme: string) => {
    const existing = getIntention(scale, start, end);
    if (existing) {
      onUpdateIntention(existing.id, { theme: newTheme, updatedAt: new Date().toISOString() });
    } else {
      onAddIntention({
        userId: 'default_user',
        scale,
        periodStart: start,
        periodEnd: end,
        theme: newTheme,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleAddItemToQuarter = (quarterStart: string, quarterEnd: string, newItem: IntentionItem) => {
    const existing = getIntention('quarter', quarterStart, quarterEnd);
    if (existing) {
      onUpdateIntention(existing.id, {
        items: [...existing.items, newItem],
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddIntention({
        userId: 'default_user',
        scale: 'quarter',
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        items: [newItem],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleDeleteItemFromQuarter = (quarterStart: string, quarterEnd: string, itemId: string) => {
    const existing = getIntention('quarter', quarterStart, quarterEnd);
    if (!existing) return;
    onUpdateIntention(existing.id, {
      items: existing.items.filter(i => i.id !== itemId),
      updatedAt: new Date().toISOString()
    });
  };

  const handleUpdateItemInQuarter = (quarterStart: string, quarterEnd: string, itemId: string, updates: Partial<IntentionItem>) => {
    const existing = getIntention('quarter', quarterStart, quarterEnd);
    if (!existing) return;
    onUpdateIntention(existing.id, {
      items: existing.items.map(i => i.id === itemId ? { ...i, ...updates } : i),
      updatedAt: new Date().toISOString()
    });
  };

  // State for Add Commitment Form modal/inline
  const [addingCommitmentQ, setAddingCommitmentQ] = useState<string | null>(null);
  const [commitmentType, setCommitmentType] = useState<'routine_habit' | 'hours' | 'counter' | 'milestone'>('routine_habit');

  // Routine / Habit
  const [selectedRoutineHabitId, setSelectedRoutineHabitId] = useState<string>('');
  const [routineTargetPercent, setRoutineTargetPercent] = useState<number>(80);

  // Hours
  const [hoursTargetKind, setHoursTargetKind] = useState<'area' | 'project' | 'task'>('area');
  const [selectedHoursTargetId, setSelectedHoursTargetId] = useState<string>('');
  const [hoursPacing, setHoursPacing] = useState<'weekly' | 'total'>('weekly');
  const [hoursValue, setHoursValue] = useState<number>(4);

  // Counter
  const [counterTaskId, setCounterTaskId] = useState<string>('');
  const [counterName, setCounterName] = useState<string>('');
  const [counterTarget, setCounterTarget] = useState<number>(500);
  const [counterUnit, setCounterUnit] = useState<string>('páginas');
  const [isCreatingNewCounterTask, setIsCreatingNewCounterTask] = useState<boolean>(false);
  const [newCounterTaskCategory, setNewCounterTaskCategory] = useState<string>('MIND');

  // Milestone
  const [milestoneKind, setMilestoneKind] = useState<'standalone_task' | 'project_milestone' | 'project_complete'>('standalone_task');
  const [selectedMilestoneTaskId, setSelectedMilestoneTaskId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // State for logging pages on counter cards
  const [loggingPagesItemId, setLoggingPagesItemId] = useState<string | null>(null);
  const [pagesToAdd, setPagesToAdd] = useState<number>(10);

  const areaNames = useMemo(() => Object.keys(config?.areas || {}), [config]);
  const routines = useMemo(() => tasks.filter(t => t.type === 'Rutina'), [tasks]);
  const standaloneHabits = useMemo(() => tasks.filter(t => t.type === 'Hábito' && !t.parentId), [tasks]);
  const allHabitsAndRoutines = useMemo(() => [
    ...routines.map(r => ({ id: r.id, text: r.text, category: r.category, typeLabel: 'Rutina' })),
    ...tasks.filter(t => t.type === 'Hábito').map(h => ({ id: h.id, text: h.text, category: h.category, typeLabel: 'Hábito' }))
  ], [routines, tasks]);
  const projects = useMemo(() => tasks.filter(t => t.type === 'Proyecto'), [tasks]);
  const standaloneTasks = useMemo(() => tasks.filter(t => t.type === 'Tarea' && !t.parentId), [tasks]);
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(t => t.parentId === selectedProjectId);
  }, [tasks, selectedProjectId]);
  const trackableTasks = useMemo(() => tasks.filter(t => t.type === 'Tarea' || t.type === 'Hábito'), [tasks]);

  const submitNewCommitment = (q: QuarterInfo) => {
    let newItem: IntentionItem | null = null;

    if (commitmentType === 'routine_habit') {
      const targetId = selectedRoutineHabitId || allHabitsAndRoutines[0]?.id;
      if (!targetId) return;
      const targetTask = tasks.find(t => t.id === targetId);
      newItem = {
        id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        targetType: 'consistency',
        taskId: targetId,
        areaName: targetTask?.category || 'General',
        targetPercent: routineTargetPercent || 80,
      };
    } else if (commitmentType === 'hours') {
      if (hoursTargetKind === 'area') {
        const area = selectedHoursTargetId || areaNames[0] || 'General';
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'hours',
          areaName: area,
          hoursPacing,
          weeklyHours: hoursPacing === 'weekly' ? (hoursValue || 4) : undefined,
          targetHours: hoursPacing === 'total' ? (hoursValue || 50) : undefined,
        };
      } else if (hoursTargetKind === 'project') {
        const projId = selectedHoursTargetId || projects[0]?.id;
        if (!projId) return;
        const proj = projects.find(p => p.id === projId);
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'hours',
          projectId: projId,
          areaName: proj?.category || 'General',
          hoursPacing,
          weeklyHours: hoursPacing === 'weekly' ? (hoursValue || 4) : undefined,
          targetHours: hoursPacing === 'total' ? (hoursValue || 50) : undefined,
        };
      } else {
        const taskId = selectedHoursTargetId || trackableTasks[0]?.id;
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'hours',
          taskId: taskId,
          areaName: task?.category || 'General',
          hoursPacing,
          weeklyHours: hoursPacing === 'weekly' ? (hoursValue || 4) : undefined,
          targetHours: hoursPacing === 'total' ? (hoursValue || 50) : undefined,
        };
      }
    } else if (commitmentType === 'counter') {
      let finalTaskId = counterTaskId;
      let finalTitle = counterName.trim();

      if (isCreatingNewCounterTask && onAddTask && finalTitle) {
        const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        onAddTask({
          userId: 'default_user',
          text: finalTitle,
          type: 'Hábito',
          category: newCounterTaskCategory || 'MIND',
          completed: false,
          createdAt: new Date().toISOString()
        });
        finalTaskId = newTaskId;
      }

      const linkedTask = tasks.find(t => t.id === finalTaskId);
      if (!finalTitle && linkedTask) {
        finalTitle = linkedTask.text;
      }

      newItem = {
        id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        targetType: 'counter',
        taskId: finalTaskId || undefined,
        counterName: finalTitle || 'Contador',
        currentCount: 0,
        targetCount: counterTarget || 500,
        unitLabel: counterUnit.trim() || 'páginas',
        areaName: linkedTask?.category || newCounterTaskCategory || 'General',
      };
    } else if (commitmentType === 'milestone') {
      if (milestoneKind === 'standalone_task') {
        const taskId = selectedMilestoneTaskId || standaloneTasks[0]?.id;
        if (!taskId) return;
        const task = tasks.find(t => t.id === taskId);
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'completion',
          taskId: taskId,
          areaName: task?.category || 'General',
        };
      } else if (milestoneKind === 'project_milestone') {
        const projId = selectedProjectId || projects[0]?.id;
        const taskId = selectedMilestoneTaskId || projectTasks[0]?.id;
        if (!projId || !taskId) return;
        const proj = projects.find(p => p.id === projId);
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'completion',
          projectId: projId,
          taskId: taskId,
          areaName: proj?.category || 'General',
        };
      } else {
        const projId = selectedProjectId || projects[0]?.id;
        if (!projId) return;
        const proj = projects.find(p => p.id === projId);
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'completion',
          projectId: projId,
          areaName: proj?.category || 'General',
        };
      }
    }

    if (!newItem) return;

    handleAddItemToQuarter(q.start, q.end, newItem);
    setAddingCommitmentQ(null);
    setSelectedRoutineHabitId('');
    setSelectedHoursTargetId('');
    setCounterTaskId('');
    setCounterName('');
    setIsCreatingNewCounterTask(false);
    setSelectedMilestoneTaskId('');
    setSelectedProjectId('');
  };

  // Calculation helpers for real-time progress of commitments
  const calculateCommitmentProgress = (item: IntentionItem, periodStart: string, periodEnd: string) => {
    if (item.targetType === 'consistency') {
      const relevantHistory = history.filter(h => {
        const d = getHistoryDateKey(h);
        if (d < periodStart || d > periodEnd) return false;
        if (item.taskId && h.taskId === item.taskId) return true;
        // Check if history record is for a child habit of this routine
        const orig = tasks.find(t => t.id === h.taskId);
        return orig && orig.parentId === item.taskId;
      });

      const uniqueDays = new Set(relevantHistory.map(getHistoryDateKey)).size;

      // Calculate days elapsed in period up to today
      const s = parseLocalDate(periodStart);
      const e = parseLocalDate(periodEnd);
      const now = new Date();
      const effectiveEnd = now < e ? now : e;
      const totalDaysElapsed = Math.max(1, Math.round((effectiveEnd.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const actualPercent = Math.min(100, Math.round((uniqueDays / totalDaysElapsed) * 100));
      const targetPercent = item.targetPercent ?? 80;
      return {
        current: actualPercent,
        target: targetPercent,
        unit: '%',
        label: `${actualPercent}% consistencia (${uniqueDays} de ${totalDaysElapsed} días)`,
        percentProgress: Math.min(100, Math.round((actualPercent / targetPercent) * 100)),
        isDone: actualPercent >= targetPercent
      };
    }

    if (item.targetType === 'hours') {
      let taskIds: string[] = [];
      if (item.taskId) {
        taskIds = [item.taskId];
      } else if (item.projectId) {
        taskIds = [item.projectId, ...tasks.filter(t => t.parentId === item.projectId).map(t => t.id)];
      } else if (item.areaName) {
        taskIds = tasks.filter(t => t.category === item.areaName).map(t => t.id);
      }

      const relevantHistory = history.filter(h => {
        const d = getHistoryDateKey(h);
        return (
          taskIds.includes(h.taskId) &&
          d >= periodStart &&
          d <= periodEnd &&
          h.duration !== undefined &&
          h.duration > 0
        );
      });

      const totalHours = relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0);

      if (item.hoursPacing === 'weekly' && item.weeklyHours) {
        const s = parseLocalDate(periodStart);
        const e = parseLocalDate(periodEnd);
        const totalDays = Math.max(7, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const totalWeeks = Math.max(1, Math.round(totalDays / 7));
        const targetTotalHours = item.weeklyHours * totalWeeks;

        const now = new Date();
        const effectiveEnd = now < e ? now : e;
        const elapsedDays = Math.max(1, Math.round((effectiveEnd.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const elapsedWeeks = Math.max(1, elapsedDays / 7);
        const currentWeeklyAvg = totalHours / elapsedWeeks;

        const percentProgress = targetTotalHours > 0 ? Math.min(100, Math.round((totalHours / targetTotalHours) * 100)) : 0;
        return {
          current: totalHours,
          target: targetTotalHours,
          unit: 'h',
          label: `${totalHours.toFixed(1)} h (${currentWeeklyAvg.toFixed(1)} h/sem, meta: ${item.weeklyHours} h/sem)`,
          percentProgress,
          isDone: totalHours >= targetTotalHours
        };
      } else {
        const targetHours = item.targetHours || 50;
        const percentProgress = targetHours > 0 ? Math.min(100, Math.round((totalHours / targetHours) * 100)) : 0;
        return {
          current: totalHours,
          target: targetHours,
          unit: 'h',
          label: `${totalHours.toFixed(1)} de ${targetHours} h dedicadas`,
          percentProgress,
          isDone: totalHours >= targetHours
        };
      }
    }

    if (item.targetType === 'counter') {
      const current = item.currentCount || 0;
      const target = item.targetCount || 500;
      const unit = item.unitLabel || 'páginas';
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      let hoursSpent = 0;
      if (item.taskId) {
        const relevantHistory = history.filter(h => {
          const d = getHistoryDateKey(h);
          return (
            h.taskId === item.taskId &&
            d >= periodStart &&
            d <= periodEnd &&
            h.duration !== undefined &&
            h.duration > 0
          );
        });
        hoursSpent = relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
      }

      return {
        current,
        target,
        unit,
        hoursSpent,
        label: `${current} / ${target} ${unit}${hoursSpent > 0 ? ` · ${hoursSpent.toFixed(1)} h dedicadas` : ''}`,
        percentProgress: percent,
        isDone: current >= target
      };
    }

    if (item.targetType === 'completion') {
      if (item.taskId) {
        // Milestone / Standalone task
        const task = tasks.find(t => t.id === item.taskId);
        const isDone = !!task?.completed;
        return {
          current: isDone ? 1 : 0,
          target: 1,
          unit: '',
          label: isDone ? 'Completado' : 'Pendiente',
          percentProgress: isDone ? 100 : 0,
          isDone
        };
      } else if (item.projectId) {
        // Whole Project
        const subtasks = tasks.filter(t => t.parentId === item.projectId);
        const completed = subtasks.filter(t => t.completed).length;
        const total = subtasks.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          current: completed,
          target: total,
          unit: 'tareas',
          label: total > 0 ? `${completed}/${total} tareas (${percent}%)` : 'Sin subtareas',
          percentProgress: percent,
          isDone: total > 0 && completed === total
        };
      }
    }

    return { current: 0, target: 1, unit: '', label: 'Sin datos', percentProgress: 0, isDone: false };
  };

  // Year intention
  const yearIntention = getIntention('year', yearStart, yearEnd);

  return (
    <div className="space-y-8 pb-20">
      {/* Mobile Segmented Toggle (Sticky) */}
      <div className="lg:hidden sticky top-0 z-20 bg-base/95 backdrop-blur-sm pt-2 pb-3 border-b border-border-line/30">
        <div className="flex bg-base-dim/20 p-0.5 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setActiveMobileTab('intenciones')}
            className={cn(
              "flex-1 py-1.5 text-xs font-sans tracking-wide transition-all",
              activeMobileTab === 'intenciones'
                ? "bg-base text-text-main font-medium border-b border-text-main"
                : "text-text-dim hover:text-text-main"
            )}
          >
            Intenciones
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('dedicacion')}
            className={cn(
              "flex-1 py-1.5 text-xs font-sans tracking-wide transition-all",
              activeMobileTab === 'dedicacion'
                ? "bg-base text-text-main font-medium border-b border-text-main"
                : "text-text-dim hover:text-text-main"
            )}
          >
            Dedicación Real
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop, completely open without boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full">
        {/* LEFT COLUMN: The Hierarchical Intention Tree (Open Notebook) */}
        <div className={cn(
          "space-y-8 lg:col-span-7",
          activeMobileTab === 'dedicacion' ? "hidden lg:block" : "block"
        )}>
          {/* LEVEL 1: YEAR SECTION (Open) */}
          <div className="space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer group select-none py-1"
              onClick={() => setYearExpanded(!yearExpanded)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 flex items-center justify-center text-text-dim group-hover:text-text-main transition-colors">
                  {yearExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-main font-medium">
                      Año {currentYear}
                    </span>
                    <span className="text-[10px] font-mono text-text-dim px-1.5 py-0.2 bg-base-dim/30">
                      Visión vital
                    </span>
                  </div>
                  <h2 className="text-base font-sans font-light text-text-main mt-0.5">
                    Norte estratégico y áreas prioritarias
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPeriod({
                    scale: 'year',
                    start: yearStart,
                    end: yearEnd,
                    label: `Año ${currentYear}`
                  });
                }}
                className={cn(
                  "px-2 py-0.5 text-xs font-sans flex items-center gap-1.5 transition-colors",
                  selectedPeriod.scale === 'year'
                    ? "text-text-main font-medium underline underline-offset-4"
                    : "text-text-dim hover:text-text-main"
                )}
                title="Ver dedicación del año en el panel lateral"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dedicación</span>
              </button>
            </div>

            {yearExpanded && (
              <div className="pl-6 space-y-6 pt-1">
                {/* Year Narrative Theme */}
                <div className="space-y-1">
                  <label className="text-xs font-sans text-text-dim flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-text-main/70" /> Norte narrativo del año
                  </label>
                  <textarea
                    defaultValue={yearIntention?.theme || ''}
                    onBlur={(e) => handleUpdateTheme('year', yearStart, yearEnd, e.target.value)}
                    placeholder="¿Cuál es la brújula o propósito central de este año? (ej. Año de consolidación, salud integral y ritmos sostenibles...)"
                    className="w-full bg-transparent border-b border-border-line/40 rounded-none p-2 text-sm font-sans text-text-main focus:outline-none focus:border-text-main transition-colors resize-none h-20 placeholder:text-text-dim/40 leading-relaxed"
                  />
                </div>

                {/* Panorama of the 4 Quarters: Open 4-column layout */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-sans text-text-dim">
                    Panorama de cuartos ({currentYear})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-1">
                    {quarters.map(q => {
                      const qIntention = getIntention('quarter', q.start, q.end);
                      const isCurrent = q.key === currentQKey;
                      const hasTheme = !!qIntention?.theme;
                      const itemsCount = qIntention?.items?.length || 0;
                      const items = qIntention?.items || [];
                      const doneCount = items.filter(it => calculateCommitmentProgress(it, q.start, q.end).isDone).length;
                      const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

                      return (
                        <div
                          key={q.key}
                          className="flex flex-col justify-between gap-1 text-left"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-medium text-text-main">{q.key}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim font-medium">
                                En curso
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-sans text-text-dim line-clamp-1 italic">
                            {hasTheme ? `"${qIntention.theme}"` : 'Sin definir'}
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-text-dim mt-1">
                            <span>{itemsCount} {itemsCount === 1 ? 'compromiso' : 'compromisos'}</span>
                            {itemsCount > 0 && <span>{pct}%</span>}
                          </div>
                          <div className="w-full bg-border-line/20 h-[1.5px] mt-1 overflow-hidden">
                            <div className="bg-text-main/60 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LEVEL 2: QUARTERS (Open Sections with Indentation) */}
          <div className="space-y-6 pt-2">
            <h3 className="text-xs font-sans text-text-dim border-b border-border-line/20 pb-2">
              Cuartos del año · Metas de 90 días
            </h3>

            {quarters.map(q => {
              const isCurrentQ = q.key === currentQKey;
              const isExpanded = !!expandedQuarters[q.key];
              const qIntention = getIntention('quarter', q.start, q.end);
              const items = qIntention?.items || [];
              const isSelectedForDedication = selectedPeriod.scale === 'quarter' && selectedPeriod.start === q.start;

              return (
                <div key={q.key} className="space-y-4">
                  {/* Quarter Header */}
                  <div
                    className="flex items-center justify-between cursor-pointer select-none py-1 group"
                    onClick={() => setExpandedQuarters(prev => ({ ...prev, [q.key]: !prev[q.key] }))}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 flex items-center justify-center text-text-dim group-hover:text-text-main transition-colors">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm text-text-main">{q.label}</span>
                          {isCurrentQ && (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim px-1.5 py-0.2 bg-base-dim/40 font-medium">
                              En curso
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-text-dim hidden sm:inline">
                            ({q.start.slice(5)} a {q.end.slice(5)})
                          </span>
                        </div>
                        {qIntention?.theme && (
                          <div className="text-xs font-sans text-text-dim italic mt-0.5 line-clamp-1">
                            "{qIntention.theme}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPeriod({
                            scale: 'quarter',
                            start: q.start,
                            end: q.end,
                            label: q.label
                          });
                        }}
                        className={cn(
                          "px-2 py-0.5 text-xs font-sans flex items-center gap-1 transition-colors",
                          isSelectedForDedication
                            ? "text-text-main font-medium underline underline-offset-4"
                            : "text-text-dim hover:text-text-main"
                        )}
                        title="Ver dedicación de este cuarto en el panel lateral"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dedicación</span>
                      </button>
                    </div>
                  </div>

                  {/* Quarter Content (Indented) */}
                  {isExpanded && (
                    <div className="pl-6 space-y-6 pt-1">
                      {/* Quarter Theme Input */}
                      <div className="space-y-1">
                        <label className="text-xs font-sans text-text-dim flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-text-main/70" /> Norte del cuarto ({q.key})
                        </label>
                        <input
                          type="text"
                          defaultValue={qIntention?.theme || ''}
                          onBlur={(e) => handleUpdateTheme('quarter', q.start, q.end, e.target.value)}
                          placeholder="Foco de este trimestre (ej. 90 días de consistencia en rutinas base y batchcooking)"
                          className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main transition-colors placeholder:text-text-dim/40"
                        />
                      </div>

                      {/* Quarter Commitments */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-text-main/70" />
                            <h4 className="text-xs font-sans font-medium text-text-main">
                              Compromisos del cuarto ({items.length})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingCommitmentQ(q.key);
                              setSelectedTaskId(routines[0]?.id || projects[0]?.id || '');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-sans text-text-dim hover:text-text-main cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Añadir compromiso
                          </button>
                        </div>

                        {/* Add Commitment Form (Open & Indented) */}
                        {addingCommitmentQ === q.key && (
                          <div className="py-3 space-y-4 animate-in fade-in duration-150 pl-2">
                            <div className="flex justify-between items-center border-b border-border-line/20 pb-2">
                              <span className="text-xs font-sans font-medium text-text-main">
                                Nuevo compromiso para {q.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => setAddingCommitmentQ(null)}
                                className="text-text-dim hover:text-text-main cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* 4 Tabs: Charcoal Underline style */}
                            <div className="flex border-b border-border-line/30 gap-6">
                              <button
                                type="button"
                                onClick={() => setCommitmentType('routine_habit')}
                                className={cn(
                                  "pb-2 text-xs font-sans transition-all flex items-center gap-1.5 cursor-pointer border-b-2",
                                  commitmentType === 'routine_habit'
                                    ? "border-text-main text-text-main font-medium"
                                    : "border-transparent text-text-dim hover:text-text-main"
                                )}
                              >
                                <Repeat className="w-3.5 h-3.5 text-text-main/70" /> Hábito / Rutina
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('hours')}
                                className={cn(
                                  "pb-2 text-xs font-sans transition-all flex items-center gap-1.5 cursor-pointer border-b-2",
                                  commitmentType === 'hours'
                                    ? "border-text-main text-text-main font-medium"
                                    : "border-transparent text-text-dim hover:text-text-main"
                                )}
                              >
                                <Clock className="w-3.5 h-3.5 text-text-main/70" /> Horas
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('counter')}
                                className={cn(
                                  "pb-2 text-xs font-sans transition-all flex items-center gap-1.5 cursor-pointer border-b-2",
                                  commitmentType === 'counter'
                                    ? "border-text-main text-text-main font-medium"
                                    : "border-transparent text-text-dim hover:text-text-main"
                                )}
                              >
                                <BookOpen className="w-3.5 h-3.5 text-text-main/70" /> Contador
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('milestone')}
                                className={cn(
                                  "pb-2 text-xs font-sans transition-all flex items-center gap-1.5 cursor-pointer border-b-2",
                                  commitmentType === 'milestone'
                                    ? "border-text-main text-text-main font-medium"
                                    : "border-transparent text-text-dim hover:text-text-main"
                                )}
                              >
                                <CheckSquare className="w-3.5 h-3.5 text-text-main/70" /> Hito / Proyecto
                              </button>
                            </div>

                            {/* Tab 1: Routine / Habit */}
                            {commitmentType === 'routine_habit' && (
                              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Rutina o Hábito</label>
                                  <select
                                    value={selectedRoutineHabitId || allHabitsAndRoutines[0]?.id || ''}
                                    onChange={(e) => setSelectedRoutineHabitId(e.target.value)}
                                    className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                  >
                                    <optgroup label="Rutinas">
                                      {routines.map(r => (
                                        <option key={r.id} value={r.id}>
                                          {r.text} ({r.category || 'Sin Área'})
                                        </option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Hábitos">
                                      {tasks.filter(t => t.type === 'Hábito').map(h => (
                                        <option key={h.id} value={h.id}>
                                          {h.text} ({h.category || 'Sin Área'})
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">
                                    Porcentaje Mínimo de Consistencia (%)
                                  </label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="number"
                                      min={10}
                                      max={100}
                                      step={5}
                                      value={routineTargetPercent}
                                      onChange={(e) => setRoutineTargetPercent(Number(e.target.value))}
                                      className="w-24 bg-transparent border-b border-border-line/40 rounded-none py-1 text-xs font-mono text-text-main focus:outline-none focus:border-text-main"
                                    />
                                    <span className="text-[11px] font-sans text-text-dim">
                                      (Meta de ritmo: cumplir al menos el {routineTargetPercent}% del período)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 2: Hours */}
                            {commitmentType === 'hours' && (
                              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">¿A qué vinculas el tiempo?</label>
                                  <div className="flex gap-4 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('area'); setSelectedHoursTargetId(areaNames[0] || ''); }}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        hoursTargetKind === 'area' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Área Vital
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('project'); setSelectedHoursTargetId(projects[0]?.id || ''); }}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        hoursTargetKind === 'project' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Proyecto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('task'); setSelectedHoursTargetId(trackableTasks[0]?.id || ''); }}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        hoursTargetKind === 'task' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Hábito / Tarea
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">
                                    {hoursTargetKind === 'area' ? 'Seleccionar Área' : hoursTargetKind === 'project' ? 'Seleccionar Proyecto' : 'Seleccionar Tarea o Hábito'}
                                  </label>
                                  {hoursTargetKind === 'area' && (
                                    <select
                                      value={selectedHoursTargetId || areaNames[0] || ''}
                                      onChange={(e) => setSelectedHoursTargetId(e.target.value)}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {areaNames.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                      ))}
                                    </select>
                                  )}
                                  {hoursTargetKind === 'project' && (
                                    <select
                                      value={selectedHoursTargetId || projects[0]?.id || ''}
                                      onChange={(e) => setSelectedHoursTargetId(e.target.value)}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.text} ({p.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  )}
                                  {hoursTargetKind === 'task' && (
                                    <select
                                      value={selectedHoursTargetId || trackableTasks[0]?.id || ''}
                                      onChange={(e) => setSelectedHoursTargetId(e.target.value)}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {trackableTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.text} ({t.type} · {t.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Modalidad de Meta</label>
                                    <select
                                      value={hoursPacing}
                                      onChange={(e) => {
                                        const p = e.target.value as 'weekly' | 'total';
                                        setHoursPacing(p);
                                        setHoursValue(p === 'weekly' ? 4 : 50);
                                      }}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      <option value="weekly">Ritmo semanal (h/sem)</option>
                                      <option value="total">Total en el período (h)</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">
                                      {hoursPacing === 'weekly' ? 'Horas por semana' : 'Horas totales'}
                                    </label>
                                    <input
                                      type="number"
                                      min={0.5}
                                      step={0.5}
                                      value={hoursValue}
                                      onChange={(e) => setHoursValue(Number(e.target.value))}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1 text-xs font-mono text-text-main focus:outline-none focus:border-text-main"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 3: Counter (Books, Pages, Modules) */}
                            {commitmentType === 'counter' && (
                              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">
                                      Tarea / Hábito asociado (para activar timer ⏱️)
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setIsCreatingNewCounterTask(!isCreatingNewCounterTask)}
                                      className="text-[10px] font-mono text-text-dim hover:text-text-main cursor-pointer underline"
                                    >
                                      {isCreatingNewCounterTask ? "Elegir existente" : "+ Crear nueva tarea"}
                                    </button>
                                  </div>

                                  {isCreatingNewCounterTask ? (
                                    <div className="space-y-2 py-1">
                                      <input
                                        type="text"
                                        placeholder="Nombre del libro o actividad (ej. Leer 'El infinito en un junco')"
                                        value={counterName}
                                        onChange={(e) => setCounterName(e.target.value)}
                                        className="w-full bg-transparent border-b border-border-line/40 pb-1 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                      />
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-text-dim uppercase">Área:</span>
                                        <select
                                          value={newCounterTaskCategory}
                                          onChange={(e) => setNewCounterTaskCategory(e.target.value)}
                                          className="bg-transparent border-b border-border-line/30 px-1 py-0.5 text-xs font-mono text-text-main"
                                        >
                                          {areaNames.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  ) : (
                                    <select
                                      value={counterTaskId || trackableTasks[0]?.id || ''}
                                      onChange={(e) => {
                                        setCounterTaskId(e.target.value);
                                        const t = tasks.find(task => task.id === e.target.value);
                                        if (t) setCounterName(t.text);
                                      }}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {trackableTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.text} ({t.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Meta Cuantitativa Total</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={counterTarget}
                                      onChange={(e) => setCounterTarget(Number(e.target.value))}
                                      placeholder="500"
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1 text-xs font-mono text-text-main focus:outline-none focus:border-text-main"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Unidad de Medida</label>
                                    <input
                                      type="text"
                                      value={counterUnit}
                                      onChange={(e) => setCounterUnit(e.target.value)}
                                      placeholder="páginas, capítulos, etc."
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 4: Milestone / Project */}
                            {commitmentType === 'milestone' && (
                              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">Tipo de Meta</label>
                                  <div className="flex gap-4 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('standalone_task')}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        milestoneKind === 'standalone_task' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Tarea Suelta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('project_milestone')}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        milestoneKind === 'project_milestone' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Hito de Proyecto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('project_complete')}
                                      className={cn(
                                        "text-xs font-sans pb-1 transition-all cursor-pointer border-b",
                                        milestoneKind === 'project_complete' ? "border-text-main font-medium text-text-main" : "border-transparent text-text-dim hover:text-text-main"
                                      )}
                                    >
                                      Proyecto Entero
                                    </button>
                                  </div>
                                </div>

                                {milestoneKind === 'standalone_task' && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Tarea Suelta</label>
                                    <select
                                      value={selectedMilestoneTaskId || standaloneTasks[0]?.id || ''}
                                      onChange={(e) => setSelectedMilestoneTaskId(e.target.value)}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {standaloneTasks.map(t => (
                                        <option key={t.id} value={t.id}>
                                          {t.text} ({t.category || 'Sin Área'}) {t.completed ? '✓' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {milestoneKind === 'project_milestone' && (
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Proyecto</label>
                                      <select
                                        value={selectedProjectId || projects[0]?.id || ''}
                                        onChange={(e) => {
                                          setSelectedProjectId(e.target.value);
                                          setSelectedMilestoneTaskId('');
                                        }}
                                        className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                      >
                                        {projects.map(p => (
                                          <option key={p.id} value={p.id}>{p.text} ({p.category || 'Sin Área'})</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-mono text-text-dim uppercase">Tarea Clave / Hito del Proyecto</label>
                                      <select
                                        value={selectedMilestoneTaskId || projectTasks[0]?.id || ''}
                                        onChange={(e) => setSelectedMilestoneTaskId(e.target.value)}
                                        className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                      >
                                        {projectTasks.map(m => (
                                          <option key={m.id} value={m.id}>
                                            {m.text} {m.completed ? '(Completada)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {milestoneKind === 'project_complete' && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Proyecto</label>
                                    <select
                                      value={selectedProjectId || projects[0]?.id || ''}
                                      onChange={(e) => setSelectedProjectId(e.target.value)}
                                      className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-text-main"
                                    >
                                      {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.text} ({p.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setAddingCommitmentQ(null)}
                                className="px-3 py-1 text-xs font-sans text-text-dim hover:text-text-main cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => submitNewCommitment(q)}
                                className="px-3 py-1 bg-text-main text-base text-xs font-sans font-medium hover:bg-text-main/90 transition-colors cursor-pointer"
                              >
                                Guardar compromiso
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of Commitments (Open Rows) */}
                        {items.length === 0 ? (
                          <div className="py-3 text-xs font-sans text-text-dim italic">
                            No has definido compromisos para {q.key}.
                          </div>
                        ) : (
                          <div className="space-y-3 pt-1">
                            {items.map(item => {
                              const prog = calculateCommitmentProgress(item, q.start, q.end);
                              const taskObj = tasks.find(t => t.id === (item.taskId || item.projectId));
                              const title = item.counterName || taskObj?.text || item.areaName || 'Compromiso';

                              let icon = <Repeat className="w-3.5 h-3.5 text-text-main/70" />;
                              if (item.targetType === 'hours') {
                                icon = <Clock className="w-3.5 h-3.5 text-text-main/70" />;
                              } else if (item.targetType === 'counter') {
                                icon = <BookOpen className="w-3.5 h-3.5 text-text-main/70" />;
                              } else if (item.targetType === 'completion') {
                                icon = item.projectId && !item.taskId ? <Layers className="w-3.5 h-3.5 text-text-main/70" /> : <CheckSquare className="w-3.5 h-3.5 text-text-main/70" />;
                              }

                              return (
                                <div
                                  key={item.id}
                                  className="space-y-1.5 py-1 group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="text-text-main/70">
                                        {icon}
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium text-text-main">
                                          {title}
                                        </div>
                                        <div className="text-[10px] font-mono text-text-dim">
                                          {prog.label}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {prog.isDone ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-600 font-medium">
                                          <Check className="w-3 h-3" /> Cumplido
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-mono text-text-dim">
                                          {prog.percentProgress}%
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItemFromQuarter(q.start, q.end, item.id)}
                                        className="text-text-dim/40 hover:text-red-500 p-1 transition-colors cursor-pointer"
                                        title="Eliminar compromiso"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Counter quick-log action */}
                                  {item.targetType === 'counter' && (
                                    <div className="pt-0.5">
                                      {loggingPagesItemId === item.id ? (
                                        <div className="flex items-center gap-2 py-1">
                                          <span className="text-[10px] font-mono text-text-dim">Sumar:</span>
                                          <input
                                            type="number"
                                            value={pagesToAdd}
                                            onChange={(e) => setPagesToAdd(Number(e.target.value))}
                                            className="w-14 bg-transparent border-b border-border-line/40 px-1 py-0.5 text-xs font-mono text-text-main focus:outline-none focus:border-text-main"
                                          />
                                          <span className="text-[10px] font-mono text-text-dim">{item.unitLabel || 'páginas'}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newCount = (item.currentCount || 0) + pagesToAdd;
                                              handleUpdateItemInQuarter(q.start, q.end, item.id, { currentCount: newCount });
                                              setLoggingPagesItemId(null);
                                            }}
                                            className="px-2 py-0.5 bg-text-main text-base text-[10px] font-mono font-medium cursor-pointer"
                                          >
                                            Guardar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setLoggingPagesItemId(null)}
                                            className="text-[10px] font-mono text-text-dim hover:text-text-main cursor-pointer"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLoggingPagesItemId(item.id);
                                            setPagesToAdd(10);
                                          }}
                                          className="text-[10px] font-mono text-text-dim hover:text-text-main flex items-center gap-1 cursor-pointer underline"
                                        >
                                          <Plus className="w-3 h-3" /> Registrar {item.unitLabel || 'páginas'}
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Progress bar hairline */}
                                  <div className="w-full bg-border-line/20 h-[1.5px] overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full transition-all duration-300",
                                        prog.isDone ? "bg-emerald-600" : "bg-text-main/60"
                                      )}
                                      style={{ width: `${Math.min(100, prog.percentProgress)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* LEVEL 3: MONTHS NESTED INSIDE THIS QUARTER (Open & Indented) */}
                      <div className="space-y-3 pt-3 border-t border-border-line/20">
                        <h5 className="text-xs font-sans text-text-dim">
                          Meses de {q.key} · Foco y avance mensual
                        </h5>

                        <div className="space-y-3">
                          {q.months.map(m => {
                            const isCurrentMonth = m.monthIdx === currentMonthIdx;
                            const isMonthExpanded = !!expandedMonths[m.name];
                            const monthIntention = getIntention('cycle', m.start, m.end);
                            const isMonthSelected = selectedPeriod.scale === 'cycle' && selectedPeriod.start === m.start;

                            return (
                              <div key={m.name} className="space-y-2">
                                <div
                                  className="flex items-center justify-between cursor-pointer py-1 group select-none"
                                  onClick={() => setExpandedMonths(prev => ({ ...prev, [m.name]: !prev[m.name] }))}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-4 h-4 flex items-center justify-center text-text-dim group-hover:text-text-main transition-colors">
                                      {isMonthExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </div>
                                    <span className="text-xs font-mono font-medium text-text-main">{m.name}</span>
                                    {isCurrentMonth && (
                                      <span className="text-[8px] font-mono uppercase tracking-wider text-text-dim px-1.5 py-0.2 bg-base-dim/40 font-medium">
                                        Mes Actual
                                      </span>
                                    )}
                                    {monthIntention?.theme && (
                                      <span className="text-xs font-sans text-text-dim italic line-clamp-1 ml-2">
                                        "{monthIntention.theme}"
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPeriod({
                                        scale: 'cycle',
                                        start: m.start,
                                        end: m.end,
                                        label: `${m.name} ${currentYear}`
                                      });
                                    }}
                                    className={cn(
                                      "text-[10px] font-sans flex items-center gap-1 transition-colors",
                                      isMonthSelected
                                        ? "text-text-main font-medium underline underline-offset-4"
                                        : "text-text-dim hover:text-text-main"
                                    )}
                                    title="Ver dedicación de este mes"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span className="hidden sm:inline">Dedicación</span>
                                  </button>
                                </div>

                                {isMonthExpanded && (
                                  <div className="pl-6 space-y-3 pt-1">
                                    {/* Monthly Theme */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-mono text-text-dim flex items-center gap-1">
                                        <Compass className="w-2.5 h-2.5 text-text-main/70" /> Foco de {m.name}
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={monthIntention?.theme || ''}
                                        onBlur={(e) => handleUpdateTheme('cycle', m.start, m.end, e.target.value)}
                                        placeholder={`Norte temático para ${m.name}...`}
                                        className="w-full bg-transparent border-b border-border-line/40 rounded-none py-1 text-xs font-sans text-text-main focus:outline-none focus:border-text-main transition-colors"
                                      />
                                    </div>

                                    {/* Month Operational Breakdown of Quarter Commitments */}
                                    {items.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[10px] font-mono text-text-dim">
                                          Avance de metas del cuarto en {m.name}
                                        </span>
                                        <div className="space-y-1">
                                          {items.map(item => {
                                            const monthProg = calculateCommitmentProgress(item, m.start, m.end);
                                            const taskObj = tasks.find(t => t.id === (item.taskId || item.projectId));
                                            return (
                                              <div key={item.id} className="flex justify-between items-center text-xs font-sans text-text-main py-0.5">
                                                <span className="truncate pr-2">{taskObj?.text || item.areaName}</span>
                                                <span className="text-[10px] font-mono text-text-dim shrink-0">
                                                  {monthProg.label}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Dedicated Sticky Dedication & Progress Mirror (Open) */}
        <div className={cn(
          "lg:col-span-5 lg:sticky lg:top-6 space-y-6",
          activeMobileTab === 'intenciones' ? "hidden lg:block" : "block"
        )}>
          <div className="border-b border-border-line/30 pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim font-medium">
              Espejo de dedicación real
            </span>
            <div className="flex justify-between items-baseline mt-0.5">
              <h3 className="text-base font-sans font-light text-text-main">
                {selectedPeriod.label}
              </h3>
              <span className="text-[10px] font-mono text-text-dim">
                {selectedPeriod.start} / {selectedPeriod.end}
              </span>
            </div>
          </div>

          {/* Render DedicationChart for the selected period */}
          <DedicationChart
            config={config || ({} as Config)}
            tasks={tasks}
            history={history}
            periodStart={selectedPeriod.start}
            periodEnd={selectedPeriod.end}
          />
        </div>
      </div>
    </div>
  );
}
