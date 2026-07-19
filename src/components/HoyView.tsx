import React, { useState } from 'react';
import { Target, Activity, Clock, Calendar, Inbox, Database, Plus, CheckSquare, Square, X, RotateCw, Lock, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Config, AppTask, HistoryRecord, Separator, TaskType, ProgressSnapshot } from '../types';
import { calculateBiologicalPhase } from '../domain/cycle';
import { getEnergyEngineDetails } from '../domain/energy';
import { getLunarDetailsForDate } from '../domain/lunar';
import { extractSafeTime, timeToMins, minsToTime, isSameDay, isTodayOrBefore, isFutureDate, cn, getAreaColorClasses } from '../lib/utils';
import TaskItem from './TaskItem';
import CategoryBadge from './ui/CategoryBadge';
import FilterDropdown from './ui/FilterDropdown';
import SortDropdown from './ui/SortDropdown';
import { getIsoWeekday, getRoutineCycleProgress, isRoutineConfigured, isTaskScheduledOnDate } from '../domain/recurrenceProgress';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  progressSnapshots: ProgressSnapshot[];
  onToggleTask: (task: AppTask) => void;
  onAddEvent: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  activeTimer?: { taskId: string; isRunning: boolean } | null;
  onStartTimer?: (taskId: string) => void;
  onUpdateConfig?: (c: Partial<Config>) => void;
  onNavigate?: (view: string) => void;
}

