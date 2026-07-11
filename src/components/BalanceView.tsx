import React from 'react';
import { Config, AppTask, HistoryRecord, Intention, IntentionScale } from '../types';
import { calculateItemProgress } from '../domain/intentionProgress';
import { CheckCircle2, CircleDashed, Clock, CalendarDays, Flame, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import ReportesView from './ReportesView';
import DedicationChart from './DedicationChart';
import WeeklyGanttChart from './WeeklyGanttChart';

interface Props {
  scale: IntentionScale | 'free';
  intentions: Intention[];
  tasks: AppTask[];
  history: HistoryRecord[];
  config: Config | null;
  periodStart: string;
  periodEnd: string;
}

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

export default function BalanceView({
  scale,
  intentions,
  tasks,
  history,
  config,
  periodStart,
  periodEnd
}: Props) {
  if (!config) return null;

  if (scale === 'free') {
    return (
      <div className="w-full">
        <ReportesView config={config} tasks={tasks} history={history} />
      </div>
    );
  }

  const existingIntention = intentions.find(i => 
    i.scale === scale && i.periodStart === periodStart && i.periodEnd === periodEnd
  );

  const getLabelName = (item: any) => {
    if (item.taskId) return tasks.find(t => t.id === item.taskId)?.text || 'Tarea Eliminada';
    if (item.projectId) return tasks.find(t => t.id === item.projectId)?.text || 'Proyecto Eliminado';
    if (item.subCategory) return `${item.areaName} - ${item.subCategory}`;
    return item.areaName || 'General';
  };

  const getIcon = (type: string) => {
    if (type === 'hours') return <Clock className="w-4 h-4" />;
    if (type === 'consistency') return <Flame className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  // Group items by Area for rendering
  const itemsByArea: Record<string, any[]> = {};
  if (existingIntention) {
    existingIntention.items.forEach(item => {
      let area = 'General';
      if (item.areaName) {
        area = item.areaName;
      } else if (item.projectId) {
        const p = tasks.find(t => t.id === item.projectId);
        if (p?.category) area = p.category;
      } else if (item.taskId) {
        const t = tasks.find(t => t.id === item.taskId);
        if (t?.category) area = t.category;
      }
      if (!itemsByArea[area]) itemsByArea[area] = [];
      itemsByArea[area].push(item);
    });
  }

  const renderProgressCard = (item: any) => {
    const progressResult = calculateItemProgress(item, tasks, history, periodStart, periodEnd);
    
    let current = 0;
    let target = 0;
    let percent = 0;
    let isCompleted = false;
    let textStatus = '';

    if (progressResult.type === 'hours' && progressResult.hours) {
      current = progressResult.hours.current;
      target = progressResult.hours.target;
      percent = progressResult.hours.percent;
      isCompleted = current >= target;
      textStatus = `${current.toFixed(1)} / ${target}h`;
    } else if (progressResult.type === 'consistency' && progressResult.consistency) {
      current = progressResult.consistency.current;
      target = progressResult.consistency.target;
      percent = progressResult.consistency.percent;
      isCompleted = current >= target;
      textStatus = `${current} / ${target} d`;
    } else if (progressResult.type === 'completion' && progressResult.completion) {
      isCompleted = progressResult.completion.completed;
      percent = isCompleted ? 100 : 0;
      textStatus = isCompleted ? 'Completado' : 'Pendiente';
    }

    return (
      <div key={item.id} className="bg-base-dim/5 border border-border-line/40 p-4 rounded-none space-y-3 relative group">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-text-main">
            {getIcon(item.targetType)}
            <span className="truncate max-w-[180px]">{getLabelName(item)}</span>
          </div>
          <div className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full", isCompleted ? "bg-[#81b29a]/20 text-[#81b29a]" : "bg-base-dim/20 text-text-dim")}>
            {textStatus}
          </div>
        </div>

        <div className="w-full bg-base-dim/30 h-1.5 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", isCompleted ? "bg-[#81b29a]" : "bg-text-main")} 
            style={{ width: `${Math.min(100, percent)}%` }} 
          />
        </div>
      </div>
    );
  };
  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-10 text-left space-y-10 animate-in fade-in duration-200">
      
      {scale === 'phase' ? (
        <WeeklyGanttChart 
          tasks={tasks}
          history={history}
          periodStart={periodStart}
          periodEnd={periodEnd}
          config={config}
        />
      ) : (
        <>
          {!existingIntention ? (
            <div className="bg-base-dim/10 border border-border-line border-dashed p-8 text-center space-y-3">
              <CircleDashed className="w-8 h-8 mx-auto text-text-dim/50" />
              <p className="text-xs font-mono uppercase tracking-wider text-text-dim font-bold">Sin Intención Definida</p>
              <p className="text-xs text-text-dim font-light max-w-md mx-auto">
                No se ha definido una intención para este período. Ve a la pestaña Planificar para establecerla.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-1">
                <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Tema del Período</h3>
                <p className="text-sm text-text-main italic border-l-2 border-primary/30 pl-3 py-1">
                  {existingIntention.theme || "Sin tema definido"}
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Progreso de Compromisos</h3>
                {existingIntention.items.length === 0 ? (
                  <p className="text-xs text-text-dim">No hay compromisos asociados a esta intención.</p>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(itemsByArea).map(area => (
                      <div key={area} className="space-y-3">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold border-b border-border-line/20 pb-1">
                          {area === 'General' ? 'Otros / General' : area}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {itemsByArea[area].map(renderProgressCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALÍTICAS */}
          <div className="border-t border-border-line pt-8">
            <DedicationChart 
              tasks={tasks}
              history={history}
              periodStart={periodStart}
              periodEnd={periodEnd}
              config={config}
            />
          </div>
        </>
      )}
    </div>
  );
}
