import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Save, CheckCircle2, Circle, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTask } from '../types';
import { cn } from '../lib/utils';

interface FloatingTimerProps {
  activeTimer: {
    taskId: string;
    startTime: string;
    sessionStart?: string;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null;
  tasks: AppTask[];
  onPause: () => void;
  onResume: () => void;
  onStop: (saveHistory: boolean) => void;
  onDiscard: () => void;
  onStartTimer: (taskId: string) => void;
  onUpdateStartTime: (newStartTime: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function FloatingTimer({
  activeTimer,
  tasks,
  onPause,
  onResume,
  onStop,
  onDiscard,
  onStartTimer,
  onUpdateStartTime,
  isMinimized = false,
  onToggleMinimize
}: FloatingTimerProps) {
  const [ticker, setTicker] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editHHMM, setEditHHMM] = useState('');
  const [editMinutes, setEditMinutes] = useState(0);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;

    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  // Filter tasks matching the search text
  const filteredTasks = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.completed && t.type !== 'Pulso' && t.type !== 'Rutina');
    if (!search.trim()) return activeTasks.slice(0, 5); // show first 5 active tasks by default
    return activeTasks.filter(t => t.text.toLowerCase().includes(search.toLowerCase())).slice(0, 10);
  }, [tasks, search]);

  if (!activeTimer) {
    return (
      <div className="w-full bg-base border-t border-border-line select-none flex flex-col shrink-0 fixed md:relative bottom-[50px] md:bottom-0 left-0 right-0 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-border-line)]/20 transition-all text-left text-[11px] font-sans font-medium uppercase tracking-wider text-text-dim hover:text-text-main bg-transparent border-0 outline-none cursor-pointer"
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

  const startEditMode = () => {
    const sessionStartISO = activeTimer.sessionStart || activeTimer.startTime;
    const startDate = new Date(sessionStartISO);
    const hh = String(startDate.getHours()).padStart(2, '0');
    const mm = String(startDate.getMinutes()).padStart(2, '0');
    setEditHHMM(`${hh}:${mm}`);
    
    let curSecs = activeTimer.elapsedSeconds;
    if (activeTimer.isRunning) {
      const elapsedMs = new Date().getTime() - new Date(activeTimer.startTime).getTime();
      curSecs += Math.floor(elapsedMs / 1000);
    }
    setEditMinutes(Math.floor(curSecs / 60));
    setIsEditing(true);
  };

  const handleHHMMChange = (val: string) => {
    setEditHHMM(val);
    const [h, m] = val.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const sessionStartISO = activeTimer.sessionStart || activeTimer.startTime;
      const d = new Date(sessionStartISO);
      d.setHours(h);
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
      
      const diffMs = new Date().getTime() - d.getTime();
      setEditMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    }
  };

  const handleMinutesChange = (val: number) => {
    setEditMinutes(val);
    const d = new Date(new Date().getTime() - val * 60000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setEditHHMM(`${hh}:${mm}`);
  };

  if (isMinimized) {
    return (
      <div className="fixed md:relative bottom-[50px] md:bottom-0 left-0 right-0 md:right-auto w-full md:w-auto bg-base border-t border-border-line z-50 md:z-0 px-4 py-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] md:shadow-none h-[52px] flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
          <Circle className={cn("w-2 h-2 fill-current shrink-0", activeTimer.isRunning ? "text-accent animate-pulse" : "text-secondary")} />
          <span className="text-xs font-medium text-text-main truncate max-w-[12rem]">{taskName}</span>
          <span className="text-xs font-mono font-bold text-text-main shrink-0">{formattedTime}</span>
        </div>
        <div className="flex items-center gap-3">
          {activeTimer.isRunning ? (
            <button onClick={onPause} className="p-1 hover:bg-base-dim/40 rounded-full transition-colors cursor-pointer bg-transparent border-0 outline-none" title="Pausar">
              <Pause className="w-4 h-4 text-text-dim hover:text-text-main" />
            </button>
          ) : (
            <button onClick={onResume} className="p-1 hover:bg-base-dim/40 rounded-full transition-colors cursor-pointer bg-transparent border-0 outline-none" title="Reanudar">
              <Play className="w-4 h-4 text-text-dim hover:text-text-main" />
            </button>
          )}
          <button onClick={() => onStop(true)} className="p-1 hover:bg-base-dim/40 rounded-full transition-colors cursor-pointer bg-transparent border-0 outline-none" title="Completar y Guardar">
            <CheckCircle2 className="w-4 h-4 text-accent" />
          </button>
          {onToggleMinimize && (
            <button onClick={onToggleMinimize} className="p-1 hover:bg-base-dim/40 rounded-full transition-colors cursor-pointer bg-transparent border-0 outline-none" title="Expandir tracker">
              <ChevronDown className="w-4 h-4 text-text-dim rotate-180" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed md:relative bottom-[50px] md:bottom-0 left-0 right-0 md:right-auto w-full md:w-auto bg-base border-t border-border-line z-50 md:z-0 p-4 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] md:shadow-none h-[220px] flex flex-col justify-between transition-all duration-300">
      <div className="absolute top-0 right-0 p-4 flex gap-2">
        {onToggleMinimize && (
          <button 
            onClick={onToggleMinimize}
            className="text-text-dim hover:text-text-main p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
            title="Minimizar tracker"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={onDiscard}
          className="text-primary hover:text-red-500 transition-colors animate-in fade-in"
          title="Descartar este tiempo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isEditing ? (
        <div 
          onClick={startEditMode}
          className="flex flex-col flex-1 justify-between group/timer cursor-pointer hover:bg-base-dim/40 rounded-xl p-2 transition-all duration-200 mt-2"
          title="Click para ajustar la hora de inicio y duración"
        >
          <div className="flex flex-col mb-1 animate-in fade-in">
            <div className="flex items-center gap-2 mb-2 justify-between">
              <div className="flex items-center gap-2">
                <Circle className={cn("w-2 h-2 fill-current", activeTimer.isRunning ? "text-accent animate-pulse" : "text-secondary")} />
                <span className="text-xs uppercase text-text-dim tracking-widest">
                  {activeTimer.isRunning ? 'EN TIEMPO REAL' : 'PAUSADO'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-text-dim opacity-0 group-hover/timer:opacity-100 transition-opacity">✏️ EDITAR</span>
            </div>
            
            <div className="overflow-hidden w-full py-1 cursor-pointer">
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
          
          <div className="mb-1 flex items-end gap-2 h-10 animate-in fade-in">
            <div className="text-3xl text-text-main tracking-tight leading-none">
              {formattedTime}
            </div>
            <div className="text-primary text-xs pb-1">
              ({decimalHours}h)
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-2 p-2 bg-base-dim/10 rounded-xl border border-border-line/40 animate-in slide-in-from-top-2 duration-200 mt-2">
          <span className="text-[10px] font-mono uppercase text-text-dim font-bold">Ajustar Hora de Inicio</span>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col gap-1 text-left flex-1">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Hora Inicio</label>
              <input 
                type="time" 
                className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none focus:border-[#a2b29f] w-full"
                value={editHHMM}
                onChange={e => handleHHMMChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 text-left flex-1">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Duración (mins)</label>
              <input 
                type="number" 
                min={0}
                className="px-2.5 py-1 text-xs bg-base border border-border-line rounded-lg text-text-main font-mono outline-none focus:border-[#a2b29f] w-full"
                value={editMinutes}
                onChange={e => handleMinutesChange(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-0.5 justify-end">
            <button 
              onClick={() => setIsEditing(false)}
              className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none"
            >
              ✕ Cancelar
            </button>
            <button 
              onClick={() => {
                const [h, m] = editHHMM.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) {
                  const sessionStartISO = activeTimer.sessionStart || activeTimer.startTime;
                  const d = new Date(sessionStartISO);
                  d.setHours(h);
                  d.setMinutes(m);
                  d.setSeconds(0);
                  d.setMilliseconds(0);
                  onUpdateStartTime(d.toISOString());
                }
                setIsEditing(false);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer bg-transparent border-0 outline-none"
            >
              ✓ Guardar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border-line pt-4 animate-in fade-in">
        {activeTimer.isRunning ? (
          <button
            onClick={onPause}
            className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2 bg-transparent border-0 outline-none cursor-pointer"
            title="Pausar"
          >
            <Pause className="w-4 h-4 group-hover:text-accent" /> 
            <span className="text-[8px] uppercase tracking-widest">PAUSAR</span>
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2 bg-transparent border-0 outline-none cursor-pointer"
            title="Reanudar"
          >
            <Play className="w-4 h-4 group-hover:text-accent" /> 
            <span className="text-[8px] uppercase tracking-widest">REANUDAR</span>
          </button>
        )}

        <button
          onClick={() => onStop(false)}
          className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2 bg-transparent border-0 outline-none cursor-pointer"
          title="Guardar"
        >
          <Save className="w-4 h-4 group-hover:text-accent" /> 
          <span className="text-[8px] uppercase tracking-widest">GUARDAR</span>
        </button>

        <button
          onClick={() => onStop(true)}
          className="flex flex-col items-center gap-2 text-text-dim hover:text-text-main transition-colors group p-2 bg-transparent border-0 outline-none cursor-pointer"
          title="Finalizar"
        >
          <CheckCircle2 className="w-4 h-4 text-accent group-hover:text-text-main" /> 
          <span className="text-[8px] uppercase tracking-widest text-accent group-hover:text-text-main">FIN</span>
        </button>
      </div>
    </div>
  );
}
