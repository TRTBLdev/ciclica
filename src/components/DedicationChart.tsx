import React, { useMemo, useState } from 'react';
import { AppTask, HistoryRecord, Config } from '../types';
import { cn, getAreaTextClasses } from '../lib/utils';
import { Layers, CheckCircle2, Repeat, ChevronRight, ChevronDown, Filter, X } from 'lucide-react';
import { calculateBiologicalPhase, parseLocalDate } from '../domain/cycle';
import { getTaskEnergyBreakdown } from '../domain/energyAllocation';
import { getHistoryDateKey, getProjectForTask } from '../domain/workTracking';

interface OccupancyNode {
  id: string;
  text: string;
  type: string;
  area: string;
  totalHours: number;
  children: OccupancyNode[];
}

interface AreaOccupancyGroup {
  area: string;
  totalHours: number;
  nodes: OccupancyNode[];
}

interface DedicationChartProps {
  tasks: AppTask[];
  history: HistoryRecord[];
  periodStart: string;
  periodEnd: string;
  config: Config;
}

export default function DedicationChart({ tasks, history, periodStart, periodEnd, config }: DedicationChartProps) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => ({ ...prev, [area]: !prev[area] }));
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Pre-calculate colors for stacked bar and areas
  const areaColors = Object.keys(config.areas || {});
  const getAreaColor = (areaName: string) => {
    const idx = areaColors.indexOf(areaName);
    const colors = ['bg-[#e07a5f]', 'bg-[#81b29a]', 'bg-[#f2cc8f]', 'bg-[#3d405b]', 'bg-[#d4a373]'];
    return colors[idx % colors.length] || 'bg-text-dim';
  };

  // --- Phase Breakdown Logic (Overall for the period) ---
  const phaseBreakdown: Record<string, { vital: number; inversion: number }> = {
    'reflexiva': { vital: 0, inversion: 0 },
    'dinamica': { vital: 0, inversion: 0 },
    'expresiva': { vital: 0, inversion: 0 },
    'creativa': { vital: 0, inversion: 0 },
  };

  const periodHistory = useMemo(() => {
    return history.filter(h => {
      const d = getHistoryDateKey(h);
      return d >= periodStart && d <= periodEnd;
    });
  }, [history, periodStart, periodEnd]);

  periodHistory.forEach(h => {
    const originalTask = tasks.find(t => t.id === h.taskId);
    if (originalTask) {
      const dateObj = parseLocalDate(getHistoryDateKey(h));
      const phase = calculateBiologicalPhase(config, dateObj);
      if (phaseBreakdown[phase]) {
        const energy = getTaskEnergyBreakdown(originalTask, tasks, h.duration || 0);
        phaseBreakdown[phase].vital += energy.support;
        phaseBreakdown[phase].inversion += energy.investment;
      }
    }
  });

  const phaseLabels = {
    'reflexiva': { label: 'Reflexiva', color: 'text-[#d4a373]', border: 'border-[#d4a373]' },
    'dinamica': { label: 'Dinámica', color: 'text-[#81b29a]', border: 'border-[#81b29a]' },
    'expresiva': { label: 'Expresiva', color: 'text-[#e07a5f]', border: 'border-[#e07a5f]' },
    'creativa': { label: 'Creativa', color: 'text-[#f2cc8f]', border: 'border-[#f2cc8f]' },
  };

  // --- Occupancy Nodes (filtered by selectedPhase if active) ---
  const areaGroups = useMemo(() => {
    const projectNodes: Record<string, OccupancyNode> = {};
    const routineNodes: Record<string, OccupancyNode> = {};
    const standaloneNodes: Record<string, OccupancyNode> = {};

    const filteredHistory = periodHistory.filter(h => {
      if (!selectedPhase) return true;
      const dateObj = parseLocalDate(getHistoryDateKey(h));
      const phase = calculateBiologicalPhase(config, dateObj);
      return phase === selectedPhase;
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

    const allNodes: OccupancyNode[] = [
      ...Object.values(projectNodes),
      ...Object.values(routineNodes),
      ...Object.values(standaloneNodes),
    ];

    // Group by Area
    const groups: Record<string, AreaOccupancyGroup> = {};

    allNodes.forEach(node => {
      const area = node.area || 'Sin Área';
      if (!groups[area]) {
        groups[area] = {
          area,
          totalHours: 0,
          nodes: []
        };
      }
      groups[area].totalHours += node.totalHours;
      node.children.sort((a, b) => b.totalHours - a.totalHours);
      groups[area].nodes.push(node);
    });

    // Sort nodes inside each group and sort groups by total hours
    Object.values(groups).forEach(g => {
      g.nodes.sort((a, b) => b.totalHours - a.totalHours);
    });

    return Object.values(groups).sort((a, b) => b.totalHours - a.totalHours);
  }, [periodHistory, tasks, config, selectedPhase]);

  const totalPeriodHours = useMemo(() => {
    return areaGroups.reduce((acc, curr) => acc + curr.totalHours, 0);
  }, [areaGroups]);

  return (
    <div className="space-y-8">
      {/* Phase Breakdown Cards (Interactive filter) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
            Diferencia de Dedicación por Fase Biológica
          </h4>
          {selectedPhase && (
            <button
              onClick={() => setSelectedPhase(null)}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-accent hover:underline"
            >
              <X className="w-3 h-3" /> Quitar filtro
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(phaseBreakdown).map(([phase, data]) => {
            const total = data.vital + data.inversion;
            const pInfo = phaseLabels[phase as keyof typeof phaseLabels];
            const isSelected = selectedPhase === phase;

            return (
              <button
                key={phase}
                type="button"
                onClick={() => setSelectedPhase(prev => (prev === phase ? null : phase))}
                className={cn(
                  "text-left bg-base-dim/10 border rounded-xl p-3 flex flex-col gap-1.5 transition-all duration-200 cursor-pointer relative",
                  isSelected
                    ? cn("ring-2 ring-primary bg-base-dim/30 shadow-sm", pInfo.border)
                    : "border-border-line/30 hover:border-border-line hover:bg-base-dim/15"
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
                <div className={cn("text-[10px] font-mono uppercase tracking-widest font-bold", pInfo.color)}>
                  {pInfo.label}
                </div>
                <div className="text-lg font-sans font-light text-text-main">
                  {total.toFixed(1)} <span className="text-xs text-text-dim font-mono">h</span>
                </div>
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-text-dim">
                    <span>Soporte</span>
                    <span>{data.vital.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-base-dim/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#81b29a] h-full" style={{ width: `${total > 0 ? (data.vital / total) * 100 : 0}%` }}></div>
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-text-dim pt-0.5">
                    <span>Inversión</span>
                    <span>{data.inversion.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-base-dim/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#e07a5f] h-full" style={{ width: `${total > 0 ? (data.inversion / total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Distribution Stacked Bar & Grouped Table */}
      {totalPeriodHours === 0 ? (
        <div className="text-center py-8 text-xs font-mono text-text-dim border border-border-line/40 bg-base-dim/5 rounded-xl">
          {selectedPhase
            ? `No hay registros de tiempo durante la fase ${phaseLabels[selectedPhase as keyof typeof phaseLabels]?.label || selectedPhase}.`
            : "No hay registros de tiempo en este período."}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stacked Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                  Distribución de Dedicación
                </h4>
                {selectedPhase && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono text-text-dim bg-base-dim/30 px-2 py-0.5 rounded-full">
                    <Filter className="w-2.5 h-2.5" /> Fase {phaseLabels[selectedPhase as keyof typeof phaseLabels]?.label}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-text-main">{totalPeriodHours.toFixed(1)} h totales</span>
            </div>

            <div className="w-full h-3.5 flex rounded-full overflow-hidden border border-border-line/30 bg-base-dim/20">
              {areaGroups.map(group => {
                const percent = (group.totalHours / totalPeriodHours) * 100;
                if (percent < 0.5) return null;
                return (
                  <div
                    key={group.area}
                    style={{ width: `${percent}%` }}
                    className={cn("h-full transition-all duration-300 border-r border-base last:border-r-0", getAreaColor(group.area))}
                    title={`${group.area}: ${group.totalHours.toFixed(1)}h (${percent.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              {areaGroups.map(group => (
                <div key={group.area} className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-text-dim">
                  <div className={cn("w-2 h-2 rounded-full", getAreaColor(group.area))} />
                  <span>{group.area} ({((group.totalHours / totalPeriodHours) * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hierarchical Table Grouped by Area with Accordions */}
          <div className="border border-border-line/40 rounded-xl overflow-hidden text-xs font-sans">
            {/* Header */}
            <div className="flex bg-base-dim/15 border-b border-border-line/40 p-3 font-mono text-[10px] uppercase tracking-wider font-bold text-text-dim">
              <div className="flex-[3] pl-2">Área / Elemento</div>
              <div className="flex-[1] text-right">Horas</div>
              <div className="flex-[1] text-right">% del Total</div>
            </div>

            {/* Rows grouped by Area */}
            <div className="divide-y divide-border-line/20">
              {areaGroups.map(group => {
                const isAreaExpanded = expandedAreas[group.area] ?? true; // Default expanded for visibility
                const groupPercent = ((group.totalHours / totalPeriodHours) * 100).toFixed(1);
                const areaConfig = config.areas?.[group.area];
                const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

                return (
                  <div key={group.area} className="divide-y divide-border-line/10">
                    {/* Area Level 1 Header (Accordion) */}
                    <div
                      className="flex p-3 items-center bg-base-dim/5 hover:bg-base-dim/15 transition-colors cursor-pointer group"
                      onClick={() => toggleArea(group.area)}
                    >
                      <div className="flex-[3] flex items-center gap-2">
                        <div className="w-4 h-4 flex items-center justify-center text-text-dim">
                          {isAreaExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <div className={cn("w-2.5 h-2.5 rounded-full", getAreaColor(group.area))} />
                        <span className="font-mono font-bold uppercase tracking-wider text-text-main text-[11px]">
                          {group.area}
                        </span>
                        <span className="text-[10px] text-text-dim font-mono">
                          ({group.nodes.length} {group.nodes.length === 1 ? 'ítem' : 'ítems'})
                        </span>
                      </div>
                      <div className="flex-[1] text-right font-mono font-bold text-text-main">
                        {group.totalHours.toFixed(1)}h
                      </div>
                      <div className="flex-[1] text-right font-mono text-text-dim font-medium">
                        {groupPercent}%
                      </div>
                    </div>

                    {/* Area Content (Level 2 & 3 Nodes) */}
                    {isAreaExpanded && (
                      <div className="divide-y divide-border-line/10 bg-base/40">
                        {group.nodes.map(node => {
                          const isNodeExpanded = !!expandedNodes[node.id];
                          const hasChildren = node.children.length > 0;
                          const nodePercent = ((node.totalHours / totalPeriodHours) * 100).toFixed(1);

                          return (
                            <React.Fragment key={node.id}>
                              {/* Node Row (Project, Routine, or Task) */}
                              <div
                                className={cn(
                                  "flex p-2.5 pl-8 items-center hover:bg-base-dim/10 transition-colors group",
                                  hasChildren ? "cursor-pointer" : ""
                                )}
                                onClick={() => hasChildren && toggleNode(node.id)}
                              >
                                <div className="flex-[3] flex items-center gap-2">
                                  <div className="w-4 h-4 flex items-center justify-center">
                                    {hasChildren ? (
                                      isNodeExpanded ? <ChevronDown className="w-3 h-3 text-text-dim" /> : <ChevronRight className="w-3 h-3 text-text-dim" />
                                    ) : (
                                      <div className="w-1 h-1 rounded-full bg-text-dim/30" />
                                    )}
                                  </div>
                                  <div className={cn("p-1 rounded-full bg-base-dim/20 text-text-main", getAreaTextClasses(color))}>
                                    {node.type === 'Proyecto' ? <Layers className="w-3 h-3" /> :
                                      node.type === 'Rutina' ? <Repeat className="w-3 h-3" /> :
                                        <CheckCircle2 className="w-3 h-3" />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-text-main">{node.text}</div>
                                    <div className="text-[9px] text-text-dim font-mono uppercase">{node.type}</div>
                                  </div>
                                </div>
                                <div className="flex-[1] text-right font-mono text-text-main">
                                  {node.totalHours.toFixed(1)}h
                                </div>
                                <div className="flex-[1] text-right font-mono text-[10px] text-text-dim">
                                  {nodePercent}%
                                </div>
                              </div>

                              {/* Children Rows (subtasks, habits) */}
                              {isNodeExpanded && hasChildren && (
                                <div className="bg-base-dim/10 divide-y divide-border-line/10 border-t border-border-line/10">
                                  {node.children.map(child => {
                                    const childPercent = ((child.totalHours / node.totalHours) * 100).toFixed(1);
                                    return (
                                      <div key={child.id} className="flex p-2 pl-16 items-center hover:bg-base-dim/15 transition-colors">
                                        <div className="flex-[3] flex items-center gap-2">
                                          <div className="text-[9px] text-text-dim">•</div>
                                          <div>
                                            <div className="text-text-main text-[11px]">{child.text}</div>
                                            <div className="text-[8px] text-text-dim/60 font-mono uppercase">{child.type}</div>
                                          </div>
                                        </div>
                                        <div className="flex-[1] text-right font-mono text-[11px] text-text-main">
                                          {child.totalHours.toFixed(1)}h
                                        </div>
                                        <div className="flex-[1] text-right font-mono text-[9px] text-text-dim">
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
}
