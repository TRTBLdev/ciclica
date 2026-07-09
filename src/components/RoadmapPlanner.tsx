import React, { useState } from 'react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import { Layers, Plus, MoreHorizontal } from 'lucide-react';

interface Props {
  scale: 'year' | 'quarter';
  periodStart: string;
  periodEnd: string;
  tasks: AppTask[];
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  config: Config;
}

export default function RoadmapPlanner({ scale, periodStart, periodEnd, tasks, onUpdateTask, config }: Props) {
  const [assigningToNode, setAssigningToNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine nodes based on scale
  const nodes = [];
  const start = new Date(periodStart);
  if (scale === 'year') {
    // 4 Quarters
    for (let i = 0; i < 4; i++) {
      nodes.push({ id: `Q${i + 1}`, label: `Q${i + 1}` });
    }
  } else {
    // 3 Months
    for (let i = 0; i < 3; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const monthName = d.toLocaleDateString('es-ES', { month: 'long' });
      const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      nodes.push({ id, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) });
    }
  }

  const freeProjects = tasks.filter(t => t.type === 'Proyecto' && (!t.fechaPlanificada || !nodes.find(n => n.id === t.fechaPlanificada)));

  const handleAssign = (taskId: string, nodeId: string) => {
    onUpdateTask(taskId, { fechaPlanificada: nodeId });
    setAssigningToNode(null);
    setSearchQuery('');
  };

  const handleUnassign = (taskId: string) => {
    onUpdateTask(taskId, { fechaPlanificada: undefined });
  };

  const filteredFreeProjects = freeProjects.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="w-full relative mt-16 animate-in fade-in duration-500">
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border-line/40 -translate-x-1/2" />

      <div className="space-y-24 relative pb-24">
        {nodes.map((node, index) => {
          const assignedTasks = tasks.filter(t => t.fechaPlanificada === node.id);
          const isLeft = index % 2 === 0;

          return (
            <div key={node.id} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
              {/* Timeline Node */}
              <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-base border-2 border-primary/40 flex items-center justify-center z-10 shadow-sm">
                <span className="text-[10px] font-mono font-bold text-primary">{node.label.substring(0, 3)}</span>
              </div>

              {/* Add Button for Mobile/PC */}
              <div className={cn(
                "absolute left-[4.5rem] md:left-1/2 md:translate-x-6 w-6 h-6 rounded-full bg-base-dim/20 border border-border-line/50 flex items-center justify-center z-10 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors",
                !isLeft && "md:left-auto md:right-1/2 md:-translate-x-6"
              )}
              onClick={() => setAssigningToNode(node.id)}
              >
                <Plus className="w-3 h-3 text-text-dim" />
              </div>

              {/* Cards Container */}
              <div className={cn(
                "w-full md:w-1/2 pl-20 md:px-12 pt-10 md:pt-0 space-y-4",
                isLeft ? "md:pr-12 md:pl-0 md:text-right" : "md:pl-12 md:pr-0 md:ml-auto"
              )}>
                {assignedTasks.map(t => {
                  const areaConfig = config.areas?.[t.category || ''];
                  const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
                  return (
                    <div key={t.id} className={cn(
                      "relative bg-base-dim/5 border border-border-line/30 p-4 rounded-xl flex items-center gap-3 group hover:border-border-line/60 transition-colors",
                      isLeft && "md:flex-row-reverse"
                    )}>
                      <div className={cn(`w-2 h-2 rounded-full bg-${color}-500/50`)} />
                      <div className={cn("flex-grow", isLeft && "md:text-right")}>
                        <div className="text-sm font-sans text-text-main font-medium">{t.text}</div>
                        <div className="text-[10px] font-mono text-text-dim">{t.category || 'Sin Área'}</div>
                      </div>
                      
                      <div className="relative">
                        <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)} className="p-1 text-text-dim hover:text-primary bg-transparent border-0 cursor-pointer">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === t.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 md:right-auto md:left-0 top-full mt-1 z-50 w-40 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleUnassign(t.id); }}
                                className="px-3 py-2 text-[10px] text-red-500 hover:bg-red-50/10 rounded-lg cursor-pointer bg-transparent border-0 text-left font-light w-full"
                              >
                                Devolver al Banco
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment Bottom Sheet / Modal */}
      {assigningToNode && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-base/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full md:w-[400px] bg-base border border-border-line rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] pb-8 md:pb-0">
            <div className="p-4 border-b border-border-line/30 flex justify-between items-center bg-base-dim/5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                Asignar Proyecto a {nodes.find(n => n.id === assigningToNode)?.label}
              </h3>
              <button onClick={() => setAssigningToNode(null)} className="text-text-dim hover:text-text-main bg-transparent border-0 text-lg font-light leading-none p-2 cursor-pointer">&times;</button>
            </div>
            <div className="p-4 border-b border-border-line/20">
              <input 
                type="text" 
                placeholder="Buscar proyecto libre..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-base-dim/10 border border-border-line/50 rounded-lg px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto p-2">
              {filteredFreeProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-dim font-light">No hay proyectos disponibles en el banco.</div>
              ) : (
                filteredFreeProjects.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => handleAssign(t.id, assigningToNode)}
                    className="w-full text-left p-3 hover:bg-base-dim/10 rounded-xl flex items-center gap-3 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-primary/60 shrink-0" />
                    <div>
                      <div className="text-sm font-sans text-text-main">{t.text}</div>
                      <div className="text-[9px] font-mono text-text-dim">{t.category}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
