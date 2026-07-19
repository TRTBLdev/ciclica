import React, { useMemo, useState } from 'react';
import { AppTask, HistoryRecord, Config } from '../types';
import { cn, getAreaColorClasses, getAreaTextClasses } from '../lib/utils';
import { Layers, CheckCircle2, Repeat, ChevronRight, ChevronDown } from 'lucide-react';
import { calculateBiologicalPhase, parseLocalDate } from '../domain/cycle';
const getProjectForTask = (taskId: string, allTasks: AppTask[]): AppTask | null => {
  let current = allTasks.find(t => t.id === taskId);
  while (current) {
    if (current.type === 'Proyecto') return current;
    if (!current.parentId) break;
    current = allTasks.find(t => t.id === current.parentId);
  }
  return null;
};

interface OccupancyNode {
  id: string;
  text: string;
  type: string;
  area: string;
  totalHours: number;
  children: OccupancyNode[];
}

interface DedicationChartProps {
  tasks: AppTask[];
  history: HistoryRecord[];
  periodStart: string;
  periodEnd: string;
  config: Config;
}

export default function DedicationChart({ tasks, history, periodStart, periodEnd, config }: DedicationChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const occupancyNodes = useMemo(() => {
    const projectNodes: Record<string, OccupancyNode> = {};
    const routineNodes: Record<string, OccupancyNode> = {};
    const standaloneNodes: Record<string, OccupancyNode> = {};

    const filteredHistory = history.filter(h => {
      const d = h.date.slice(0, 10);
      return d >= periodStart && d <= periodEnd;
    });

    filteredHistory.forEach(h => {
      const originalTask = tasks.find(t => t.id === h.taskId);
      const projectTask = originalTask ? getProjectForTask(originalTask.id, tasks) : null;
      const routineTask = (originalTask && originalTask.type === 'Hábito' && originalTask.parentId)
        ? tasks.find(t => t.id === originalTask.parentId && t.type === 'Rutina')
        : null;
      const duration = h.duration || 0;

      if (routineTask) {
        if (!routineNodes[routineTask.id]) {
          routineNodes[routineTask.id] = {
            id: routineTask.id,
            text: routineTask.text,
            type: 'Rutina',
            area: routineTask.category || 'Sin Área',
            totalHours: 0,
            children: []
          };
        }
        routineNodes[routineTask.id].totalHours += duration;

        if (originalTask && originalTask.id !== routineTask.id) {
          let childNode = routineNodes[routineTask.id].children.find(c => c.id === originalTask.id);
          if (!childNode) {
            childNode = {
              id: originalTask.id,
              text: originalTask.text,
              type: originalTask.type,
              area: originalTask.category || routineTask.category || 'Sin Área',
              totalHours: 0,
              children: []
            };
            routineNodes[routineTask.id].children.push(childNode);
          }
          childNode.totalHours += duration;
        }
      } else if (projectTask) {
        if (!projectNodes[projectTask.id]) {
          projectNodes[projectTask.id] = {
            id: projectTask.id,
            text: projectTask.text,
            type: 'Proyecto',
            area: projectTask.category || 'Sin Área',
            totalHours: 0,
            children: []
          };
        }
        projectNodes[projectTask.id].totalHours += duration;

        if (originalTask && originalTask.id !== projectTask.id) {
          let childNode = projectNodes[projectTask.id].children.find(c => c.id === originalTask.id);
          if (!childNode) {
            childNode = {
              id: originalTask.id,
              text: originalTask.text,
              type: originalTask.type,
              area: originalTask.category || projectTask.category || 'Sin Área',
              totalHours: 0,
              children: []
            };
            projectNodes[projectTask.id].children.push(childNode);
          }
          childNode.totalHours += duration;
        }
      } else {
        const taskId = originalTask ? originalTask.id : h.taskId;
        const text = originalTask ? originalTask.text : (h.taskSnapshotText || '(Elemento Eliminado)');
        const type = originalTask ? originalTask.type : 'Tarea';
        const area = originalTask ? (originalTask.category || 'Sin Área') : 'Sin Área';

        if (!standaloneNodes[taskId]) {
          standaloneNodes[taskId] = {
            id: taskId,
            text,
            type,
            area,
            totalHours: 0,
            children: []
          };
        }
        standaloneNodes[taskId].totalHours += duration;
      }
    });

    const sortedProjects = Object.values(projectNodes).map(p => {
      p.children.sort((a, b) => b.totalHours - a.totalHours);
      return p;
    }).sort((a, b) => b.totalHours - a.totalHours);

    const sortedRoutines = Object.values(routineNodes).map(r => {
      r.children.sort((a, b) => b.totalHours - a.totalHours);
      return r;
    }).sort((a, b) => b.totalHours - a.totalHours);

    const sortedStandalone = Object.values(standaloneNodes).sort((a, b) => b.totalHours - a.totalHours);

    return [...sortedProjects, ...sortedRoutines, ...sortedStandalone].sort((a, b) => b.totalHours - a.totalHours);
  }, [tasks, history, periodStart, periodEnd]);

  const totalPeriodHours = occupancyNodes.reduce((acc, curr) => acc + curr.totalHours, 0);

  if (totalPeriodHours === 0) {
    return (
      <div className="text-center py-10 text-xs font-mono text-text-dim border border-border-line/40 bg-base-dim/5">
        No hay registros de tiempo en este período.
      </div>
    );
  }

  // Pre-calculate colors for stacked bar
  const areaColors = Object.keys(config.areas);
  const getAreaColor = (areaName: string) => {
    const idx = areaColors.indexOf(areaName);
    const colors = ['bg-[#e07a5f]', 'bg-[#81b29a]', 'bg-[#f2cc8f]', 'bg-[#3d405b]', 'bg-[#d4a373]'];
    return colors[idx % colors.length] || 'bg-text-dim';
  };

  // --- Phase Breakdown Logic ---

  const phaseBreakdown: Record<string, { vital: number, inversion: number }> = {
    'reflexiva': { vital: 0, inversion: 0 },
    'dinamica': { vital: 0, inversion: 0 },
    'expresiva': { vital: 0, inversion: 0 },
    'creativa': { vital: 0, inversion: 0 },
  };

  const getEffectiveAllocation = (task: AppTask, allTasks: AppTask[]): 'fixed' | 'growth' | 'mixed' => {
    if (task.allocationType) return task.allocationType;
    if (task.type === 'Hábito' || task.type === 'Pulso') return 'fixed';
    if (task.type === 'Proyecto' || task.type === 'Rutina') return 'growth';
    const project = getProjectForTask(task.id, allTasks);
    if (project) return 'growth';
    return 'mixed';
  };

  history.filter(h => {
    const d = h.date.slice(0, 10);
    return d >= periodStart && d <= periodEnd;
  }).forEach(h => {
    const originalTask = tasks.find(t => t.id === h.taskId);
    if (originalTask) {
      const dateObj = parseLocalDate(h.date.slice(0, 10));
      const phase = calculateBiologicalPhase(config, dateObj);
      const energy = getEffectiveAllocation(originalTask, tasks) === 'fixed' ? 'vital' : 'inversion';
      if (phaseBreakdown[phase]) {
        phaseBreakdown[phase][energy] += (h.duration || 0);
      }
    }
  });

  const phaseLabels = {
    'reflexiva': { label: 'Reflexiva', color: 'text-[#d4a373]' },
    'dinamica': { label: 'Dinámica', color: 'text-[#81b29a]' },
    'expresiva': { label: 'Expresiva', color: 'text-[#e07a5f]' },
    'creativa': { label: 'Creativa', color: 'text-[#f2cc8f]' },
  };

  return (
    <div className="space-y-12">
      {/* Phase Breakdown */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
          Diferencia de Dedicación por Fase Biológica
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Object.entries(phaseBreakdown).map(([phase, data]) => {
            const total = data.vital + data.inversion;
            const pInfo = phaseLabels[phase as keyof typeof phaseLabels];
            return (
              <div key={phase} className="bg-base-dim/10 border border-border-line/30 rounded-xl p-4 flex flex-col gap-2">
                <div className={cn("text-xs font-mono uppercase tracking-widest font-bold", pInfo.color)}>
                  {pInfo.label}
                </div>
                <div className="text-xl font-sans font-light text-text-main">
                  {total.toFixed(1)} <span className="text-xs text-text-dim">h</span>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-[9px] font-mono text-text-dim">
                    <span>Soporte Vital</span>
                    <span>{data.vital.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-base-dim/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#81b29a] h-full" style={{ width: `${total > 0 ? (data.vital / total) * 100 : 0}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between text-[9px] font-mono text-text-dim pt-1">
                    <span>Inversión</span>
                    <span>{data.inversion.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-base-dim/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#e07a5f] h-full" style={{ width: `${total > 0 ? (data.inversion / total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {/* Stacked Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
            Distribución de Dedicación (Horas)
          </h4>
          <span className="text-xs font-mono font-bold text-text-main">{totalPeriodHours.toFixed(1)} h totales</span>
        </div>

        <div className="w-full h-4 flex rounded-full overflow-hidden border border-border-line/30 bg-base-dim/20">
          {occupancyNodes.map((node) => {
            const percent = (node.totalHours / totalPeriodHours) * 100;
            if (percent < 0.5) return null; // hide very small chunks
            return (
              <div
                key={node.id}
                style={{ width: `${percent}%` }}
                className={cn("h-full transition-all duration-300 border-r border-base last:border-r-0", getAreaColor(node.area))}
                title={`${node.text} (${node.totalHours.toFixed(1)}h)`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {/* Legend grouped by area based on top nodes */}
          {Array.from(new Set<string>(occupancyNodes.map(n => String(n.area)))).map(area => (
            <div key={area} className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-text-dim">
              <div className={cn("w-2 h-2 rounded-full", getAreaColor(area))} />
              {area}
            </div>
          ))}
        </div>
      </div>

      {/* Hierarchical Table */}
      <div className="border border-border-line/40 overflow-hidden text-xs font-sans">
        {/* Header */}
        <div className="flex bg-base-dim/10 border-b border-border-line/40 p-3 font-mono text-[10px] uppercase tracking-wider font-bold text-text-dim">
          <div className="flex-[3] pl-2">Elemento</div>
          <div className="flex-[1] text-right">Horas</div>
          <div className="flex-[1] text-right">% del Total</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-line/20">
          {occupancyNodes.map((node) => {
            const isExpanded = !!expandedNodes[node.id];
            const hasChildren = node.children.length > 0;
            const percent = ((node.totalHours / totalPeriodHours) * 100).toFixed(1);

            const areaConfig = config.areas?.[node.area];
            const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

            return (
              <React.Fragment key={node.id}>
                {/* Parent Row */}
                <div
                  className={cn(
                    "flex p-3 items-center hover:bg-base-dim/5 transition-colors group",
                    hasChildren ? "cursor-pointer" : ""
                  )}
                  onClick={() => hasChildren && toggleNode(node.id)}
                >
                  <div className="flex-[3] flex items-center gap-2">
                    {/* Expand icon */}
                    <div className="w-4 h-4 flex items-center justify-center">
                      {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-3 h-3 text-text-dim" /> : <ChevronRight className="w-3 h-3 text-text-dim" />
                      ) : <div className="w-1 h-1 rounded-full bg-text-dim/30" />}
                    </div>
                    {/* Type icon */}
                    <div className={cn("p-1.5 rounded-full bg-base-dim/20 text-text-main", getAreaTextClasses(color))}>
                      {node.type === 'Proyecto' ? <Layers className="w-3 h-3" /> :
                        node.type === 'Rutina' ? <Repeat className="w-3 h-3" /> :
                          <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="font-bold text-text-main">{node.text}</div>
                      <div className="text-[10px] text-text-dim font-mono">{node.area}</div>
                    </div>
                  </div>
                  <div className="flex-[1] text-right font-mono font-bold text-text-main">
                    {node.totalHours.toFixed(1)}h
                  </div>
                  <div className="flex-[1] text-right font-mono text-text-dim">
                    {percent}%
                  </div>
                </div>

                {/* Children Rows */}
                {isExpanded && hasChildren && (
                  <div className="bg-base-dim/5 border-t border-border-line/10">
                    {node.children.map((child, idx) => {
                      const childPercent = ((child.totalHours / node.totalHours) * 100).toFixed(1);
                      return (
                        <div key={child.id} className="flex p-2 pl-12 items-center hover:bg-base-dim/10 transition-colors border-b border-border-line/10 last:border-b-0">
                          <div className="flex-[3] flex items-center gap-2">
                            <div className="text-[10px] text-text-dim">•</div>
                            <div>
                              <div className="text-text-main">{child.text}</div>
                              <div className="text-[9px] text-text-dim/60 font-mono uppercase">{child.type}</div>
                            </div>
                          </div>
                          <div className="flex-[1] text-right font-mono text-xs text-text-main">
                            {child.totalHours.toFixed(1)}h
                          </div>
                          <div className="flex-[1] text-right font-mono text-[10px] text-text-dim">
                            {childPercent}% <span className="text-[8px] opacity-50">del {node.type}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
