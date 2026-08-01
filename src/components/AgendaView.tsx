import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Package, Clock, Calendar as CalendarIcon, Edit3, Trash2, X } from 'lucide-react';
import { AppTask, Config, HistoryRecord, Separator } from '../types';
import { cn, timeToMins, minsToTime, getEffectiveAllocation } from '../lib/utils';
import { getAppearanceDate, isAppearanceScheduledOnDate } from '../domain/appearance';
import CategoryBadge from './ui/CategoryBadge';
import AllocationBadge from './ui/AllocationBadge';
import UniversalItemForm from './UniversalItemForm';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history?: HistoryRecord[];
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onAddTask?: (task: Partial<AppTask>) => void;
  onDeleteTask?: (id: string) => void;
  onNavigate?: (view: string, taskId?: string) => void;
}

interface TaskSpan {
  task: AppTask;
  startDay: number; // 0..6
  spanCount: number; // 1..7
  days: number[];
}

/** Derive area color string for a task */
function resolveAreaColor(task: AppTask, config: Config | null): string {
  if (!task.category || !config?.areas?.[task.category]) return 'slate';
  const area = config.areas[task.category];
  return typeof area === 'string' ? area : area.color;
}

/** Left-border Tailwind color class mapping */
function getLeftBorderClass(color: string): string {
  const map: Record<string, string> = {
    slate: 'border-l-slate-400',
    blue: 'border-l-blue-400',
    orange: 'border-l-orange-400',
    purple: 'border-l-purple-400',
    emerald: 'border-l-emerald-400',
    amber: 'border-l-amber-400',
    red: 'border-l-red-400',
    green: 'border-l-green-400',
    teal: 'border-l-teal-400',
    cyan: 'border-l-cyan-400',
  };
  return map[color] || map.slate;
}

/** Format duration as human-readable short string */
function formatDuration(hours: number | undefined): string | null {
  if (!hours || hours <= 0) return null;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours % 1 === 0) return `${hours}h`;
  return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
}

/** Calculate estimated duration for a task, project, or routine */
function resolveTaskDuration(task: AppTask, allTasks: AppTask[]): number | undefined {
  if (task.duracion && task.duracion > 0) return task.duracion;

  if (task.type === 'Proyecto') {
    const subtasks = allTasks.filter(t => t.parentId === task.id && !t.completed);
    const sum = subtasks.reduce((acc, t) => acc + (t.duracion || 0), 0);
    return sum > 0 ? sum : undefined;
  }

  if (task.type === 'Rutina') {
    const childHabits = allTasks.filter(t => t.parentId === task.id && !t.completed);
    const sum = childHabits.reduce((acc, t) => acc + (t.duracion || 0), 0);
    return sum > 0 ? sum : undefined;
  }

  return undefined;
}

/** Format Date to YYYY-MM-DD */
function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Check if task is completed or worked on today */
function isTaskWorkedToday(task: AppTask, history: HistoryRecord[] = []): boolean {
  if (task.completed) return true;
  const todayISO = formatDateISO(new Date());
  return history.some(r => r.taskId === task.id && r.date === todayISO);
}

/** Check if task has urgent deadline (due today or overdue) */
function isTaskUrgent(task: AppTask): boolean {
  if (!task.fechaLimite) return false;
  const todayISO = formatDateISO(new Date());
  return task.fechaLimite <= todayISO;
}

/** Check if a separator applies on a given ISO weekday (1=Mon..7=Sun) */
function separatorAppliesToDay(sep: Separator, isoWeekday: number): boolean {
  if (!sep.weekdays?.length) return true;
  return sep.weekdays.includes(isoWeekday);
}

