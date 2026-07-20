import React, { useState, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppTask, Config } from '../types';
import { cn, timeToMins, minsToTime, getAreaColorClasses } from '../lib/utils';
import { getAppearanceDate, isAppearanceScheduledOnDate } from '../domain/appearance';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  currentWeekStart?: Date;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00
const PIXELS_PER_HOUR = 80;
const SNAP_MINUTES = 15;

export default function CalendarioSemanalView({ config, tasks, onUpdateTask, currentWeekStart: propWeekStart }: Props) {
  const [internalWeekStart, setInternalWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  });

  const currentWeekStart = propWeekStart || internalWeekStart;

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    setInternalWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setInternalWeekStart(prev => {
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
    setInternalWeekStart(new Date(d.setDate(diff)));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => !t.completed && t.type !== 'Proyecto' && t.type !== 'Pulso' && !(t.type === 'Hábito' && t.parentId));
  }, [tasks]);

  const getScheduledTasksForDate = (date: Date) => {
    return filteredTasks.filter(t => {
      if (!t.hora) return false;
      return isAppearanceScheduledOnDate(t, date);
    });
  };

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter(t => !t.hora || !getAppearanceDate(t));
  }, [filteredTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Transparent drag image hack
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const column = e.currentTarget as HTMLElement;
    const rect = column.getBoundingClientRect();
    const y = e.clientY - rect.top + column.scrollTop;
    
    const startHour = HOURS[0];
    const pixelsPerMinute = PIXELS_PER_HOUR / 60;
    
    const minutesFromStart = y / pixelsPerMinute;
    const snappedMinutes = Math.round(minutesFromStart / SNAP_MINUTES) * SNAP_MINUTES;
    const totalMinutes = startHour * 60 + snappedMinutes;
    
    const newTime = minsToTime(totalMinutes);
    
    // Create new ISO date for targetDate
    const newIso = new Date(targetDate);
    newIso.setHours(12, 0, 0, 0); // Keep it safe

    onUpdateTask(draggedTaskId, { 
      hora: newTime,
      fechaAparicion: newIso.toISOString().slice(0, 10),
      appearanceMode: tasks.find(task => task.id === draggedTaskId)?.appearanceMode || 'persistent',
    });
    setDraggedTaskId(null);
  };

  const renderTaskBlock = (task: AppTask) => {
    const mins = timeToMins(task.hora);
    if (!mins) return null;
    
    const startHour = HOURS[0];
    const topMinutes = mins - startHour * 60;
    if (topMinutes < 0) return null; // Before calendar start
    
    const pixelsPerMinute = PIXELS_PER_HOUR / 60;
    const top = topMinutes * pixelsPerMinute;
    
    let durationMins = (task.duracion || 0) * 60;
    if (durationMins < 15) durationMins = 15; // Min visual height
    
    const height = durationMins * pixelsPerMinute;
    
    // Area color logic
    const areaColor = task.category && config?.areas?.[task.category]
      ? typeof config.areas[task.category] === 'string'
        ? config.areas[task.category] as string
        : (config.areas[task.category] as any).color
      : 'slate';
      
    const isDragging = draggedTaskId === task.id;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={() => setDraggedTaskId(null)}
        className={cn(
          "absolute left-1 right-1 rounded-sm border p-1 text-[10px] leading-tight overflow-hidden cursor-grab active:cursor-grabbing transition-opacity",
          getAreaColorClasses(areaColor),
          isDragging ? "opacity-50" : "opacity-90 hover:opacity-100"
        )}
        style={{ top: `${top}px`, height: `${height}px` }}
        title={`${task.hora} - ${task.text}`}
      >
        <div className="font-bold truncate">{task.text}</div>
        {task.duracion && <div className="opacity-75">{task.hora}</div>}
      </div>
    );
  };

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in max-w-7xl mx-auto w-full pt-4">
      {/* Header */}
      {!propWeekStart && (
        <div className="flex items-center justify-between mb-4 px-4 md:px-0">
          <h2 className="text-sm font-mono uppercase tracking-widest font-bold text-text-main flex items-center gap-4">
            <button onClick={handlePrevWeek} className="p-1.5 hover:bg-base-dim rounded cursor-pointer transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span>{monthNames[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}</span>
            <button onClick={handleNextWeek} className="p-1.5 hover:bg-base-dim rounded cursor-pointer transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </h2>
          <button 
            onClick={handleToday}
            className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0 outline-none"
          >
            Semana Actual
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-4 flex-col md:flex-row">
        
        {/* Side Bank: Unscheduled Tasks */}
        <div className="md:w-64 flex-shrink-0 flex flex-col bg-base-dim/10 border border-border-line rounded-md overflow-hidden h-48 md:h-full">
          <div className="p-3 border-b border-border-line bg-base-dim/20 font-mono text-[10px] uppercase tracking-widest text-text-dim font-bold text-center">
            Banco Flexibles
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 no-scrollbar">
            {unscheduledTasks.length === 0 ? (
              <div className="text-[9px] text-text-dim text-center py-4 font-mono uppercase">
                Vacio
              </div>
            ) : (
              unscheduledTasks.map(task => {
                const areaColor = task.category && config?.areas?.[task.category]
                  ? typeof config.areas[task.category] === 'string'
                    ? config.areas[task.category] as string
                    : (config.areas[task.category] as any).color
                  : 'slate';
                
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={() => setDraggedTaskId(null)}
                    className={cn(
                      "p-2 rounded-sm border text-[10px] cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity",
                      getAreaColorClasses(areaColor)
                    )}
                  >
                    <div className="font-bold truncate">{task.text}</div>
                    <div className="text-[9px] opacity-70 mt-1 uppercase tracking-wider">{task.duracion ? `${task.duracion}h` : '15m'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 bg-base border border-border-line overflow-y-auto relative no-scrollbar rounded-md flex">
          {/* Time Axis */}
          <div className="w-12 md:w-14 flex-shrink-0 border-r border-border-line bg-base-dim/5">
            <div className="h-10 border-b border-border-line sticky top-0 bg-base z-20"></div>
            <div className="relative">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="text-[9px] font-mono text-text-dim text-right pr-2 uppercase relative"
                  style={{ height: `${PIXELS_PER_HOUR}px` }}
                >
                  <span className="absolute -top-2 right-2 px-1 rounded">{hour.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* Days Columns */}
          <div className="flex flex-1 md:min-w-[700px] overflow-x-auto snap-x snap-mandatory">
            {weekDays.map((date, idx) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div key={idx} className="flex-1 flex flex-col min-w-[200px] md:min-w-[100px] snap-center">
                  {/* Column Header */}
                  <div className={cn(
                    "h-10 border-b border-r border-border-line sticky top-0 z-20 flex flex-col items-center justify-center bg-base",
                    isToday ? "bg-accent/10" : ""
                  )}>
                    <span className={cn("text-[9px] font-mono uppercase tracking-widest", isToday ? "text-accent font-bold" : "text-text-dim")}>
                      {dayNames[idx]}
                    </span>
                    <span className={cn("text-xs font-bold font-mono", isToday ? "text-accent" : "text-text-main")}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div 
                    className={cn(
                      "relative flex-1 border-r border-border-line min-h-full overflow-hidden",
                      isToday ? "bg-accent/5" : ""
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    {/* Timeblock Gradients (Bruma) */}
                    <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none" /> {/* Mañana: 06:00 - 12:00 */}
                    <div className="absolute inset-x-0 top-[480px] h-[480px] bg-gradient-to-b from-orange-50/30 to-transparent pointer-events-none" /> {/* Tarde: 12:00 - 18:00 */}
                    <div className="absolute inset-x-0 top-[960px] h-[480px] bg-gradient-to-b from-indigo-50/20 to-transparent pointer-events-none" /> {/* Noche: 18:00 - 24:00 */}
                    
                    {/* Grid Lines */}
                    {HOURS.map(hour => (
                      <div 
                        key={hour}
                        className="border-b border-border-line/30 w-full"
                        style={{ height: `${PIXELS_PER_HOUR}px` }}
                      />
                    ))}
                    
                    {/* Scheduled Tasks */}
                    {getScheduledTasksForDate(date).map(renderTaskBlock)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
