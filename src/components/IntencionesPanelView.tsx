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
import { cn, getAreaTextClasses } from '../lib/utils';
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
    <div className="space-y-6 pb-20">
      {/* Mobile Segmented Toggle (Sticky) */}
      <div className="lg:hidden sticky top-0 z-20 bg-base/95 backdrop-blur-sm pt-2 pb-3 border-b border-border-line/30">
        <div className="flex bg-base-dim/20 p-1 rounded-xl border border-border-line/40 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setActiveMobileTab('intenciones')}
            className={cn(
              "flex-1 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-all",
              activeMobileTab === 'intenciones'
                ? "bg-base text-primary font-bold shadow-sm"
                : "text-text-dim hover:text-text-main"
            )}
          >
            Intenciones
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('dedicacion')}
            className={cn(
              "flex-1 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-all",
              activeMobileTab === 'dedicacion'
                ? "bg-base text-primary font-bold shadow-sm"
                : "text-text-dim hover:text-text-main"
            )}
          >
            Dedicación Real
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: The Hierarchical Intention Tree */}
        <div className={cn(
          "space-y-6 lg:col-span-7",
          activeMobileTab === 'dedicacion' ? "hidden lg:block" : "block"
        )}>
          {/* LEVEL 1: YEAR CARD */}
          <div className="bg-base border border-border-line/40 rounded-2xl p-5 shadow-sm space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setYearExpanded(!yearExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-base-dim/20 flex items-center justify-center text-text-dim group-hover:text-primary transition-colors">
                  {yearExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                      Año {currentYear}
                    </span>
                    <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      Visión Vital
                    </span>
                  </div>
                  <h2 className="text-base font-sans font-light text-text-main">
                    Norte Estratégico y Áreas Prioritarias
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
                  "p-2 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors border",
                  selectedPeriod.scale === 'year'
                    ? "bg-primary/10 border-primary/30 text-primary font-bold"
                    : "border-border-line/30 text-text-dim hover:text-text-main hover:bg-base-dim/10"
                )}
                title="Ver dedicación del año en el panel lateral"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver Dedicación</span>
              </button>
            </div>

            {yearExpanded && (
              <div className="space-y-5 pt-2 border-t border-border-line/20">
                {/* Year Narrative Theme */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-accent" /> Norte Narrativo del Año
                  </label>
                  <textarea
                    defaultValue={yearIntention?.theme || ''}
                    onBlur={(e) => handleUpdateTheme('year', yearStart, yearEnd, e.target.value)}
                    placeholder="¿Cuál es la brújula o propósito central de este año? (ej. Año de consolidación, salud integral y ritmos sostenibles...)"
                    className="w-full bg-base-dim/10 border border-border-line/30 rounded-xl p-3 text-sm font-sans text-text-main focus:outline-none focus:border-primary/50 transition-colors resize-none h-20 placeholder:text-text-dim/40"
                  />
                </div>

                {/* Priority Areas Chips */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold">
                    Áreas Vitales de Enfoque
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(config?.areas || {}).map(([areaName, areaVal]) => {
                      const color = typeof areaVal === 'string' ? areaVal : (areaVal?.color || 'slate');
                      return (
                        <div
                          key={areaName}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider border border-border-line/30 bg-base-dim/10 flex items-center gap-2",
                            getAreaTextClasses(color)
                          )}
                        >
                          <span className="w-2 h-2 rounded-full bg-current opacity-75" />
                          {areaName}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mini Dashboard of the 4 Quarters */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold">
                    <span>Panorama de Cuartos ({currentYear})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quarters.map(q => {
                      const qIntention = getIntention('quarter', q.start, q.end);
                      const isCurrent = q.key === currentQKey;
                      const hasTheme = !!qIntention?.theme;
                      const itemsCount = qIntention?.items?.length || 0;

                      return (
                        <div
                          key={q.key}
                          className={cn(
                            "p-2.5 rounded-xl border flex flex-col justify-between gap-1 text-left transition-all",
                            isCurrent
                              ? "border-primary/40 bg-primary/5 shadow-xs"
                              : "border-border-line/20 bg-base-dim/5"
                          )}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-text-main">{q.key}</span>
                            {isCurrent && (
                              <span className="text-[8px] font-mono uppercase tracking-wider text-primary font-bold">
                                Actual
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-sans text-text-dim line-clamp-1 italic">
                            {hasTheme ? `"${qIntention.theme}"` : 'Sin definir'}
                          </p>
                          <div className="text-[9px] font-mono text-text-dim/70 mt-1">
                            {itemsCount} {itemsCount === 1 ? 'compromiso' : 'compromisos'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LEVEL 2: QUARTERS ACCORDION (Q1 - Q4) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold px-1">
              Cuartos Trimestrales (Metas y Compromisos de 90 Días)
            </h3>

            {quarters.map(q => {
              const isCurrentQ = q.key === currentQKey;
              const isExpanded = !!expandedQuarters[q.key];
              const qIntention = getIntention('quarter', q.start, q.end);
              const items = qIntention?.items || [];
              const isSelectedForDedication = selectedPeriod.scale === 'quarter' && selectedPeriod.start === q.start;

              return (
                <div
                  key={q.key}
                  className={cn(
                    "border rounded-2xl transition-all duration-200 overflow-hidden",
                    isCurrentQ
                      ? "bg-base border-primary/40 shadow-sm"
                      : "bg-base border-border-line/30 opacity-95"
                  )}
                >
                  {/* Quarter Header */}
                  <div
                    className={cn(
                      "p-4 flex items-center justify-between cursor-pointer transition-colors",
                      isCurrentQ ? "bg-primary/5 hover:bg-primary/10" : "bg-base hover:bg-base-dim/10"
                    )}
                    onClick={() => setExpandedQuarters(prev => ({ ...prev, [q.key]: !prev[q.key] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center text-text-dim">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-text-main">{q.label}</span>
                          {isCurrentQ && (
                            <span className="text-[9px] font-mono uppercase tracking-wider bg-primary text-base px-2 py-0.5 rounded-full font-bold">
                              En Curso
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
                          "p-2 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors border",
                          isSelectedForDedication
                            ? "bg-primary/10 border-primary/30 text-primary font-bold"
                            : "border-border-line/30 text-text-dim hover:text-text-main hover:bg-base-dim/10"
                        )}
                        title="Ver dedicación de este cuarto en el panel lateral"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dedicación</span>
                      </button>
                    </div>
                  </div>

                  {/* Quarter Content */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-border-line/20 space-y-6">
                      {/* Quarter Theme Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold flex items-center gap-1.5">
                          <Compass className="w-3 h-3 text-accent" /> Norte del Cuarto ({q.key})
                        </label>
                        <input
                          type="text"
                          defaultValue={qIntention?.theme || ''}
                          onBlur={(e) => handleUpdateTheme('quarter', q.start, q.end, e.target.value)}
                          placeholder="Foco de este trimestre (ej. 90 días de consistencia en rutinas base y batchcooking)"
                          className="w-full bg-base-dim/10 border border-border-line/30 rounded-xl px-3 py-2 text-xs font-sans text-text-main focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-dim/40"
                        />
                      </div>

                      {/* Quarter Commitments */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-primary" />
                            <h4 className="text-[10px] font-mono uppercase tracking-widest text-text-main font-bold">
                              Compromisos del Cuarto ({items.length})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingCommitmentQ(q.key);
                              setSelectedTaskId(routines[0]?.id || projects[0]?.id || '');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-primary hover:underline cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Añadir Compromiso
                          </button>
                        </div>

                        {/* Add Commitment Form (Inline Modal / Drawer) */}
                        {addingCommitmentQ === q.key && (
                          <div className="p-4 rounded-xl border border-primary/30 bg-base-dim/10 space-y-3 animate-in fade-in duration-150">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono font-bold text-text-main">
                                Nuevo Compromiso para {q.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => setAddingCommitmentQ(null)}
                                className="text-text-dim hover:text-text-main"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* 4 Tabs: Hábito/Rutina | Horas | Contador | Hito/Proyecto */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-base-dim/20 rounded-xl border border-border-line/30">
                              <button
                                type="button"
                                onClick={() => setCommitmentType('routine_habit')}
                                className={cn(
                                  "py-1.5 px-2 text-[11px] font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                  commitmentType === 'routine_habit'
                                    ? "bg-primary text-base font-bold shadow-xs"
                                    : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <Repeat className="w-3.5 h-3.5" /> Hábito / Rutina
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('hours')}
                                className={cn(
                                  "py-1.5 px-2 text-[11px] font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                  commitmentType === 'hours'
                                    ? "bg-primary text-base font-bold shadow-xs"
                                    : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <Clock className="w-3.5 h-3.5" /> Horas
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('counter')}
                                className={cn(
                                  "py-1.5 px-2 text-[11px] font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                  commitmentType === 'counter'
                                    ? "bg-primary text-base font-bold shadow-xs"
                                    : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <BookOpen className="w-3.5 h-3.5" /> Contador
                              </button>
                              <button
                                type="button"
                                onClick={() => setCommitmentType('milestone')}
                                className={cn(
                                  "py-1.5 px-2 text-[11px] font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                  commitmentType === 'milestone'
                                    ? "bg-primary text-base font-bold shadow-xs"
                                    : "text-text-dim hover:text-text-main"
                                )}
                              >
                                <CheckSquare className="w-3.5 h-3.5" /> Hito / Proyecto
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
                                    className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                      className="w-32 bg-base border border-border-line/40 rounded-lg p-2 text-xs font-mono text-text-main"
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
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('area'); setSelectedHoursTargetId(areaNames[0] || ''); }}
                                      className={cn(
                                        "flex-1 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer",
                                        hoursTargetKind === 'area' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
                                      )}
                                    >
                                      Área Vital
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('project'); setSelectedHoursTargetId(projects[0]?.id || ''); }}
                                      className={cn(
                                        "flex-1 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer",
                                        hoursTargetKind === 'project' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
                                      )}
                                    >
                                      Proyecto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setHoursTargetKind('task'); setSelectedHoursTargetId(trackableTasks[0]?.id || ''); }}
                                      className={cn(
                                        "flex-1 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer",
                                        hoursTargetKind === 'task' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                    >
                                      {trackableTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.text} ({t.type} · {t.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Modalidad de Meta</label>
                                    <select
                                      value={hoursPacing}
                                      onChange={(e) => {
                                        const p = e.target.value as 'weekly' | 'total';
                                        setHoursPacing(p);
                                        setHoursValue(p === 'weekly' ? 4 : 50);
                                      }}
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-mono text-text-main"
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
                                      className="text-[10px] font-mono text-primary hover:underline cursor-pointer"
                                    >
                                      {isCreatingNewCounterTask ? "Elegir existente" : "+ Crear nueva tarea"}
                                    </button>
                                  </div>

                                  {isCreatingNewCounterTask ? (
                                    <div className="space-y-2 p-2.5 rounded-lg border border-border-line/40 bg-base">
                                      <input
                                        type="text"
                                        placeholder="Nombre del libro o actividad (ej. Leer 'El infinito en un junco')"
                                        value={counterName}
                                        onChange={(e) => setCounterName(e.target.value)}
                                        className="w-full bg-transparent border-b border-border-line/40 pb-1 text-xs font-sans text-text-main focus:outline-none focus:border-primary"
                                      />
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-text-dim uppercase">Área:</span>
                                        <select
                                          value={newCounterTaskCategory}
                                          onChange={(e) => setNewCounterTaskCategory(e.target.value)}
                                          className="bg-base-dim/20 border border-border-line/30 rounded px-2 py-0.5 text-xs font-mono text-text-main"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                    >
                                      {trackableTasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.text} ({t.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Meta Cuantitativa Total</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={counterTarget}
                                      onChange={(e) => setCounterTarget(Number(e.target.value))}
                                      placeholder="500"
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-mono text-text-main"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Unidad de Medida</label>
                                    <input
                                      type="text"
                                      value={counterUnit}
                                      onChange={(e) => setCounterUnit(e.target.value)}
                                      placeholder="páginas, capítulos, etc."
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('standalone_task')}
                                      className={cn(
                                        "py-1 text-xs font-mono rounded-lg border transition-all text-center cursor-pointer",
                                        milestoneKind === 'standalone_task' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
                                      )}
                                    >
                                      Tarea Suelta
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('project_milestone')}
                                      className={cn(
                                        "py-1 text-xs font-mono rounded-lg border transition-all text-center cursor-pointer",
                                        milestoneKind === 'project_milestone' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
                                      )}
                                    >
                                      Hito de Proyecto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMilestoneKind('project_complete')}
                                      className={cn(
                                        "py-1 text-xs font-mono rounded-lg border transition-all text-center cursor-pointer",
                                        milestoneKind === 'project_complete' ? "bg-base-dim/40 border-primary font-bold text-text-main" : "border-border-line/30 text-text-dim"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                        className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                        className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
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
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                    >
                                      {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.text} ({p.category || 'Sin Área'})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setAddingCommitmentQ(null)}
                                className="px-3 py-1.5 text-xs font-mono text-text-dim hover:text-text-main cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => submitNewCommitment(q)}
                                className="px-4 py-1.5 bg-primary text-base rounded-lg text-xs font-mono font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                              >
                                Guardar Compromiso
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of Commitments */}
                        {items.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-border-line/40 text-center text-xs font-mono text-text-dim">
                            No has definido compromisos para {q.key}. Añade una meta prioritaria.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {items.map(item => {
                              const prog = calculateCommitmentProgress(item, q.start, q.end);
                              const taskObj = tasks.find(t => t.id === (item.taskId || item.projectId));
                              const title = item.counterName || taskObj?.text || item.areaName || 'Compromiso';

                              let icon = <Repeat className="w-3.5 h-3.5 text-[#81b29a]" />;
                              if (item.targetType === 'hours') {
                                icon = <Clock className="w-3.5 h-3.5 text-[#e07a5f]" />;
                              } else if (item.targetType === 'counter') {
                                icon = <BookOpen className="w-3.5 h-3.5 text-[#3d5a80]" />;
                              } else if (item.targetType === 'completion') {
                                icon = item.projectId && !item.taskId ? <Layers className="w-3.5 h-3.5 text-[#f4a261]" /> : <CheckSquare className="w-3.5 h-3.5 text-[#2a9d8f]" />;
                              }

                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl border border-border-line/30 bg-base-dim/5 hover:bg-base-dim/10 transition-colors space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded-full bg-base-dim/20 text-text-main">
                                        {icon}
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-text-main">
                                          {title}
                                        </div>
                                        <div className="text-[9px] font-mono text-text-dim">
                                          {prog.label}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {prog.isDone ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-[#81b29a]/15 text-[#81b29a] font-bold px-2 py-0.5 rounded-full">
                                          <Check className="w-3 h-3" /> Cumplido
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-mono font-bold text-text-main">
                                          {prog.percentProgress}%
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItemFromQuarter(q.start, q.end, item.id)}
                                        className="text-text-dim hover:text-red-500 p-1 transition-colors cursor-pointer"
                                        title="Eliminar compromiso"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Counter quick-log action */}
                                  {item.targetType === 'counter' && (
                                    <div className="pt-1">
                                      {loggingPagesItemId === item.id ? (
                                        <div className="flex items-center gap-2 p-1.5 bg-base rounded-lg border border-border-line/40">
                                          <span className="text-[10px] font-mono text-text-dim">Sumar:</span>
                                          <input
                                            type="number"
                                            value={pagesToAdd}
                                            onChange={(e) => setPagesToAdd(Number(e.target.value))}
                                            className="w-16 bg-base-dim/20 border border-border-line/30 rounded px-1.5 py-0.5 text-xs font-mono text-text-main"
                                          />
                                          <span className="text-[10px] font-mono text-text-dim">{item.unitLabel || 'páginas'}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newCount = (item.currentCount || 0) + pagesToAdd;
                                              handleUpdateItemInQuarter(q.start, q.end, item.id, { currentCount: newCount });
                                              setLoggingPagesItemId(null);
                                            }}
                                            className="px-2 py-0.5 bg-primary text-base text-[10px] font-mono font-bold rounded cursor-pointer"
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
                                          className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" /> Registrar {item.unitLabel || 'páginas'}
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Progress bar */}
                                  <div className="w-full bg-base-dim/30 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full transition-all duration-300",
                                        prog.isDone ? "bg-[#81b29a]" : "bg-primary"
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

                      {/* LEVEL 3: MONTHS NESTED INSIDE THIS QUARTER */}
                      <div className="space-y-3 pt-3 border-t border-border-line/15">
                        <h5 className="text-[10px] font-mono uppercase tracking-widest text-text-dim font-bold">
                          Meses de {q.key} (Desglose y Foco Mensual)
                        </h5>

                        <div className="space-y-2">
                          {q.months.map(m => {
                            const isCurrentMonth = m.monthIdx === currentMonthIdx;
                            const isMonthExpanded = !!expandedMonths[m.name];
                            const monthIntention = getIntention('cycle', m.start, m.end);
                            const isMonthSelected = selectedPeriod.scale === 'cycle' && selectedPeriod.start === m.start;

                            return (
                              <div
                                key={m.name}
                                className={cn(
                                  "border rounded-xl transition-all overflow-hidden",
                                  isCurrentMonth
                                    ? "border-primary/40 bg-base-dim/5"
                                    : "border-border-line/20 bg-base"
                                )}
                              >
                                <div
                                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-base-dim/10 transition-colors"
                                  onClick={() => setExpandedMonths(prev => ({ ...prev, [m.name]: !prev[m.name] }))}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-4 h-4 flex items-center justify-center text-text-dim">
                                      {isMonthExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </div>
                                    <span className="text-xs font-mono font-bold text-text-main">{m.name}</span>
                                    {isCurrentMonth && (
                                      <span className="text-[8px] font-mono uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.2 rounded font-bold">
                                        Mes Actual
                                      </span>
                                    )}
                                    {monthIntention?.theme && (
                                      <span className="text-[11px] font-sans text-text-dim italic line-clamp-1 ml-2">
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
                                      "p-1.5 rounded-md text-[10px] font-mono flex items-center gap-1 transition-colors border",
                                      isMonthSelected
                                        ? "bg-primary/10 border-primary/30 text-primary font-bold"
                                        : "border-border-line/30 text-text-dim hover:text-text-main hover:bg-base-dim/10"
                                    )}
                                    title="Ver dedicación de este mes"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span className="hidden sm:inline">Dedicación</span>
                                  </button>
                                </div>

                                {isMonthExpanded && (
                                  <div className="p-3 border-t border-border-line/10 space-y-3 bg-base-dim/5">
                                    {/* Monthly Theme */}
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-mono uppercase tracking-wider text-text-dim font-bold flex items-center gap-1">
                                        <Compass className="w-2.5 h-2.5 text-accent" /> Foco de {m.name}
                                      </label>
                                      <input
                                        type="text"
                                        defaultValue={monthIntention?.theme || ''}
                                        onBlur={(e) => handleUpdateTheme('cycle', m.start, m.end, e.target.value)}
                                        placeholder={`Norte temático para ${m.name}...`}
                                        className="w-full bg-base border border-border-line/30 rounded-lg px-2.5 py-1.5 text-xs font-sans text-text-main focus:outline-none focus:border-primary/50 transition-colors"
                                      />
                                    </div>

                                    {/* Month Operational Breakdown of Quarter Commitments */}
                                    {items.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim font-bold">
                                          Avance de metas del cuarto en {m.name}
                                        </span>
                                        <div className="space-y-1.5">
                                          {items.map(item => {
                                            const monthProg = calculateCommitmentProgress(item, m.start, m.end);
                                            const taskObj = tasks.find(t => t.id === (item.taskId || item.projectId));
                                            return (
                                              <div key={item.id} className="flex justify-between items-center text-[11px] font-sans text-text-main bg-base px-2.5 py-1.5 rounded-lg border border-border-line/20">
                                                <span className="truncate pr-2 font-medium">{taskObj?.text || item.areaName}</span>
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

        {/* RIGHT COLUMN: Dedicated Sticky Dedication & Progress Mirror */}
        <div className={cn(
          "lg:col-span-5 lg:sticky lg:top-6 space-y-4",
          activeMobileTab === 'intenciones' ? "hidden lg:block" : "block"
        )}>
          <div className="bg-base border border-border-line/40 rounded-2xl p-5 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-border-line/20 pb-3">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-primary font-bold">
                  Espejo de Dedicación Real
                </span>
                <h3 className="text-base font-sans font-bold text-text-main">
                  {selectedPeriod.label}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-text-dim">
                {selectedPeriod.start} / {selectedPeriod.end}
              </span>
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
    </div>
  );
}
