import React, { useState } from 'react';
import { AppTask, Config } from '../types';
import { cn } from '../lib/utils';
import { Layers, Plus, MoreHorizontal } from 'lucide-react';

interface Props {
  tasks: AppTask[];
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  config: Config;
}

export default function CyclePlanner({ tasks, onUpdateTask, config }: Props) {
  const [assigningToPhase, setAssigningToPhase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const phases = [
    { id: 'reflexiva', label: 'Reflexiva', color: 'text-[#d4a373]', border: 'border-[#d4a373]', bg: 'bg-[#d4a373]' },
    { id: 'dinamica', label: 'Dinámica', color: 'text-[#81b29a]', border: 'border-[#81b29a]', bg: 'bg-[#81b29a]' },
    { id: 'expresiva', label: 'Expresiva', color: 'text-[#e07a5f]', border: 'border-[#e07a5f]', bg: 'bg-[#e07a5f]' },
    { id: 'creativa', label: 'Creativa', color: 'text-[#f2cc8f]', border: 'border-[#f2cc8f]', bg: 'bg-[#f2cc8f]' },
  ];

  // We look for tasks that have NO phase assigned.
  // We identify phase assignments by looking for "phase:{phase_id}" in fechaPlanificada.
  const freeProjects = tasks.filter(t => t.type === 'Proyecto' && (!t.fechaPlanificada || !t.fechaPlanificada.startsWith('phase:')));

  const handleAssign = (taskId: string, phaseId: string) => {
    onUpdateTask(taskId, { fechaPlanificada: `phase:${phaseId}` });
    setAssigningToPhase(null);
    setSearchQuery('');
  };

  const handleUnassign = (taskId: string) => {
    onUpdateTask(taskId, { fechaPlanificada: undefined });
  };

  const filteredFreeProjects = freeProjects.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="w-full mt-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {phases.map(phase => {
          const assignedTasks = tasks.filter(t => t.fechaPlanificada === `phase:${phase.id}`);

          return (
            <div key={phase.id} className="flex flex-col bg-base-dim/5 border border-border-line/30 rounded-2xl overflow-hidden min-h-[300px]">
              {/* Phase Header */}
              <div className={cn("p-4 border-b border-border-line/30 flex justify-between items-center relative overflow-hidden")}>
                <div className={cn("absolute inset-0 opacity-10", phase.bg)}></div>
                <h3 className={cn("text-xs font-mono uppercase tracking-widest font-bold relative z-10", phase.color)}>
                  {phase.label}
                </h3>
                <button 
                  onClick={() => setAssigningToPhase(phase.id)}
                  className="relative z-10 w-6 h-6 rounded-full bg-base border border-border-line/50 flex items-center justify-center cursor-pointer hover:bg-base-dim/20 transition-colors"
                >
                  <Plus className="w-3 h-3 text-text-main" />
                </button>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {assignedTasks.length === 0 ? (
                  <div className="text-[10px] text-text-dim/50 font-mono text-center pt-8 border-2 border-dashed border-border-line/20 rounded-xl pb-8">
                    Vacío
                  </div>
                ) : (
                  assignedTasks.map(t => {
                    const areaConfig = config.areas?.[t.category || ''];
                    const color = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
                    
                    return (
                      <div key={t.id} className="bg-base border border-border-line/30 p-3 rounded-xl flex items-center gap-2 group hover:border-border-line/60 transition-colors relative shadow-sm">
                        <div className={cn(`w-1.5 h-1.5 rounded-full bg-${color}-500/50 shrink-0`)} />
                        <div className="flex-grow min-w-0 pr-6">
                          <div className="text-xs font-sans text-text-main font-medium truncate" title={t.text}>{t.text}</div>
                        </div>
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)} className="p-1 text-text-dim hover:text-primary bg-transparent border-0 cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === t.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left">
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
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment Bottom Sheet / Modal */}
      {assigningToPhase && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-base/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full md:w-[400px] bg-base border border-border-line rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] pb-8 md:pb-0">
            <div className="p-4 border-b border-border-line/30 flex justify-between items-center bg-base-dim/5">
              <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                Asignar a Fase {phases.find(p => p.id === assigningToPhase)?.label}
              </h3>
              <button onClick={() => setAssigningToPhase(null)} className="text-text-dim hover:text-text-main bg-transparent border-0 text-lg font-light leading-none p-2 cursor-pointer">&times;</button>
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
                    onClick={() => handleAssign(t.id, assigningToPhase)}
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