export default function HoyView({ config, tasks, history, progressSnapshots, onToggleTask, onAddEvent, onDeleteTask, onUpdateTask, onAddTask, activeTimer, onStartTimer, onUpdateConfig, onNavigate }: Props) {
  const phase = calculateBiologicalPhase(config);
  const phaseDetails = getEnergyEngineDetails(phase, config?.cycleConfig?.trackingType);
  const ENERGY_LIMIT = phaseDetails.limit;

  const todayLunar = getLunarDetailsForDate(new Date());


  // Editing pulso state
  const [editingPulsoId, setEditingPulsoId] = useState<string | null>(null);
  const [editPulsoForm, setEditPulsoForm] = useState({ text: '', targetCount: 1, unitLabel: 'veces', polaridad: 'Reforzar', category: '', subCategory: '' });
  const [openMenuPulsoId, setOpenMenuPulsoId] = useState<string | null>(null);

  // Collapsible sections state
  const [showPulsos, setShowPulsos] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showFlexible, setShowFlexible] = useState(true);
  const [showBacklog, setShowBacklog] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFlowLogger, setShowFlowLogger] = useState(false);
  const [sortFlexiblesBy, setSortFlexiblesBy] = useState('manual');
  const [sortBacklogBy, setSortBacklogBy] = useState('manual');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState('Todas');
  const [filterAllocation, setFilterAllocation] = useState('Todas');

  const getSortedTasks = (taskList: AppTask[], criterion: string) => {
    let sorted = [...taskList];
    if (criterion === 'manual') {
      sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (criterion === 'name') {
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    } else if (criterion === 'date') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return sorted;
  };

  const handleDrop = (e: React.DragEvent, targetId: string, list: AppTask[]) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedItem = tasks.find(t => t.id === draggedId);
    if (!draggedItem) return;

    // Check if both items belong to the same list
    const sourceInList = list.some(t => t.id === draggedId);
    const targetInList = list.some(t => t.id === targetId);

    if (!sourceInList || !targetInList) return; // Strict D&D constraint: only within the same list

    const currentIndex = list.findIndex(t => t.id === draggedId);
    const targetIndex = list.findIndex(t => t.id === targetId);

    const newList = [...list];
    newList.splice(currentIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    // Re-assign order for the whole list
    newList.forEach((t, idx) => {
      onUpdateTask(t.id, { order: (idx + 1) * 1000 });
    });
    setDraggedId(null);
  };

  let filteredTodayTasks = tasks.filter(t => {
    if (t.completed || t.type === 'Proyecto' || t.type === 'Pulso') return false;
    // Hide subtasks of normal tasks from root lists (they render via TaskItem expansion)
    if (t.parentId) {
      const parent = tasks.find(p => p.id === t.parentId);
      if (parent && parent.type !== 'Proyecto') {
        // Enforce: subtasks of Rutinas, Tareas, etc. are hidden from root, and render internally.
        return false;
      }
    }
    if (t.type === 'Rutina') {
      if (!isRoutineConfigured(t)) return false;
      const childHabits = tasks.filter(sub => sub.parentId === t.id && sub.type === 'Hábito');
      return isTaskScheduledOnDate(t, new Date()) && getRoutineCycleProgress(t, childHabits, progressSnapshots) < 100;
    }
    if (t.type === 'Hábito') return isTodayOrBefore(t.fechaPlanificada);
    return t.view === 'Hoy' && isTodayOrBefore(t.fechaPlanificada);
  });

  let filteredBacklogTasks = tasks.filter(t => {
    if (t.completed || t.type === 'Proyecto' || t.type === 'Hábito' || t.type === 'Rutina' || t.type === 'Pulso') return false;
    if (t.parentId) {
      const parent = tasks.find(p => p.id === t.parentId);
      if (parent && parent.type !== 'Proyecto') return false;
    }
    const isViewBacklog = t.view === 'Backlog';
    const isViewEmpty = !t.view || t.view.trim() === '';
    const isFutureScheduled = t.view === 'Hoy' && isFutureDate(t.fechaPlanificada);
    return isViewBacklog || isViewEmpty || isFutureScheduled;
  });

  let filteredPulsos = tasks.filter(t => t.type === 'Pulso');

  // Apply filters
  if (filterArea !== 'Todas') {
    filteredTodayTasks = filteredTodayTasks.filter(t => t.category === filterArea);
    filteredBacklogTasks = filteredBacklogTasks.filter(t => t.category === filterArea);
    filteredPulsos = filteredPulsos.filter(t => t.category === filterArea);
  }

  if (filterAllocation !== 'Todas') {
    filteredTodayTasks = filteredTodayTasks.filter(t => t.allocationType === filterAllocation);
    filteredBacklogTasks = filteredBacklogTasks.filter(t => t.allocationType === filterAllocation);
  }

  const todayTasks = filteredTodayTasks;
  const backlogTasks = filteredBacklogTasks;
  const pulsos = filteredPulsos;
  const activeProjects = tasks.filter(t => t.type === 'Proyecto' && !t.completed);
  const activeRoutines = tasks.filter(t => t.type === 'Rutina' && !t.completed);

  const todayRecords = history.filter(h => isSameDay(h.date, new Date().toISOString()));

  let fixedHoursToday = 0;
  let growthHoursToday = 0;
  let mixedHoursToday = 0;

  todayRecords.forEach(h => {
    const task = tasks.find(t => t.id === h.taskId);
    const duration = h.duration || 0;
    const alloc = task?.allocationType || (task ? (task.type === 'Rutina' || task.type === 'Hábito' || task.type === 'Pulso' ? 'fixed' : 'growth') : 'growth');
    if (alloc === 'fixed') {
      fixedHoursToday += duration;
    } else if (alloc === 'mixed') {
      mixedHoursToday += duration;
    } else {
      growthHoursToday += duration;
    }
  });

  const totalSoporteReal = fixedHoursToday + (mixedHoursToday * 0.5);
  const totalInversionReal = growthHoursToday + (mixedHoursToday * 0.5);
  const hoursWorkedToday = fixedHoursToday + growthHoursToday + mixedHoursToday;

  const getPhaseBudgets = (phaseName: string) => {
    switch (phaseName) {
      case 'dinamica': return { soporte: 2.0, inversion: 10.0 };
      case 'expresiva': return { soporte: 2.0, inversion: 8.0 };
      case 'creativa': return { soporte: 3.0, inversion: 5.0 };
      case 'reflexiva': return { soporte: 4.0, inversion: 1.0 };
      default: return { soporte: 2.0, inversion: 6.0 };
    }
  };
  const { soporte: soporteBudget, inversion: inversionBudget } = getPhaseBudgets(phase);
  const growthCapacityToday = Math.max(0, ENERGY_LIMIT - totalSoporteReal);
  const remainingGrowthLimit = Math.max(0, growthCapacityToday - totalInversionReal);

  let plannedSoporte = 0;
  let plannedInversion = 0;
  const timedTasks: any[] = [];
  const untimedTasks: AppTask[] = [];

  todayTasks.forEach(t => {
    let taskDur = t.duracion || 0;
    if (t.type === 'Rutina' || t.type === 'Proyecto') {
      taskDur = tasks.filter(sub => sub.parentId === t.id && !sub.completed).reduce((acc, sub) => acc + (sub.duracion || 0), 0);
    }

    const alloc = t.allocationType || (t.type === 'Rutina' || t.type === 'Hábito' || t.type === 'Pulso' ? 'fixed' : 'growth');
    if (alloc === 'fixed') {
      plannedSoporte += taskDur;
    } else if (alloc === 'mixed') {
      plannedSoporte += taskDur * 0.5;
      plannedInversion += taskDur * 0.5;
    } else {
      plannedInversion += taskDur;
    }

    const safeTime = extractSafeTime(t.hora);
    if (safeTime) {
      timedTasks.push({ ...t, hora: safeTime });
    } else {
      untimedTasks.push(t);
    }
  });

  const totalEnergy = plannedSoporte + plannedInversion;
  const remainingLimit = Math.max(0, ENERGY_LIMIT - hoursWorkedToday);
  const energyPercent = remainingLimit > 0 ? Math.min((totalEnergy / remainingLimit) * 100, 100) : (totalEnergy > 0 ? 100 : 0);
  const energyColor = totalEnergy > remainingLimit ? 'bg-red-500' : 'bg-amber-400';

  // Map today's history records to timed items in the timeline
  const getRecordTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // todayRecords was moved up
  const mappedRecords = todayRecords.map(rec => {
    const task = tasks.find(t => t.id === rec.taskId);
    return {
      id: `record-${rec.id}`,
      text: task ? task.text : (rec.taskSnapshotText || '(Elemento Eliminado)'),
      hora: getRecordTime(rec.date),
      isRecord: true,
      duration: rec.duration || 0,
      category: task ? task.category : '',
      subCategory: task ? task.subCategory : '',
      type: task ? task.type : 'Tarea',
      originalRecord: rec
    };
  });

  const timedItems = [
    ...timedTasks,
    ...mappedRecords,
    ...(config?.separators || [])
      .filter(separator => !separator.weekdays?.length || separator.weekdays.includes(getIsoWeekday(new Date())))
      .map((s, idx) => ({ ...s, isSeparator: true, separatorIndex: idx }))
  ];
  timedItems.sort((a, b) => {
    const minsA = timeToMins(a.hora);
    const minsB = timeToMins(b.hora);
    if (minsA !== minsB) {
      return minsA - minsB;
    }
    if (a.isSeparator && !b.isSeparator) return -1;
    if (!a.isSeparator && b.isSeparator) return 1;
    return 0;
  });

  // Imminent period warning (1-2 days before estimated period start)
  let daysUntilPeriod: number | null = null;
  let showPeriodWarning = false;
  if (config?.cycleConfig?.menstruates !== false && config?.cycleConfig?.trackingType === 'menstrual' && config?.cycleConfig?.lastCycleStartDate) {
    const lastStart = new Date(config.cycleConfig.lastCycleStartDate);
    const length = config.cycleConfig.cycleLengthDays || 28;
    const nextStart = new Date(lastStart.getTime());
    nextStart.setDate(nextStart.getDate() + length);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextStart.setHours(0, 0, 0, 0);
    const diffMs = nextStart.getTime() - today.getTime();
    daysUntilPeriod = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    showPeriodWarning = daysUntilPeriod >= 0 && daysUntilPeriod <= 2;
  }

  const getPhaseIcon = (p: string) => {
    switch (p) {
      case 'reflexiva': return '🩸';
      case 'dinamica': return '⚡';
      case 'expresiva': return '🌸';
      case 'creativa': return '🍃';
      default: return '🔮';
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in w-full px-6 md:px-10 py-8 pb-12 mx-auto">

      {/* Header Foco de Hoy - Grid alignment matching main content */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 border-b border-border-line pb-6">
        <div className="lg:col-span-2 flex flex-col gap-1 text-left justify-start">
          <h2 className="text-title flex items-center gap-3">
            <Target className="w-6 h-6 stroke-[2]" /> Foco de Hoy {getPhaseIcon(phase)}
          </h2>

          {/* Biological Phase Pill Indicator, Manual Selector & Register Button */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={cn("text-[10px] tracking-wider font-mono uppercase px-2.5 py-0.5 rounded-full border", phaseDetails.borderColor, phaseDetails.pillBg)}>
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
                className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-text-main hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-0 outline-none"
              >
                <span>🩸 {showFlowLogger ? 'ocultar' : 'registrar ciclo'}</span>
              </button>
            )}

            <span className="text-text-dim/30 font-mono text-[10px]">|</span>

            {/* Quick manual selector */}
            <select
              className="appearance-none bg-transparent text-[10px] font-mono text-[#a2b29f] hover:text-text-main cursor-pointer outline-none transition-colors border-b border-transparent hover:border-[#a2b29f]"
              value={config?.cycleConfig?.currentManualPhase || 'none'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateConfig?.({
                  cycleConfig: {
                    ...config?.cycleConfig,
                    trackingType: config?.cycleConfig?.trackingType || 'none',
                    currentManualPhase: val === 'none' ? undefined : val as any
                  }
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
          <span className="text-[11px] text-text-dim italic max-w-sm mt-1 leading-snug">{phaseDetails.details}</span>

          {/* Menstrual Flow Logger — inline below header, above date */}
          {config?.cycleConfig?.menstruates !== false && config?.cycleConfig?.trackingType === 'menstrual' && showFlowLogger && (
            <div className="w-full glass-matte p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top-2 duration-300 mt-3">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs font-bold text-text-main flex items-center gap-2 font-sans">
                  🩸 Registro de Intensidad del Periodo
                </span>
                <span className="text-[10px] text-text-dim leading-relaxed max-w-sm font-mono">
                  Registra el flujo hoy. Día 1 se detecta tras 10 días secos. La fase reflexiva se extiende si continúas registrando flujo.
                </span>
              </div>

              <div className="flex gap-2">
                {[
                  { val: 0, label: 'Seco', color: 'hover:bg-[#efede8]/40 hover:text-black border-border-line text-slate-500 bg-white/50', activeColor: 'bg-[#81b29a]/20 text-[#81b29a] border-[#81b29a] font-bold' },
                  { val: 1, label: 'Ligero', color: 'hover:bg-[#73c2b8]/10 hover:text-[#73c2b8] border-[#73c2b8]/30 text-[#73c2b8] bg-white/50', activeColor: 'bg-[#73c2b8] text-white border-[#73c2b8] font-bold' },
                  { val: 2, label: 'Moderado', color: 'hover:bg-[#e07a5f]/10 hover:text-[#e07a5f] border-[#e07a5f]/30 text-[#e07a5f] bg-white/50', activeColor: 'bg-[#e07a5f] text-white border-[#e07a5f] font-bold' },
                  { val: 3, label: 'Abundante', color: 'hover:bg-[#d4af37]/10 hover:text-[#d4af37] border-[#d4af37]/30 text-[#d4af37] bg-white/50', activeColor: 'bg-[#d4af37] text-white border-[#d4af37] font-bold' }
                ].map(f => {
                  const todayStr = new Date().toISOString().slice(0, 10);
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
                            flowLogs: newFlowLogs
                          }
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-medium rounded-xl border transition-all cursor-pointer",
                        isActive ? f.activeColor : f.color
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:col-span-1 flex flex-col justify-start text-left gap-2">
          {/* Row 1: Date and Filter icon */}
          <div className="flex justify-between items-center w-full pb-0.5">
            <span className="text-[10px] tracking-[0.2em] text-[#a2b29f] uppercase font-mono leading-none">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <FilterDropdown
              align="right"
              configs={[
                {
                  key: 'area',
                  label: 'Área',
                  options: [
                    { label: 'Todas las áreas', value: 'Todas' },
                    ...Object.keys(config?.areas || {}).map(cat => ({ label: cat, value: cat }))
                  ]
                },
                {
                  key: 'allocation',
                  label: 'Inversión',
                  options: [
                    { label: 'Todas las asignaciones', value: 'Todas' },
                    { label: 'Soporte Vital 🛡️', value: 'fixed' },
                    { label: 'Inversión ⚡', value: 'growth' },
                    { label: 'Mixto ☯️', value: 'mixed' }
                  ]
                }
              ]}
              activeFilters={{
                area: filterArea,
                allocation: filterAllocation
              }}
              onChange={(key, val) => {
                if (key === 'area') setFilterArea(val);
                if (key === 'allocation') setFilterAllocation(val);
              }}
            />
          </div>

          <div className="flex justify-between items-end w-full pb-0.5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-text-dim font-mono leading-none">Asignación Energética</span>
            <span className="text-xs text-text-main font-bold leading-none">
              {hoursWorkedToday.toFixed(1)}h real / {ENERGY_LIMIT.toFixed(1)}h lím
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="w-full h-[5px] bg-[var(--color-border-line)] relative rounded-full overflow-hidden mb-1 flex">
            {fixedHoursToday > 0 && (
              <div
                style={{ width: `${(fixedHoursToday / ENERGY_LIMIT) * 100}%` }}
                className="bg-[#81b29a] h-full transition-all duration-300"
                title={`Soporte Vital: ${fixedHoursToday.toFixed(1)}h`}
              />
            )}
            {mixedHoursToday > 0 && (
              <div
                style={{ width: `${(mixedHoursToday / ENERGY_LIMIT) * 100}%` }}
                className="bg-[#e07a5f] h-full transition-all duration-300"
                title={`Híbrido/Mixto: ${mixedHoursToday.toFixed(1)}h`}
              />
            )}
            {growthHoursToday > 0 && (
              <div
                style={{ width: `${(growthHoursToday / ENERGY_LIMIT) * 100}%` }}
                className="bg-[#d4af37] h-full transition-all duration-300"
                title={`Inversión Crecimiento: ${growthHoursToday.toFixed(1)}h`}
              />
            )}
          </div>

          <div className="flex justify-between text-[9px] tracking-wide font-mono">
            <span className={cn(
              "transition-colors",
              totalSoporteReal > soporteBudget ? "text-red-500 font-semibold" : "text-text-dim/80"
            )}>
              🛡️ Soporte: <span className={cn("font-bold", totalSoporteReal > soporteBudget ? "text-red-500" : "text-text-main")}>{totalSoporteReal.toFixed(1)}h / {soporteBudget.toFixed(1)}h</span>
            </span>
            <span className={cn(
              "transition-colors",
              totalInversionReal > inversionBudget ? "text-red-500 font-semibold" : "text-text-dim/80"
            )}>
              ⚡ Inversión: <span className={cn("font-bold", totalInversionReal > inversionBudget ? "text-red-500" : "text-text-main")}>{totalInversionReal.toFixed(1)}h / {inversionBudget.toFixed(1)}h</span>
            </span>
          </div>

          {/* Validating/celebratory messages */}
          {totalSoporteReal > 0 && totalSoporteReal <= soporteBudget && (
            <div className="text-[9px] text-[#81b29a] font-mono leading-tight mt-1 uppercase tracking-wider">
              🛡️ {totalSoporteReal.toFixed(1)}h de soporte vital. ¡Base sostenida!
            </div>
          )}
          {totalSoporteReal > soporteBudget && (
            <div className="text-[9px] text-red-500 font-mono leading-tight mt-1 uppercase tracking-wider font-semibold">
              ⚠️ Has superado el presupuesto de soporte sugerido para hoy.
            </div>
          )}
          {totalInversionReal >= inversionBudget && inversionBudget > 0 && totalInversionReal <= (inversionBudget + 1) && (
            <div className="text-[9px] text-primary font-mono leading-tight mt-0.5 uppercase tracking-wider font-bold">
              🎉 100% de inversión disponible completado hoy.
            </div>
          )}
          {totalInversionReal > (inversionBudget + 1) && (
            <div className="text-[9px] text-orange-500 font-mono leading-tight mt-0.5 uppercase tracking-wider font-semibold">
              ⚠️ Inversión alta: considera descansar para evitar el sobreesfuerzo.
            </div>
          )}
        </div>
      </div>

      {/* Imminent Period Warning Alert */}
      {showPeriodWarning && (
        <div className="glass-matte p-4 rounded-2xl flex items-center gap-3 text-xs text-text-main animate-in slide-in-from-top-2 duration-200">
          <span className="text-lg">🩸</span>
          <div className="flex-1 text-left">
            <span className="font-bold">Alerta de Transición Cíclica:</span> Se estima que tu periodo iniciará en <span className="font-bold font-mono">{daysUntilPeriod} {daysUntilPeriod === 1 ? 'día' : 'días'}</span>. Considera planificar tareas de menor esfuerzo mental para descansar.
          </div>
        </div>
      )}





      {/* 3-Column Grid Layout for Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda (2/3): Línea de Tiempo y Pulsos */}
        <div className="lg:col-span-2 flex flex-col gap-8">

          {/* Pulsos Diarios Section */}
          {pulsos.length > 0 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <h3
                onClick={() => setShowPulsos(!showPulsos)}
                className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" /> Pulsos Diarios
                </span>
                <span className="text-[11px] text-[#a2b29f] group-hover:text-text-main transition-colors flex items-center gap-1 font-mono uppercase tracking-wider font-normal">
                  {showPulsos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showPulsos ? 'Ocultar' : 'Mostrar'}
                </span>
              </h3>

              {showPulsos && (
                <div className="flex flex-wrap gap-y-3 w-full animate-in fade-in duration-300">
                  {pulsos.map(t => {
                    const count = history.filter(h => h.taskId === t.id && isSameDay(h.date, new Date().toISOString())).length;
                    const target = t.targetCount || 1;
                    const unit = t.unitLabel || 'veces';
                    const progress = Math.min((count / target) * 100, 100);
                    const isDone = count >= target;

                    if (editingPulsoId === t.id) {
                      return (
                        <div key={t.id} className="border border-border-line p-2 flex flex-col gap-2.5 animate-in zoom-in-95 duration-200 rounded-none bg-base-dim/10 text-left">
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              className="px-2 py-0.5 bg-base border border-border-line rounded-none text-xs text-text-main focus:outline-none focus:border-[#a2b29f] w-full font-sans"
                              value={editPulsoForm.text}
                              onChange={e => setEditPulsoForm({ ...editPulsoForm, text: e.target.value })}
                              placeholder="Nombre del pulso..."
                            />
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1 text-[9px] border border-border-line rounded-none px-1.5 py-0.5 bg-base text-text-main font-mono w-fit">
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
                                  className="w-10 bg-transparent font-bold focus:outline-none text-center border-b border-border-line text-text-main"
                                  value={editPulsoForm.unitLabel}
                                  onChange={e => setEditPulsoForm({ ...editPulsoForm, unitLabel: e.target.value })}
                                  placeholder="un."
                                />
                              </div>

                              <div className="flex gap-1 flex-wrap">
                                <select
                                  className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                                  value={editPulsoForm.polaridad}
                                  onChange={e => setEditPulsoForm({ ...editPulsoForm, polaridad: e.target.value })}
                                  title="Polaridad"
                                >
                                  <option value="Reforzar">Reforzar</option>
                                  <option value="Abandonar">Abandonar</option>
                                </select>

                                <select
                                  className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
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
                                    className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
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
                                  polaridad: editPulsoForm.polaridad,
                                  category: editPulsoForm.category || undefined,
                                  subCategory: editPulsoForm.subCategory || undefined
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
                        className="relative group py-1.5 px-3 flex items-center bg-transparent rounded-none transition-all animate-in zoom-in-95 duration-200 text-left flex-none w-fit min-w-[160px] max-w-[220px] border-r border-border-line/30 last:border-r-0 gap-2"
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          {/* Top row: text and badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-medium text-text-main truncate" title={t.text}>{t.text}</h4>
                            {t.category && (
                              <CategoryBadge area={t.category} subCategory={t.subCategory} config={config} />
                            )}
                            {t.polaridad && (
                              <span className="text-[7.5px] font-mono uppercase tracking-wider px-1 py-0.2 rounded-full border border-dashed border-border-line/50 text-text-dim leading-none">
                                {t.polaridad === 'Abandonar' ? '📉' : '📈'}
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="h-[1.5px] w-full bg-[#efede8]/60 dark:bg-border-line/50 relative rounded-none overflow-hidden">
                            <div className={cn("h-full transition-all duration-300 absolute top-0 left-0", isDone ? "bg-[#81b29a]" : "bg-[#73c2b8]")} style={{ width: `${progress}%` }}></div>
                          </div>

                          {/* Bottom row: Counter adjuster and count indicator */}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onUpdateTask(t.id, { currentCount: Math.max(0, count - 1), completed: Math.max(0, count - 1) >= target })}
                                className="w-[28px] h-[28px] rounded-full border border-border-line flex items-center justify-center text-xs text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-all cursor-pointer bg-transparent font-medium shrink-0"
                                title="Decrementar"
                              >
                                -
                              </button>
                              <button
                                onClick={() => onUpdateTask(t.id, { currentCount: Math.min(target * 2, count + 1), completed: (count + 1) >= target })}
                                className="w-[28px] h-[28px] rounded-full border border-[#73c2b8]/40 flex items-center justify-center text-xs text-[#73c2b8] hover:bg-[#73c2b8]/10 hover:text-text-main transition-all cursor-pointer bg-transparent font-medium shrink-0"
                                title="Incrementar"
                              >
                                +
                              </button>
                            </div>

                            <span className="text-[10px] font-mono text-text-dim leading-none">
                              {count} <span className="opacity-60">/ {target} {unit}</span>
                            </span>
                            {isDone && <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-[#81b29a] leading-none">Listo</span>}
                          </div>
                        </div>

                        {/* 3-dots Options Menu */}
                        <div className="relative flex items-center justify-center shrink-0 border-l border-border-line/70 pl-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditPulsoForm({
                                      text: t.text,
                                      targetCount: t.targetCount || 1,
                                      unitLabel: t.unitLabel || 'veces',
                                      polaridad: t.polaridad || 'Reforzar',
                                      category: t.category || '',
                                      subCategory: t.subCategory || ''
                                    });
                                    setEditingPulsoId(t.id);
                                    setOpenMenuPulsoId(null);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                                >
                                  <Edit2 className="w-3 h-3 text-text-dim" />
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
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
            </div>
          )}

          {/* Línea de Tiempo Section */}
          <div className={cn("flex flex-col gap-4", pulsos.length > 0 && "border-t border-border-line pt-8")}>
            <div className="flex items-center justify-between border-b border-border-line/30 pb-2">
              <h3
                onClick={() => setShowTimeline(!showTimeline)}
                className="text-subtitle flex items-center gap-2 cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                <Clock className="w-4 h-4 text-text-main silhouette-icon" /> Línea de Tiempo
              </h3>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate?.('configuracion')}
                  className="text-[10px] text-text-dim hover:text-text-main font-mono uppercase tracking-wider cursor-pointer bg-transparent border-0 underline underline-offset-4"
                >
                  Configurar bloques
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="text-[11px] text-[#a2b29f] hover:text-text-main flex items-center gap-1 font-mono uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                >
                  {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showTimeline ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {showTimeline && (
              <div className="space-y-1 bg-transparent min-h-[100px] animate-in fade-in duration-200">
                {timedItems.length === 0 ? (
                  <p className="text-xs text-[#a2b29f] whitespace-nowrap w-max text-left pl-2">No hay tareas programadas con hora para hoy.</p>
                ) : (
                  <TimelineRenderer
                    items={timedItems}
                    config={config}
                    onToggleTask={onToggleTask}
                    allTasks={tasks}
                    onDeleteTask={onDeleteTask}
                    onUpdateTask={onUpdateTask}
                    onAddTask={onAddTask}
                    activeTimer={activeTimer}
                    onStartTimer={onStartTimer}
                    history={history}
                    onUpdateConfig={onUpdateConfig}
                    onNavigate={onNavigate}
                  />
                )}
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha (1/3): Tareas Flexibles y Backlog */}
        <div className="lg:col-span-1 flex flex-col gap-8 lg:border-l lg:border-border-line lg:pl-8">

          {/* Tareas Flexibles Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3
                onClick={() => setShowFlexible(!showFlexible)}
                className="text-subtitle flex items-center gap-2 cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                <Inbox className="w-4 h-4 text-text-main silhouette-icon" /> Tareas Flexibles
                <span className="text-[11px] text-[#a2b29f] group-hover:text-text-main transition-colors flex items-center gap-1 font-mono uppercase tracking-wider font-normal ml-2">
                  {showFlexible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showFlexible ? 'Ocultar' : 'Mostrar'}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <SortDropdown
                  options={[
                    { label: 'Orden manual', value: 'manual' },
                    { label: 'Prioridad', value: 'priority' },
                    { label: 'Fecha de creación', value: 'date' },
                    { label: 'Alfabético', value: 'name' }
                  ]}
                  currentValue={sortFlexiblesBy}
                  onChange={setSortFlexiblesBy}
                />
              </div>
            </div>

            {showFlexible && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {untimedTasks.length === 0 ? (
                  <p className="text-xs text-[#a2b29f] whitespace-nowrap w-max text-left pl-2">Sin elementos flexibles.</p>
                ) : (
                  getSortedTasks(untimedTasks, sortFlexiblesBy).map(t => (
                    <div 
                      key={t.id} 
                      draggable={sortFlexiblesBy === 'manual'}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); setDraggedId(t.id); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, t.id, untimedTasks)}
                      className={cn(sortFlexiblesBy === 'manual' ? "cursor-grab active:cursor-grabbing" : "")}
                    >
                      <TaskItem
                        task={t}
                        config={config}
                        allTasks={tasks}
                        history={history}
                        onToggle={onToggleTask}
                        onDelete={() => onDeleteTask(t.id)}
                        onUpdate={onUpdateTask}
                        onAddTask={onAddTask}
                        onDeleteTask={onDeleteTask}
                        activeTimer={activeTimer}
                        onStartTimer={onStartTimer}
                        onNavigate={onNavigate}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Backlog Section */}
          <div className="flex flex-col gap-4 border-t border-border-line pt-8">
            <div className="flex items-center justify-between">
              <h3
                onClick={() => setShowBacklog(!showBacklog)}
                className="text-subtitle flex items-center gap-2 cursor-pointer group hover:opacity-85 transition-all select-none"
              >
                <Database className="w-4 h-4 text-text-main silhouette-icon" /> Backlog
                <span className="text-[11px] text-[#a2b29f] group-hover:text-text-main transition-colors flex items-center gap-1 font-mono uppercase tracking-wider font-normal ml-2">
                  {showBacklog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showBacklog ? 'Ocultar' : 'Mostrar'}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <SortDropdown
                  options={[
                    { label: 'Orden manual', value: 'manual' },
                    { label: 'Prioridad', value: 'priority' },
                    { label: 'Fecha de creación', value: 'date' },
                    { label: 'Alfabético', value: 'name' }
                  ]}
                  currentValue={sortBacklogBy}
                  onChange={setSortBacklogBy}
                />
              </div>
            </div>

            {showBacklog && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {backlogTasks.length === 0 ? (
                  <p className="text-xs text-[#a2b29f] whitespace-nowrap w-max text-left pl-2">Backlog vacío. Buen trabajo.</p>
                ) : (
                  getSortedTasks(backlogTasks, sortBacklogBy).map(t => (
                    <div 
                      key={t.id}
                      draggable={sortBacklogBy === 'manual'}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); setDraggedId(t.id); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, t.id, backlogTasks)}
                      className={cn(sortBacklogBy === 'manual' ? "cursor-grab active:cursor-grabbing" : "")}
                    >
                      <TaskItem
                        task={t}
                        config={config}
                        allTasks={tasks}
                        history={history}
                        onToggle={onToggleTask}
                        onDelete={() => onDeleteTask(t.id)}
                        onUpdate={onUpdateTask}
                        onAddTask={onAddTask}
                        onDeleteTask={onDeleteTask}
                        activeTimer={activeTimer}
                        onStartTimer={onStartTimer}
                        onNavigate={onNavigate}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function TimelineRenderer({
  items,
  config,
  onToggleTask,
  allTasks,
  onDeleteTask,
  onUpdateTask,
  onAddTask,
  activeTimer,
  onStartTimer,
  history = [],
  onUpdateConfig,
  onNavigate
}: {
  items: any[],
  config: Config | null,
  onToggleTask: (task: AppTask) => void,
  allTasks: AppTask[],
  onDeleteTask: (id: string) => void,
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void,
  onAddTask: (task: Omit<AppTask, 'id'>) => void,
  activeTimer?: { taskId: string; isRunning: boolean } | null,
  onStartTimer?: (taskId: string) => void,
  history?: HistoryRecord[],
  onUpdateConfig?: (c: Partial<Config>) => void,
  onNavigate?: (view: string, taskId?: string) => void
}) {
  let lastEndTimeMins: number | null = null;
  let activeSeparatorColor: string | null = null;
  const renderedItems = [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHora, setEditHora] = useState('');
  const [editText, setEditText] = useState('');
  const [editDetalle, setEditDetalle] = useState('');

  for (let i = 0; i < items.length; i++) {
    const t = items[i];
    const startMins = timeToMins(t.hora);

    if (t.isSeparator) {
      activeSeparatorColor = t.color || null;
      const idx = t.separatorIndex;
      if (editingId === `sep-${i}`) {
        renderedItems.push(
          <div key={`sep-${i}`} className="relative flex flex-col items-center py-3 my-1 animate-in fade-in duration-150">
            <div className="flex gap-2 items-center mb-2 justify-center flex-wrap">
              <input
                type="text"
                placeholder="08:00"
                value={editHora}
                onChange={e => setEditHora(e.target.value)}
                className="px-2 py-0.5 text-xs font-mono border-b border-border-line bg-transparent text-primary focus:outline-none w-16 text-center"
              />
              <input
                type="text"
                placeholder="Mañana"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="px-2 py-0.5 text-xs font-mono font-bold border-b border-border-line bg-transparent text-text-main focus:outline-none w-28 text-center"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (!config || !config.separators || !onUpdateConfig) return;
                    const newSeps = [...config.separators];
                    newSeps[idx] = {
                      hora: editHora || '08:00',
                      text: editText.trim() || 'Bloque',
                      detalle: editDetalle.trim()
                    };
                    onUpdateConfig({ separators: newSeps });
                    setEditingId(null);
                  }
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
              <span className="text-xs text-text-dim font-light font-sans">(</span>
              <input
                type="text"
                placeholder="Foco e inicio"
                value={editDetalle}
                onChange={e => setEditDetalle(e.target.value)}
                className="px-2 py-0.5 text-xs font-sans font-light border-b border-border-line bg-transparent text-text-dim focus:outline-none w-36 text-center"
              />
              <span className="text-xs text-text-dim font-light font-sans">)</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingId(null)} className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none">Cancelar</button>
              <button onClick={() => {
                if (!config || !config.separators || !onUpdateConfig) return;
                const newSeps = [...config.separators];
                newSeps[idx] = {
                  hora: editHora || '08:00',
                  text: editText.trim() || 'Bloque',
                  detalle: editDetalle.trim()
                };
                onUpdateConfig({ separators: newSeps });
                setEditingId(null);
              }} className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none">Guardar</button>
            </div>
          </div>
        );
      } else {
        const getBorderClass = (c: string) => {
          const valid = ['slate', 'blue', 'orange', 'purple', 'emerald', 'amber', 'red', 'green', 'teal', 'cyan'];
          return valid.includes(c) ? `border-${c}-500/50` : 'border-border-line/50';
        };
        const getTextClass = (c: string) => {
          const valid = ['slate', 'blue', 'orange', 'purple', 'emerald', 'amber', 'red', 'green', 'teal', 'cyan'];
          return valid.includes(c) ? `text-${c}-600` : 'text-primary';
        };

        const colorBorderClasses = getBorderClass(t.color || '');
        const colorTextClasses = getTextClass(t.color || '');

        renderedItems.push(
          <div key={`sep-${i}`} className="relative flex items-center py-3 my-1 opacity-80 group">
            <div className={cn("flex-grow border-t border-dashed", colorBorderClasses)}></div>
            <div className="relative group/sep">
              <span className={cn("flex-shrink-0 mx-4 text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-default", colorTextClasses)}>
                {t.hora} - {t.text} {t.detalle && <span className={t.color ? colorTextClasses + ' font-sans font-light opacity-80' : 'text-text-dim ml-1 font-sans font-light'}>({t.detalle})</span>}
              </span>
            </div>
            <div className={cn("flex-grow border-t border-dashed", colorBorderClasses)}></div>
          </div>
        );
      }
    } else if (t.isRecord) {
      const areaConfig = config?.areas?.[t.category || ''];
      const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
      const canStartTimer = t.originalRecord?.taskId && onStartTimer && activeTimer?.taskId !== t.originalRecord.taskId;

      renderedItems.push(
        <div
          key={t.id}
          onClick={() => {
            if (canStartTimer) {
              onStartTimer(t.originalRecord.taskId);
            }
          }}
          className={cn(
            "relative flex items-center justify-between py-2.5 border-b border-border-line/20 pl-4 pr-3 group hover:bg-base-dim/10 transition-colors text-left select-none my-1 animate-in fade-in duration-200",
            canStartTimer && "cursor-pointer"
          )}
          title={canStartTimer ? "Hacer clic para iniciar tracker de nuevo ⏱️" : undefined}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono font-bold text-text-dim shrink-0">{t.hora}</span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#73c2b8] border border-[#73c2b8]/30 px-2 py-0.5 rounded-full leading-none flex items-center gap-1 shrink-0 bg-transparent">
              <Clock className="w-2.5 h-2.5 text-[#73c2b8]" /> log
            </span>
            <span className={cn("text-xs font-light text-text-main line-through opacity-65 truncate", canStartTimer && "group-hover:text-primary transition-colors")} title={`${t.text} (${t.type})`}>
              {t.text}
            </span>
            {t.category && (
              <CategoryBadge area={t.category} subCategory={t.subCategory} config={config} />
            )}
          </div>

          {t.type !== 'Pulso' && (
            <div className="flex items-center gap-4 text-xs font-mono font-bold text-[#73c2b8] shrink-0">
              +{t.duration.toFixed(2)}h
            </div>
          )}
        </div>
      );
    } else {
      const durationMins = (t.duracion || 0) * 60;
      const endMins = startMins + durationMins;

      if (lastEndTimeMins !== null && startMins > lastEndTimeMins) {
        renderedItems.push(
          <div key={`gap-${i}`} className="flex items-center gap-4 opacity-60 py-4 w-full">
            <div className="flex-grow border-t border-dashed border-border-line"></div>
            <span className="text-xs font-sans text-text-dim whitespace-nowrap">🍃 {startMins - lastEndTimeMins} min libres</span>
            <div className="flex-grow border-t border-dashed border-border-line"></div>
          </div>
        );
      }

      const endTimeStr = durationMins > 0 ? ` - ${minsToTime(endMins)}` : '';
      const parentTask = t.parentId ? allTasks.find(pt => pt.id === t.parentId) : null;
      const displayCategory = t.category || (parentTask ? parentTask.category : '');
      const areaConfig = config?.areas?.[displayCategory || ''];
      const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

      // Planned vs Executed comparison
      const todayExecRecords = history.filter(h => h.taskId === t.id && isSameDay(h.date, new Date().toISOString()));
      const totalExecutedHours = todayExecRecords.reduce((acc, h) => acc + (h.duration || 0), 0);
      const plannedHours = t.duracion || 0;
      const hasComparison = plannedHours > 0 || totalExecutedHours > 0;

      const validColors = ['slate', 'blue', 'orange', 'purple', 'emerald', 'amber', 'red', 'green', 'teal', 'cyan'];
      const brumaClass = validColors.includes(activeSeparatorColor || '') 
        ? `bg-gradient-to-r from-${activeSeparatorColor}-500/5 to-transparent` 
        : '';

      renderedItems.push(
        <div key={t.id} className="relative flex flex-col mb-4">
          <div className={cn("flex items-stretch gap-2 rounded-r-md transition-colors", brumaClass)}>
            <div className="w-0.5 flex-shrink-0" style={{ backgroundColor: `var(--color-${color}-400, #94a3b8)` }}></div>
            <div className="flex-1 w-full py-1 pr-1">
              <TaskItem
                task={t}
                config={config}
                allTasks={allTasks}
                history={history}
                onToggle={onToggleTask}
                onDelete={() => onDeleteTask(t.id)}
                onUpdate={onUpdateTask}
                onAddTask={onAddTask}
                onDeleteTask={onDeleteTask}
                activeTimer={activeTimer}
                onStartTimer={onStartTimer}
                onNavigate={onNavigate}
              />
            </div>
          </div>

          {hasComparison && (
            <div className="mt-1 ml-8 pb-3 flex items-center gap-3 text-[11px] text-[#5d5d5d] font-mono">
              <span className="opacity-80">⏱️ AUDITORÍA:</span>
              <span className="font-bold text-text-main">{totalExecutedHours.toFixed(2)}h real</span>
              <span className="opacity-60">/ {plannedHours}h plan</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full border text-[9px] font-sans tracking-wide",
                totalExecutedHours === 0 ? "border-border-line text-text-dim/60 bg-transparent" :
                  Math.abs(totalExecutedHours - plannedHours) < 0.05 ? "border-[#73c2b8] text-[#73c2b8] bg-[#73c2b8]/10" :
                    totalExecutedHours > plannedHours ? "border-[#e69138]/60 text-[#b45f06] bg-[#e69138]/5" :
                      "border-[#a2b29f]/60 text-text-dim"
              )}>
                {totalExecutedHours === 0 ? "Sin iniciar" :
                  Math.abs(totalExecutedHours - plannedHours) < 0.05 ? "¡Clavado!" :
                    totalExecutedHours > plannedHours ? `Exceso +${(totalExecutedHours - plannedHours).toFixed(2)}h` :
                      `Resta -${(plannedHours - totalExecutedHours).toFixed(2)}h`}
              </span>
            </div>
          )}
        </div>
      );

      lastEndTimeMins = Math.max(lastEndTimeMins || 0, endMins);
    }
  }

  return <>{renderedItems}</>;
}
