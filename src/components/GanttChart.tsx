import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';

interface GanttChartProps {
  config: Config | null;
  tasks: AppTask[];
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  scale: 'phase' | 'cycle' | 'quarter' | 'year';
  periodStart: string;
  periodEnd: string;
}

export default function GanttChart({ config, tasks, onUpdateTask, scale, periodStart, periodEnd }: GanttChartProps) {
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<{ d: string; id: string }[]>([]);

  // Get active projects and their subtasks
  const projects = useMemo(() => tasks.filter(t => t.type === 'Proyecto' && !t.completed), [tasks]);
  const projectTasks = useMemo(() => tasks.filter(t => t.type === 'Tarea' && !t.completed && t.parentId), [tasks]);

  const toggleProject = (projId: string) => {
    setExpandedProjects(prev =>
      prev.includes(projId) ? prev.filter(p => p !== projId) : [...prev, projId]
    );
  };

  // Automatically expand projects initially
  useEffect(() => {
    setExpandedProjects(projects.map(p => p.id));
  }, [projects]);

  // Parse period dates and add buffer for context navigation (past/future)
  const { timelineStart, timelineEnd, cols } = useMemo(() => {
    let start = new Date(periodStart);
    let end = new Date(periodEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    let colLabels: string[] = [];

    if (scale === 'phase' || scale === 'cycle') {
      // Add 10 days buffer on each side for context
      start.setDate(start.getDate() - 10);
      end.setDate(end.getDate() + 10);
      
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i <= totalDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        colLabels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
    } else if (scale === 'quarter') {
      // Add 2 weeks buffer
      start.setDate(start.getDate() - 14);
      end.setDate(end.getDate() + 14);
      
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalWeeks = Math.ceil(totalDays / 7);
      for (let i = 0; i < totalWeeks; i++) {
        colLabels.push(`S${i + 1}`);
      }
    } else {
      // year - Add 1 month buffer
      start.setMonth(start.getMonth() - 1);
      end.setMonth(end.getMonth() + 1);
      
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      // simple year column labels
      for (let m = new Date(start); m <= end; m.setMonth(m.getMonth() + 1)) {
        colLabels.push(`${months[m.getMonth()]} '${m.getFullYear().toString().slice(2)}`);
      }
    }

    return { timelineStart: start, timelineEnd: end, cols: colLabels };
  }, [scale, periodStart, periodEnd]);

  // Map dates to percentage widths and positions
  const getTaskDates = (t: AppTask) => {
    let end = t.fechaPlanificada ? new Date(t.fechaPlanificada) : new Date();
    let start = t.fechaInicio ? new Date(t.fechaInicio) : new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days fallback

    if (start.getTime() > end.getTime()) {
      start = new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000);
    }

    // Dynamic Project timeline expansion based on active subtasks' date bounds
    if (t.type === 'Proyecto') {
      const sub = tasks.filter(st => st.parentId === t.id && !st.completed);
      if (sub.length > 0) {
        let minStart = start;
        let maxEnd = end;
        let hasSubDates = false;

        sub.forEach(st => {
          if (st.fechaPlanificada) {
            hasSubDates = true;
            const stEnd = new Date(st.fechaPlanificada);
            const stStart = st.fechaInicio ? new Date(st.fechaInicio) : new Date(stEnd.getTime() - 5 * 24 * 60 * 60 * 1000);
            
            if (stStart.getTime() < minStart.getTime()) {
              minStart = stStart;
            }
            if (stEnd.getTime() > maxEnd.getTime()) {
              maxEnd = stEnd;
            }
          }
        });

        if (hasSubDates) {
          return { start: minStart, end: maxEnd };
        }
      }
    }

    return { start, end };
  };

  const getPercentPosition = (t: AppTask) => {
    const { start, end } = getTaskDates(t);
    const rangeTotal = timelineEnd.getTime() - timelineStart.getTime();

    let left = ((start.getTime() - timelineStart.getTime()) / rangeTotal) * 100;
    let width = ((end.getTime() - start.getTime()) / rangeTotal) * 100;

    // Boundary constraints
    if (left < 0) {
      width = width + left;
      left = 0;
    }
    if (left > 100) {
      left = 100;
      width = 0;
    }
    if (left + width > 100) {
      width = 100 - left;
    }

    return {
      left: `${Math.max(0, left).toFixed(2)}%`,
      width: `${Math.max(0.5, width).toFixed(2)}%`
    };
  };

  // Re-calculate SVG Bezier Curves for Dependencies
  const calculateDependencies = () => {
    if (!containerRef.current || scale === 'año') {
      setSvgLines([]);
      return;
    }

    const lines: { d: string; id: string }[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    tasks.forEach(t => {
      if (t.dependencyId && !t.completed) {
        const prereqEl = document.getElementById(`gantt-bar-${t.dependencyId}`);
        const dependentEl = document.getElementById(`gantt-bar-${t.id}`);

        if (prereqEl && dependentEl) {
          const prereqRect = prereqEl.getBoundingClientRect();
          const dependentRect = dependentEl.getBoundingClientRect();

          // Anchor points relative to parent scrollable grid container
          const scrollLeft = containerRef.current?.scrollLeft || 0;
          const scrollTop = containerRef.current?.scrollTop || 0;

          // x1, y1: Right edge of prerequisite bar
          const x1 = prereqRect.right - containerRect.left + scrollLeft;
          const y1 = prereqRect.top - containerRect.top + scrollTop + prereqRect.height / 2;

          // x2, y2: Left edge of dependent bar
          const x2 = dependentRect.left - containerRect.left + scrollLeft;
          const y2 = dependentRect.top - containerRect.top + scrollTop + dependentRect.height / 2;

          // Curved cubic bezier curve
          const controlOffset = Math.min(100, Math.max(30, Math.abs(x2 - x1) / 2));
          const d = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

          lines.push({ d, id: `${t.dependencyId}-${t.id}` });
        }
      }
    });

    setSvgLines(lines);
  };

  // Recalculate SVG lines on window resize, scroll, expanded states or view change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateDependencies();
    }, 200);

    window.addEventListener('resize', calculateDependencies);
    containerRef.current?.addEventListener('scroll', calculateDependencies);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateDependencies);
      containerRef.current?.removeEventListener('scroll', calculateDependencies);
    };
  }, [tasks, scale, expandedProjects]);

  return (
    <div className="flex flex-col gap-4 border border-border-line p-4 animate-in fade-in duration-300 rounded-none bg-transparent">
      {/* Gantt Scale Selector Header */}
      <div className="flex justify-between items-center border-b border-border-line pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">CRONOGRAMA DE PROYECTOS</span>
        </div>
        
        {/* Scale Switchers */}
        <div className="flex gap-4 font-mono text-[10px] uppercase font-bold tracking-wider">
          {(['ciclo', 'cuarto', 'año'] as GanttScale[]).map(s => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className={cn(
                "hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors",
                scale === s ? "text-accent font-black underline decoration-2 underline-offset-4" : "text-text-dim hover:text-text-main"
              )}
            >
              {s === 'ciclo' ? 'Ciclo (30d)' : s === 'cuarto' ? 'Trimestre' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="w-full flex overflow-hidden border border-border-line/40 rounded-none">
        
        {/* Left Column: List of Projects/Tasks */}
        <div className="w-48 sm:w-60 border-r border-border-line flex-shrink-0 bg-base-dim/10 select-none font-sans text-left">
          {/* Header spacer */}
          <div className="h-9 border-b border-border-line/40 px-3 flex items-center text-[9px] font-mono uppercase text-text-dim tracking-wider font-bold">
            PROYECTOS / ACCIONES
          </div>

          <div className="flex flex-col">
            {projects.map(proj => {
              const isExpanded = expandedProjects.includes(proj.id);
              const sub = projectTasks.filter(t => t.parentId === proj.id);

              return (
                <div key={proj.id} className="flex flex-col">
                  {/* Project Row Label */}
                  <div 
                    onClick={() => toggleProject(proj.id)}
                    className="h-10 border-b border-border-line/20 px-2 flex items-center gap-1.5 hover:bg-base-dim/30 cursor-pointer group text-xs font-medium text-text-main"
                  >
                    <span className="text-text-dim hover:text-text-main shrink-0 p-0.5">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate group-hover:text-accent transition-colors" title={proj.text}>{proj.text}</span>
                  </div>

                  {/* Subtask Row Labels */}
                  {isExpanded && sub.map(task => (
                    <div 
                      key={task.id} 
                      className="h-10 border-b border-border-line/20 pl-7 pr-2 flex items-center text-xs font-light text-text-dim truncate lowercase tracking-wide"
                      title={task.text}
                    >
                      ↳ {task.text}
                    </div>
                  ))}
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="text-[10px] font-mono text-text-dim uppercase italic py-8 text-center">No hay proyectos activos</div>
            )}
          </div>
        </div>

        {/* Right Column: Scrollable Grid & Bars */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-x-auto relative min-w-0"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Relative container sizing */}
          <div 
            className="flex flex-col relative select-none"
            style={{ 
              width: scale === 'ciclo' ? '1200px' : scale === 'cuarto' ? '1000px' : '1000px',
              minWidth: '100%' 
            }}
          >
            
            {/* SVG Overlay Canvas for Drawing Prerequisite Lines */}
            <svg className="absolute inset-0 pointer-events-none z-20 w-full h-full">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a89f95" />
                </marker>
              </defs>
              {svgLines.map(line => (
                <path
                  key={line.id}
                  d={line.d}
                  fill="none"
                  stroke="#a89f95"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  markerEnd="url(#arrow)"
                />
              ))}
            </svg>

            {/* Time Axis Header Grid */}
            <div className="h-9 border-b border-border-line/40 flex w-full">
              {cols.map((col, idx) => (
                <div 
                  key={idx} 
                  className="flex-1 border-r border-border-line/20 last:border-r-0 flex items-center justify-center text-[9px] font-mono text-text-dim/80 tracking-normal"
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Row Tracks */}
            <div className="flex flex-col w-full relative">
              {projects.map(proj => {
                const isExpanded = expandedProjects.includes(proj.id);
                const sub = projectTasks.filter(t => t.parentId === proj.id);
                const areaProps = config?.areas?.[proj.category || ''];
                const pColor = typeof areaProps === 'string' ? areaProps : (areaProps?.color || 'slate');
                
                const projPos = getPercentPosition(proj);

                return (
                  <div key={proj.id} className="flex flex-col w-full">
                    {/* Project Bar Row */}
                    <div className="h-10 border-b border-border-line/20 w-full flex items-center relative hover:bg-base-dim/10">
                      {/* Project Horizontal Bar */}
                      <div 
                        id={`gantt-bar-${proj.id}`}
                        className={cn(
                          "absolute h-2.5 rounded-full border transition-all duration-300 shadow-sm",
                          pColor === 'emerald' ? 'bg-emerald-500/20 border-emerald-500/50' :
                          pColor === 'teal' ? 'bg-teal-500/20 border-teal-500/50' :
                          pColor === 'amber' ? 'bg-amber-500/20 border-amber-500/50' :
                          'bg-slate-500/20 border-slate-500/50'
                        )}
                        style={{ left: projPos.left, width: projPos.width }}
                        title={`${proj.text} (Planificado a ${proj.fechaPlanificada?.substring(0, 10)})`}
                      />
                    </div>

                    {/* Subtask Bar Rows */}
                    {isExpanded && sub.map(task => {
                      const taskPos = getPercentPosition(task);

                      return (
                        <div key={task.id} className="h-10 border-b border-border-line/20 w-full flex items-center relative hover:bg-base-dim/10">
                          {/* Task Horizontal Bar */}
                          <div 
                            id={`gantt-bar-${task.id}`}
                            className={cn(
                              "absolute h-1.5 rounded-full border transition-all duration-300 shadow-sm",
                              pColor === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30' :
                              pColor === 'teal' ? 'bg-teal-500/10 border-teal-500/30' :
                              pColor === 'amber' ? 'bg-amber-500/10 border-amber-500/30' :
                              'bg-slate-500/10 border-slate-500/30'
                            )}
                            style={{ left: taskPos.left, width: taskPos.width }}
                            title={`${task.text} (Límite: ${task.fechaPlanificada?.substring(0, 10)})`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
