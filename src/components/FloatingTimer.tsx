import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Save, CheckCircle2, Circle, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTask } from '../types';
import { cn } from '../lib/utils';

interface FloatingTimerProps {
  activeTimer: {
    taskId: string;
    startTime: string;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null;
  tasks: AppTask[];
  onPause: () => void;
  onResume: () => void;
  onStop: (saveHistory: boolean) => void;
  onDiscard: () => void;
  onStartTimer: (taskId: string) => void;
}

export default function FloatingTimer({
  activeTimer,
  tasks,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onStartTimer
}: FloatingTimerProps) {
  const [ticker, setTicker] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;

    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Filter tasks matching the search text
  const filteredTasks = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.completed);
    if (!search.trim()) return activeTasks.slice(0, 5); // show first 5 active tasks by default
    return activeTasks.filter(t => t.text.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [tasks, search]);

  if (!activeTimer) {
    return (
      <div className="w-full bg-base border-t border-border-line select-none flex flex-col shrink-0">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-border-line)]/20 transition-all text-left text-xs font-mono font-bold uppercase tracking-wider text-text-dim hover:text-text-main bg-transparent border-0 outline-none cursor-pointer"
        >
          <span className="flex items-center gap-2">⏱️ INICIAR TRACKER</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-text-dim", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="p-4 border-t border-border-line/40 flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-200 bg-base-dim/10">
            <input
              type="text"
              placeholder="Buscar tarea o hábito..."
              className="w-full px-3 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />

            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
              {filteredTasks.length === 0 ? (
                <div className="text-[9px] text-text-dim font-mono text-center uppercase py-3">Sin resultados</div>
              ) : (
                filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onStartTimer(t.id);
                      setSearch('');
                      setIsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-base-dim/40 transition-colors text-xs text-text-main flex items-center justify-between text-left bg-transparent border-0 cursor-pointer"
                  >
                    <span className="truncate pr-2 text-xs font-light text-text-main" title={`${t.text} (${t.type})`}>
                      {t.type === 'Hábito' ? '🌱 ' : 
                       t.type === 'Pulso' ? '💓 ' : 
                       t.type === 'Proyecto' ? '📁 ' : 
                       t.type === 'Rutina' ? '🔁 ' : '📝 '}
                      {t.text}
                    </span>
                    <Play className="w-2.5 h-2.5 text-[#a2b29f] shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const task = tasks.find(t => t.id === activeTimer.taskId);
  const taskName = task ? task.text : 'TAREA SIN NOMBRE';

  // Calculate elapsed time
  let totalSeconds = activeTimer.elapsedSeconds;
  if (activeTimer.isRunning) {
    const elapsedMs = new Date().getTime() - new Date(activeTimer.startTime).getTime();
    totalSeconds += Math.floor(elapsedMs / 1000);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const formattedTime = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(secs).padStart(2, '0')
  ]
    .filter(Boolean)
    .join(':');

  const decimalHours = parseFloat((totalSeconds / 3600).toFixed(2));

  return (
    <div className="fixed md:relative bottom-0 left-0 right-0 md:right-auto w-full md:w-auto bg-base border-t md:border-t-0 border-border-line z-50 md:z-0 p-4 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] md:shadow-none h-[200px] flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-4">
        <button 
          onClick={onDiscard}
          className="text-primary hover:text-red-500 transition-colors animate-in fade-in"
          title="Descartar este tiempo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col mb-2 animate-in fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Circle className={cn("w-2 h-2 fill-current", activeTimer.isRunning ? "text-accent animate-pulse" : "text-secondary")} />
          <span className="text-xs uppercase text-text-dim tracking-widest">
            {activeTimer.isRunning ? 'EN TIEMPO REAL' : 'PAUSADO'}
          </span>
        </div>
        
        <div className="overflow-hidden w-full px-3 py-2 cursor-default">
          <motion.div 
            className="flex whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
          >
            <span className="font-normal text-sm tracking-wide text-text-main pr-8">{taskName}</span>
            <span className="font-normal text-sm tracking-wide text-text-main pr-8">{taskName}</span>
          </motion.div>
        </div>
      </div>
      
      <div className="mb-2 flex items-end gap-2 h-[60px] animate-in fade-in">
        <div className="text-3xl text-text-main tracking-tight leading-none">
          {formattedTime}
        </div>
        <div className="text-primary text-xs pb-1">
          ({decimalHours}h)
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-line pt-4 animate-in fade-in">
        {activeTimer.isRunning ? (
          <button
            onClick={onPause}
            className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2"
            title="Pausar"
          >
            <Pause className="w-4 h-4 group-hover:text-accent" /> 
            <span className="text-[8px] uppercase tracking-widest">PAUSAR</span>
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2"
            title="Reanudar"
          >
            <Play className="w-4 h-4 group-hover:text-accent" /> 
            <span className="text-[8px] uppercase tracking-widest">REANUDAR</span>
          </button>
        )}

        <button
          onClick={() => onStop(false)}
          className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2"
          title="Guardar"
        >
          <Save className="w-4 h-4 group-hover:text-accent" /> 
          <span className="text-[8px] uppercase tracking-widest">GUARDAR</span>
        </button>

        <button
          onClick={() => onStop(true)}
          className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2"
          title="Finalizar"
        >
          <CheckCircle2 className="w-4 h-4 text-accent group-hover:text-text-main" /> 
          <span className="text-[8px] uppercase tracking-widest text-accent group-hover:text-text-main">FIN</span>
        </button>
      </div>
    </div>
  );
}
