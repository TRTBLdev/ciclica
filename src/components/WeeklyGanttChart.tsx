import React from 'react';
import { AppTask, HistoryRecord, Config } from '../types';
import { cn } from '../lib/utils';
import { Clock } from 'lucide-react';
import { getEffectiveEnergyAllocation } from '../domain/energyAllocation';
import { getHistoryDateKey, getProjectForTask } from '../domain/workTracking';
import { formatDateOnly, parseDateOnly } from '../domain/recurrenceProgress';

interface Props {
  tasks: AppTask[];
  history: HistoryRecord[];
  periodStart: string;
  periodEnd: string;
  config: Config;
}

export default function WeeklyGanttChart({ tasks, history, periodStart, periodEnd, config }: Props) {
  // Group tasks executed in this period by Area, then by Energy (Soporte Vital vs Inversión)
  const relevantHistory = history.filter(h => {
    const d = getHistoryDateKey(h);
    return d >= periodStart && d <= periodEnd;
  });

  const activeTaskIds = Array.from(new Set(relevantHistory.map(h => h.taskId)));
  const activeTasks = tasks.filter(t => activeTaskIds.includes(t.id));

  const itemsByAreaAndEnergy: Record<string, Record<string, AppTask[]>> = {};

  activeTasks.forEach(t => {
    const p = getProjectForTask(t.id, tasks);
    const area = p?.category || t.category || 'General';
    const energy = getEffectiveEnergyAllocation(t, tasks) === 'fixed' ? 'Soporte Vital' : 'Inversión';

    if (!itemsByAreaAndEnergy[area]) itemsByAreaAndEnergy[area] = { 'Soporte Vital': [], 'Inversión': [] };
    itemsByAreaAndEnergy[area][energy].push(t);
  });

  // Calculate days in the period
  const start = parseDateOnly(periodStart);
  const end = parseDateOnly(periodEnd);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const getDayName = (date: Date) => {
    const d = date.toLocaleDateString('es-ES', { weekday: 'short' });
    return d.charAt(0).toUpperCase() + d.slice(1);
  };

  const getColorForArea = (area: string) => {
    if (!config?.areas?.[area]) return 'border-border-line';
    const ac = config.areas[area];
    const c = typeof ac === 'string' ? ac : ac.color;
    return `border-${c}-500 bg-${c}-500/10 text-${c}-500`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary silhouette-icon" />
        <h3 className="text-sm font-mono uppercase tracking-widest text-text-main font-bold">Cronograma de Ejecución (Plan vs Real)</h3>
      </div>

      <div className="space-y-12">
        {Object.entries(itemsByAreaAndEnergy).sort(([a], [b]) => a.localeCompare(b)).map(([area, energies]) => (
          <div key={area} className="space-y-6">
            <h4 className="text-xs font-mono uppercase tracking-widest text-primary font-bold border-b border-border-line/30 pb-2">
              {area}
            </h4>

            {['Soporte Vital', 'Inversión'].map(energy => {
              const energyTasks = energies[energy];
              if (!energyTasks || energyTasks.length === 0) return null;

              return (
                <div key={energy} className="space-y-4 pl-4">
                  <h5 className="text-[10px] font-mono uppercase tracking-widest text-text-dim/80">
                    {energy}
                  </h5>

                  <div className="overflow-x-auto pb-4">
                    <div className="min-w-[600px] border border-border-line/20 rounded-xl overflow-hidden glass-matte">
                      {/* Header row (Days) */}
                      <div className="flex bg-base-dim/10 border-b border-border-line/30">
                        <div className="w-48 p-3 text-[10px] font-mono text-text-dim border-r border-border-line/20 flex-shrink-0">
                          Tarea / Hábito
                        </div>
                        <div className="flex-grow flex">
                          {days.map((d, i) => (
                            <div key={i} className="flex-1 p-2 text-center border-r border-border-line/10 last:border-0">
                              <div className="text-[9px] uppercase tracking-wider font-bold text-text-dim">{getDayName(d)}</div>
                              <div className="text-[10px] font-mono text-text-main/70">{d.getDate()}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Task rows */}
                      <div className="divide-y divide-border-line/10">
                        {energyTasks.map(task => {
                          const plannedHours = task.duracion || 0;
                          const taskHistory = relevantHistory.filter(h => h.taskId === task.id);
                          const totalExecuted = taskHistory.reduce((acc, h) => acc + (h.duration || 0), 0);
                          
                          return (
                            <div key={task.id} className="flex items-stretch hover:bg-base-dim/5 transition-colors">
                              <div className="w-48 p-3 flex flex-col justify-center border-r border-border-line/20 flex-shrink-0">
                                <span className="text-xs text-text-main font-medium truncate" title={task.text}>{task.text}</span>
                                <span className="text-[9px] text-text-dim font-mono mt-0.5">
                                  Plan: {plannedHours}h | Real: {totalExecuted.toFixed(1)}h
                                </span>
                              </div>
                              <div className="flex-grow flex">
                                {days.map((d, i) => {
                                  const dateStr = formatDateOnly(d);
                                  const dayHistory = taskHistory.filter(h => getHistoryDateKey(h) === dateStr);
                                  const executedToday = dayHistory.reduce((acc, h) => acc + (h.duration || 0), 0);
                                  
                                  const hasPlan = task.hora || plannedHours > 0;
                                  
                                  return (
                                    <div key={i} className="flex-1 relative border-r border-border-line/10 last:border-0 min-h-[48px] flex items-center justify-center p-1">
                                      {/* Plan Background Block */}
                                      {hasPlan && (
                                        <div className="absolute inset-x-2 inset-y-2 border border-dashed border-border-line/40 rounded bg-base-dim/10 z-0"></div>
                                      )}
                                      
                                      {/* Execution Solid Block */}
                                      {executedToday > 0 && (
                                        <div className={cn(
                                          "relative z-10 w-full rounded border px-1 py-0.5 flex flex-col items-center justify-center min-h-[24px]",
                                          getColorForArea(area)
                                        )}>
                                          <span className="text-[9px] font-mono font-bold leading-none">{executedToday.toFixed(1)}h</span>
                                          {task.hora && dayHistory[0]?.date && (
                                            <span className="text-[8px] opacity-70 leading-none mt-0.5" title={`Planificado: ${task.hora}`}>
                                              {new Date(dayHistory[0].date).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {Object.keys(itemsByAreaAndEnergy).length === 0 && (
          <div className="text-center py-10 text-text-dim text-sm italic">
            No hay registros de ejecución en este período.
          </div>
        )}
      </div>
    </div>
  );
}
