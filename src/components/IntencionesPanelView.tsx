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
  Compass
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

  // State for Add Commitment Form modal/inline
  const [addingCommitmentQ, setAddingCommitmentQ] = useState<string | null>(null);
  const [commitmentType, setCommitmentType] = useState<'routine' | 'project'>('routine');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [routineTargetType, setRoutineTargetType] = useState<'percent' | 'days'>('percent');
  const [routineTargetValue, setRoutineTargetValue] = useState<number>(80);
  const [projectMode, setProjectMode] = useState<'project_complete' | 'milestone'>('project_complete');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');

  const routines = useMemo(() => tasks.filter(t => t.type === 'Rutina'), [tasks]);
  const projects = useMemo(() => tasks.filter(t => t.type === 'Proyecto'), [tasks]);
  const projectMilestones = useMemo(() => {
    if (!selectedTaskId) return [];
    return tasks.filter(t => t.parentId === selectedTaskId);
  }, [tasks, selectedTaskId]);

  const submitNewCommitment = (q: QuarterInfo) => {
    if (!selectedTaskId) return;

    let newItem: IntentionItem;
    if (commitmentType === 'routine') {
      const routine = routines.find(r => r.id === selectedTaskId);
      newItem = {
        id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        targetType: 'consistency',
        taskId: selectedTaskId,
        areaName: routine?.category || 'General',
        targetPercent: routineTargetType === 'percent' ? routineTargetValue : undefined,
        targetDays: routineTargetType === 'days' ? routineTargetValue : undefined,
      };
    } else {
      const project = projects.find(p => p.id === selectedTaskId);
      if (projectMode === 'milestone' && selectedMilestoneId) {
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'completion',
          projectId: selectedTaskId,
          taskId: selectedMilestoneId,
          areaName: project?.category || 'General',
        };
      } else {
        newItem = {
          id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          targetType: 'completion',
          projectId: selectedTaskId,
          areaName: project?.category || 'General',
        };
      }
    }

    handleAddItemToQuarter(q.start, q.end, newItem);
    setAddingCommitmentQ(null);
    setSelectedTaskId('');
    setSelectedMilestoneId('');
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

      if (item.targetPercent !== undefined) {
        // Calculate days elapsed in period up to today
        const s = parseLocalDate(periodStart);
        const e = parseLocalDate(periodEnd);
        const now = new Date();
        const effectiveEnd = now < e ? now : e;
        const totalDaysElapsed = Math.max(1, Math.round((effectiveEnd.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const actualPercent = Math.min(100, Math.round((uniqueDays / totalDaysElapsed) * 100));
        return {
          current: actualPercent,
          target: item.targetPercent,
          unit: '%',
          label: `${actualPercent}% consistencia (meta: ≥${item.targetPercent}%)`,
          percentProgress: Math.min(100, (actualPercent / item.targetPercent) * 100),
          isDone: actualPercent >= item.targetPercent
        };
      } else {
        const targetDays = item.targetDays || 90;
        const percentProgress = Math.min(100, Math.round((uniqueDays / targetDays) * 100));
        return {
          current: uniqueDays,
          target: targetDays,
          unit: 'días',
          label: `${uniqueDays} de ${targetDays} días`,
          percentProgress,
          isDone: uniqueDays >= targetDays
        };
      }
    }

    if (item.targetType === 'completion') {
      if (item.taskId) {
        // Milestone
        const task = tasks.find(t => t.id === item.taskId);
        const isDone = !!task?.completed;
        return {
          current: isDone ? 1 : 0,
          target: 1,
          unit: '',
          label: isDone ? 'Hito completado' : 'Pendiente',
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

                            {/* Switch: Rutina vs Proyecto */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCommitmentType('routine');
                                  setSelectedTaskId(routines[0]?.id || '');
                                }}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all flex items-center justify-center gap-1.5",
                                  commitmentType === 'routine'
                                    ? "bg-primary text-base border-primary font-bold"
                                    : "border-border-line/40 text-text-dim hover:text-text-main"
                                )}
                              >
                                <Repeat className="w-3.5 h-3.5" /> Vincular a Rutina
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommitmentType('project');
                                  setSelectedTaskId(projects[0]?.id || '');
                                }}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all flex items-center justify-center gap-1.5",
                                  commitmentType === 'project'
                                    ? "bg-primary text-base border-primary font-bold"
                                    : "border-border-line/40 text-text-dim hover:text-text-main"
                                )}
                              >
                                <Layers className="w-3.5 h-3.5" /> Vincular a Proyecto
                              </button>
                            </div>

                            {/* Form Fields: Routine */}
                            {commitmentType === 'routine' && (
                              <div className="space-y-3 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Rutina</label>
                                  <select
                                    value={selectedTaskId}
                                    onChange={(e) => setSelectedTaskId(e.target.value)}
                                    className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                  >
                                    {routines.map(r => (
                                      <option key={r.id} value={r.id}>
                                        {r.text} ({r.category || 'Sin Área'})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Criterio de Meta</label>
                                    <select
                                      value={routineTargetType}
                                      onChange={(e) => {
                                        const val = e.target.value as 'percent' | 'days';
                                        setRoutineTargetType(val);
                                        setRoutineTargetValue(val === 'percent' ? 80 : 90);
                                      }}
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                    >
                                      <option value="percent">Consistencia (% de días)</option>
                                      <option value="days">Días acumulados (Racha)</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">
                                      {routineTargetType === 'percent' ? 'Porcentaje Mínimo (%)' : 'Total de Días'}
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={routineTargetType === 'percent' ? 100 : 90}
                                      value={routineTargetValue}
                                      onChange={(e) => setRoutineTargetValue(Number(e.target.value))}
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-mono text-text-main"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Form Fields: Project */}
                            {commitmentType === 'project' && (
                              <div className="space-y-3 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">Seleccionar Proyecto</label>
                                  <select
                                    value={selectedTaskId}
                                    onChange={(e) => setSelectedTaskId(e.target.value)}
                                    className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                  >
                                    {projects.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.text} ({p.category || 'Sin Área'})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-text-dim uppercase">Tipo de Alcance</label>
                                  <div className="flex gap-2">
                                    <label className="flex items-center gap-1.5 text-xs font-sans text-text-main cursor-pointer">
                                      <input
                                        type="radio"
                                        name="projMode"
                                        checked={projectMode === 'project_complete'}
                                        onChange={() => setProjectMode('project_complete')}
                                      />
                                      Completar Proyecto Entero
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs font-sans text-text-main cursor-pointer">
                                      <input
                                        type="radio"
                                        name="projMode"
                                        checked={projectMode === 'milestone'}
                                        onChange={() => setProjectMode('milestone')}
                                      />
                                      Hito Clave Específico
                                    </label>
                                  </div>
                                </div>

                                {projectMode === 'milestone' && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-mono text-text-dim uppercase">Tarea / Hito del Proyecto</label>
                                    <select
                                      value={selectedMilestoneId}
                                      onChange={(e) => setSelectedMilestoneId(e.target.value)}
                                      className="w-full bg-base border border-border-line/40 rounded-lg p-2 text-xs font-sans text-text-main"
                                    >
                                      <option value="">Selecciona una tarea clave...</option>
                                      {projectMilestones.map(m => (
                                        <option key={m.id} value={m.id}>
                                          {m.text} {m.completed ? '(Ya completada)' : ''}
                                        </option>
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
                                className="px-3 py-1.5 text-xs font-mono text-text-dim hover:text-text-main"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => submitNewCommitment(q)}
                                className="px-4 py-1.5 bg-primary text-base rounded-lg text-xs font-mono font-bold hover:bg-primary/90 transition-colors"
                              >
                                Guardar Compromiso
                              </button>
                            </div>
                          </div>
                        )}

                        {/* List of Commitments */}
                        {items.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-border-line/40 text-center text-xs font-mono text-text-dim">
                            No has definido compromisos para {q.key}. Añade una rutina o proyecto prioritario.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {items.map(item => {
                              const prog = calculateCommitmentProgress(item, q.start, q.end);
                              const taskObj = tasks.find(t => t.id === (item.taskId || item.projectId));
                              const isRoutine = item.targetType === 'consistency';
                              const isProject = item.targetType === 'completion';

                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl border border-border-line/30 bg-base-dim/5 hover:bg-base-dim/10 transition-colors space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded-full bg-base-dim/20 text-text-main">
                                        {isRoutine ? <Repeat className="w-3.5 h-3.5 text-[#81b29a]" /> : <Layers className="w-3.5 h-3.5 text-[#e07a5f]" />}
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-text-main">
                                          {taskObj?.text || item.areaName || 'Compromiso'}
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
                                        className="text-text-dim hover:text-red-500 p-1 transition-colors"
                                        title="Eliminar compromiso"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

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