/** Get ISO weekday from Date (1=Mon..7=Sun) */
function getIsoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export default function AgendaView({ config, tasks, history = [], onUpdateTask, onAddTask, onDeleteTask, onNavigate }: Props) {
  // --- Navigation ---
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // UI state
  const [pendientesOpen, setPendientesOpen] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1;
  });

  // Accordion state per time slot (slotIdx -> boolean)
  const [openSlots, setOpenSlots] = useState<Record<number, boolean>>({});

  const gridScrollRef = useRef<HTMLDivElement>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const handlePrevWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setWeekStart(new Date(d.setDate(diff)));
  };

  // --- Data categorization ---
  const separators = useMemo(() => {
    return [...(config?.separators || [])].sort((a, b) => a.hora.localeCompare(b.hora));
  }, [config?.separators]);

  // Group separators by time range slots
  const timeSlots = useMemo(() => {
    const times = Array.from(new Set<string>(separators.map(s => s.hora))).sort();
    return times.map((t, idx) => {
      const nextTime = idx < times.length - 1 ? times[idx + 1] : '23:59';
      const sepsForTime = separators.filter(s => s.hora === t);
      return {
        startTime: t,
        endTime: nextTime,
        separators: sepsForTime,
        startMins: timeToMins(t),
        endMins: timeToMins(nextTime) || 24 * 60,
      };
    });
  }, [separators]);

  // Default open slot logic: Only current time slot is open by default
  useEffect(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const initial: Record<number, boolean> = {};

    timeSlots.forEach((slot, idx) => {
      initial[idx] = currentMins >= slot.startMins && currentMins < slot.endMins;
    });

    if (!Object.values(initial).some(Boolean) && timeSlots.length > 0) {
      initial[0] = true;
    }

    setOpenSlots(initial);
  }, [timeSlots]);

  const toggleSlot = (slotIdx: number) => {
    setOpenSlots(prev => ({ ...prev, [slotIdx]: !prev[slotIdx] }));
  };

  // Filter tasks (include Proyecto and Rutina containers, exclude subtasks of projects/routines which inherit parent)
  const eligibleTasks = useMemo(() => {
    return tasks.filter(t =>
      !t.completed &&
      t.type !== 'Pulso' &&
      !(t.type === 'Hábito' && t.parentId) &&
      !(t.parentId && tasks.some(p => p.id === t.parentId && (p.type === 'Proyecto' || p.type === 'Rutina')))
    );
  }, [tasks]);

  // Weekly Pending Tasks (Unique for the whole week): Scheduled on any day of current week, but NO hora
  const weeklyPendingTasks = useMemo(() => {
    return eligibleTasks.filter(t => {
      if (t.hora) return false;
      return weekDays.some(date => isAppearanceScheduledOnDate(t, date));
    });
  }, [eligibleTasks, weekDays]);

  // Backlog Tasks (formerly Flexibles): No date, no hora
  const backlogTasks = useMemo(() => {
    return eligibleTasks.filter(t => !t.hora && !getAppearanceDate(t));
  }, [eligibleTasks]);

  // Scheduled Tasks for a specific date (has hora and scheduled on date)
  const getScheduledForDate = (date: Date) => {
    return eligibleTasks.filter(t => t.hora && isAppearanceScheduledOnDate(t, date));
  };

  // Find slot index for a given time
  const getSlotIdxForTime = (timeStr: string): number => {
    const mins = timeToMins(timeStr);
    for (let i = timeSlots.length - 1; i >= 0; i--) {
      if (mins >= timeSlots[i].startMins) return i;
    }
    return 0;
  };

  // Total items scheduled in a specific slot across the week
  const getSlotWeeklyItemCount = (slotIdx: number) => {
    let total = 0;
    weekDays.forEach(d => {
      total += getScheduledForDate(d).filter(t => getSlotIdxForTime(t.hora!) === slotIdx).length;
    });
    return total;
  };

  // Compute Task Spans across consecutive days in a slot
  const computeSlotTaskSpans = (slotIdx: number): TaskSpan[] => {
    const dayTasksMap = new Map<number, AppTask[]>();
    weekDays.forEach((date, dayIdx) => {
      const tasksForDay = getScheduledForDate(date).filter(t => getSlotIdxForTime(t.hora!) === slotIdx);
      dayTasksMap.set(dayIdx, tasksForDay);
    });

    const taskMap = new Map<string, AppTask>();
    dayTasksMap.forEach(taskList => {
      taskList.forEach(t => taskMap.set(t.id, t));
    });

    const spans: TaskSpan[] = [];

    taskMap.forEach((task, taskId) => {
      const appearingDays: number[] = [];
      for (let d = 0; d < 7; d++) {
        const list = dayTasksMap.get(d) || [];
        if (list.some(t => t.id === taskId)) {
          appearingDays.push(d);
        }
      }

      if (appearingDays.length > 0) {
        let currentStart = appearingDays[0];
        let currentCount = 1;
        let currentDays = [appearingDays[0]];

        for (let i = 1; i < appearingDays.length; i++) {
          const day = appearingDays[i];
          if (day === appearingDays[i - 1] + 1) {
            currentCount++;
            currentDays.push(day);
          } else {
            spans.push({
              task,
              startDay: currentStart,
              spanCount: currentCount,
              days: currentDays,
            });
            currentStart = day;
            currentCount = 1;
            currentDays = [day];
          }
        }
        spans.push({
          task,
          startDay: currentStart,
          spanCount: currentCount,
          days: currentDays,
        });
      }
    });

    return spans;
  };

  // Direct navigation on item click (no modal)
  const handleItemClick = (task: AppTask) => {
    if (!onNavigate) return;

    if (task.type === 'Proyecto') {
      onNavigate('proyectos', task.id);
    } else if (task.type === 'Rutina') {
      onNavigate('rutinas', task.id);
    } else if (task.type === 'Hábito') {
      const parentRutina = task.parentId ? tasks.find(p => p.id === task.parentId && p.type === 'Rutina') : undefined;
      const parentProyecto = task.parentId ? tasks.find(p => p.id === task.parentId && p.type === 'Proyecto') : undefined;
      if (parentRutina) {
        onNavigate('rutinas', parentRutina.id);
      } else if (parentProyecto) {
        onNavigate('proyectos', parentProyecto.id);
      } else {
        onNavigate('rutinas', task.id);
      }
    } else {
      // Tarea
      const parentProyecto = task.parentId ? tasks.find(p => p.id === task.parentId && p.type === 'Proyecto') : undefined;
      if (parentProyecto) {
        onNavigate('proyectos', parentProyecto.id);
      } else {
        onNavigate('proyectos', task.id);
      }
    }
  };

  // Scroll to day on mobile pill click
  const scrollToDay = (dayIdx: number) => {
    const el = gridScrollRef.current;
    if (!el) return;
    const col = el.querySelector(`[data-day-col="${dayIdx}"]`) as HTMLElement;
    if (col) {
      el.scrollTo({ left: col.offsetLeft, behavior: 'smooth' });
    }
    setActiveDayIdx(dayIdx);
  };

  // Render a task card
  const renderTaskCard = (task: AppTask, spanCount: number = 1, spannedDays: number[] = []) => {
    const areaColor = resolveAreaColor(task, config);
    const durationHours = resolveTaskDuration(task, tasks);
    const durationLabel = formatDuration(durationHours);
    const workedToday = isTaskWorkedToday(task, history);
    const urgent = isTaskUrgent(task);
    const allocation = getEffectiveAllocation(task, tasks);

    const spanLabel = spanCount > 1
      ? `${dayNames[spannedDays[0]]} — ${dayNames[spannedDays[spannedDays.length - 1]]}`
      : null;

    return (
      <div
        key={task.id}
        onClick={() => handleItemClick(task)}
        className={cn(
          "flex flex-col gap-1.5 p-2 rounded-none border-l-3 border-t-0 border-r-0 border-b-0 cursor-pointer transition-all text-xs leading-snug group w-full",
          getLeftBorderClass(areaColor),
          workedToday
            ? "opacity-50 grayscale-[40%] bg-transparent"
            : urgent
              ? "bg-amber-500/10 dark:bg-amber-500/15"
              : "bg-transparent hover:bg-base-dim/20"
        )}
      >
        {/* Title row + duration / span indicator top right */}
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <span className="font-medium text-text-main group-hover:text-primary transition-colors line-clamp-2 leading-tight">
            {task.text}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {spanLabel && (
              <span className="font-mono text-[8px] uppercase text-primary font-bold bg-primary/10 px-1 py-0.2 rounded-none border border-primary/20">
                {spanLabel}
              </span>
            )}
            {durationLabel && (
              <span className="font-mono text-[9px] text-text-dim/80 px-1 py-0.2 rounded-none">
                {durationLabel}
              </span>
            )}
          </div>
        </div>

        {/* Metadata Badges Row (Muji Minimalist: Type text without icon + Allocation Icon + Category Badge) */}
        <div className="flex flex-wrap gap-1.5 items-center mt-0.5">
          {/* Type text only (no icon) */}
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-text-dim px-1 py-0.2 rounded-none bg-base-dim/30">
            {task.type}
          </span>

          {/* Allocation icon only */}
          {allocation && (
            <AllocationBadge allocation={allocation} iconOnly />
          )}

          {/* Category / Area Badge */}
          {task.category && (
            <CategoryBadge area={task.category} subCategory={task.subCategory} config={config} />
          )}
        </div>
      </div>
    );
  };

  if (!config) return null;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const headerLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${monthNames[weekStart.getMonth()]} – ${monthNames[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div className="w-full flex flex-col text-left animate-in fade-in space-y-0">
      {/* Week Navigation Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border-line/30 bg-base">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 hover:bg-base-dim rounded-none cursor-pointer transition-colors border-0 bg-transparent text-text-dim"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-mono uppercase tracking-widest font-bold text-text-main min-w-[150px] text-center">
            {headerLabel}
          </h2>
          <button
            onClick={handleNextWeek}
            className="p-1.5 hover:bg-base-dim rounded-none cursor-pointer transition-colors border-0 bg-transparent text-text-dim"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0 outline-none transition-colors"
        >
          Semana Actual
        </button>
      </div>

      {/* Day Pills for Mobile */}
      <div className="flex md:hidden gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-b border-border-line/20 bg-base">
        {weekDays.map((date, idx) => {
          const isToday = isSameDay(date, new Date());
          const isActive = activeDayIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => scrollToDay(idx)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-none transition-all border-0 cursor-pointer",
                isActive
                  ? "bg-text-main text-[var(--base-bg)] font-bold"
                  : isToday
                    ? "bg-accent/15 text-accent font-semibold"
                    : "bg-transparent text-text-dim hover:text-text-main"
              )}
            >
              <span className="text-[9px] font-mono uppercase tracking-widest">{dayNames[idx]}</span>
              <span className="text-xs font-mono">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      {/* Unified Weekly Pending Banner (Single row for the whole week) */}
      <div className="border-b border-border-line/30 bg-base">
        <button
          onClick={() => setPendientesOpen(!pendientesOpen)}
          className="flex items-center justify-between w-full px-4 md:px-6 py-2.5 text-left hover:bg-base-dim/20 transition-colors border-0 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {pendientesOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-dim" /> : <ChevronRight className="w-3.5 h-3.5 text-text-dim" />}
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-main font-bold flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-500" /> Pendientes de la Semana
            </span>
            <span className="text-[9px] font-mono text-text-dim/70 bg-base-dim px-1.5 py-0.5 rounded-none">
              {weeklyPendingTasks.length}
            </span>
          </div>
          <span className="text-[9px] font-mono text-text-dim/60 hidden sm:inline">
            (Tareas agendadas esta semana sin hora asignada)
          </span>
        </button>

        {pendientesOpen && (
          <div className="px-4 md:px-6 py-2.5 border-t border-border-line/15 bg-base">
            {weeklyPendingTasks.length === 0 ? (
              <div className="text-[10px] text-text-dim/50 font-mono py-1">
                ✓ No hay tareas pendientes de asignar en esta semana
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {weeklyPendingTasks.map(task => renderTaskCard(task))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid View */}
      <div className="w-full flex flex-col">

        {/* Sticky 7-Day Header Row */}
        <div className="sticky top-0 z-20 flex bg-base border-b border-border-line/40 shadow-2xs">
          <div className="flex-1 flex overflow-x-auto no-scrollbar snap-x snap-mandatory" ref={gridScrollRef}>
            {weekDays.map((date, idx) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={idx}
                  data-day-col={idx}
                  className={cn(
                    "flex-1 min-w-[150px] md:min-w-0 snap-center flex flex-col items-center justify-center py-2 border-r border-border-line/20 last:border-r-0",
                    isToday ? "bg-accent/10" : ""
                  )}
                >
                  <span className={cn(
                    "text-[9px] font-mono uppercase tracking-widest",
                    isToday ? "text-accent font-bold" : "text-text-dim"
                  )}>
                    {dayNames[idx]}
                  </span>
                  <span className={cn(
                    "text-xs font-bold font-mono",
                    isToday ? "text-accent" : "text-text-main"
                  )}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Accordion Block Time Slots */}
        <div className="w-full">
          {timeSlots.map((slot, slotIdx) => {
            const isOpen = Boolean(openSlots[slotIdx]);
            const itemCount = getSlotWeeklyItemCount(slotIdx);
            const isCurrentTimeSlot = currentMins >= slot.startMins && currentMins < slot.endMins;
            const taskSpans = isOpen ? computeSlotTaskSpans(slotIdx) : [];

            return (
              <div key={slotIdx} className="border-b border-border-line/25 last:border-b-0 w-full">
                
                {/* Full-width Accordion Block Header Row */}
                <button
                  onClick={() => toggleSlot(slotIdx)}
                  className={cn(
                    "w-full px-4 md:px-6 py-2.5 flex items-center justify-between text-left transition-colors border-y border-border-line/15 cursor-pointer outline-none",
                    isCurrentTimeSlot
                      ? "bg-accent/15 hover:bg-accent/20"
                      : "bg-base-dim/25 hover:bg-base-dim/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-text-dim">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>

                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-text-main flex items-center gap-2">
                      {slot.startTime} {slot.endTime !== '23:59' ? `— ${slot.endTime}` : ''}
                      {isCurrentTimeSlot && (
                        <span className="text-[8px] bg-accent text-white px-1.5 py-0.2 rounded-none font-bold animate-pulse">
                          AHORA
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      {slot.separators.map((sep, idx) => (
                        <span key={idx} className="text-[9px] font-mono text-text-dim flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sep.color ? `var(--color-${sep.color}-500, #a2b29f)` : '#a2b29f' }} />
                          <span className="font-medium text-text-main">{sep.text}</span>
                          {sep.detalle && <span className="opacity-60 hidden sm:inline">({sep.detalle})</span>}
                          {sep.weekdays?.length && (
                            <span className="text-[8px] bg-base-dim px-1 rounded-none text-text-dim/80">
                              {sep.weekdays.map(d => dayNames[d - 1]).join(', ')}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Summary counter when collapsed or right side */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-text-dim/70 bg-base px-1.5 py-0.5 rounded-none border border-border-line/30">
                      {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                    </span>
                  </div>
                </button>

                {/* 7-Column Unified CSS Grid for Accordion Content (Expands naturally vertically) */}
                {isOpen && (
                  <div className="grid grid-cols-7 min-w-[700px] md:min-w-0 w-full p-2 gap-2 border-b border-border-line/15 bg-base animate-in fade-in duration-150">
                    {/* Render Spanned Tasks in single Unified Grid flow */}
                    {taskSpans.map((spanItem, idx) => (
                      <div
                        key={idx}
                        style={{
                          gridColumnStart: spanItem.startDay + 1,
                          gridColumnEnd: `span ${spanItem.spanCount}`,
                        }}
                        className="flex"
                      >
                        {renderTaskCard(spanItem.task, spanItem.spanCount, spanItem.days)}
                      </div>
                    ))}

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Drawer: Backlog (Unscheduled tasks) */}
        <div className="border-t border-border-line/30 bg-base mt-auto">
          <button
            onClick={() => setBacklogOpen(!backlogOpen)}
            className="flex items-center justify-between w-full px-4 md:px-6 py-2.5 text-left hover:bg-base-dim/20 transition-colors border-0 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {backlogOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-dim" /> : <ChevronRight className="w-3.5 h-3.5 text-text-dim" />}
              <Package className="w-3.5 h-3.5 text-text-dim" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-main font-bold">
                Backlog
              </span>
              <span className="text-[9px] font-mono text-text-dim/70 bg-base-dim px-1.5 py-0.5 rounded-none">
                {backlogTasks.length}
              </span>
            </div>
            <span className="text-[9px] font-mono text-text-dim/60 hidden sm:inline">
              (Tareas e ideas sin fecha ni hora fijada en el sistema)
            </span>
          </button>

          {backlogOpen && (
            <div className="px-4 md:px-6 py-3 border-t border-border-line/15 bg-base max-h-48 overflow-y-auto no-scrollbar">
              {backlogTasks.length === 0 ? (
                <div className="text-[10px] text-text-dim/50 font-mono py-2 text-center">
                  No hay tareas en el backlog
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {backlogTasks.map(task => renderTaskCard(task))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
