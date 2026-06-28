import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Activity, Wrench, ChevronDown, ChevronRight, RotateCw, Repeat } from 'lucide-react';
import { AppTask, Config, HistoryRecord } from '../types';
import { timeToMins, extractSafeTime, isSameDay } from '../lib/utils';
import { cn } from '../lib/utils';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
}

export default function CalendarioView({ config, tasks, history }: Props) {
  const [filter, setFilter] = useState('Todas');
  const [expandedRoutines, setExpandedRoutines] = useState<string[]>([]);
  const dailyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (dailyScrollRef.current) {
        dailyScrollRef.current.scrollLeft = dailyScrollRef.current.scrollWidth;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [filter]);
  
  const toggleExpand = (id: string) => {
    setExpandedRoutines(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  let allHabits = tasks.filter(t => t.type === 'Hábito' || t.type === 'Pulso' || t.type === 'Rutina');
  if (filter !== 'Todas') {
    allHabits = allHabits.filter(h => h.category === filter);
  }

  allHabits.sort((a, b) => timeToMins(extractSafeTime(a.hora)) - timeToMins(extractSafeTime(b.hora)));
  if (allHabits.length === 0) {
    return (
      <div className="flex flex-col animate-in fade-in pt-8 pb-10 px-6 md:px-10">
        <Header filter={filter} setFilter={setFilter} config={config} />
        <div className="p-8 text-center text-text-dim border border-dashed border-border-line/45 font-mono text-xs uppercase">
          No hay elementos para esta selección.
        </div>
      </div>
    );
  }

  const getFrecuenciaInDays = (freq: number | undefined, unit: string | undefined): number => {
    const f = freq || 1;
    const u = unit || 'días';
    if (u === 'semanas') return f * 7;
    if (u === 'meses') return f * 30;
    return f;
  };

  const dailyHabitsRaw = allHabits.filter(h => getFrecuenciaInDays(h.frecuencia, h.frecuenciaUnidad) <= 7 || h.type === 'Pulso');
  const maintHabitsRaw = allHabits.filter(h => getFrecuenciaInDays(h.frecuencia, h.frecuenciaUnidad) > 7 && h.type !== 'Pulso');
  
  const topLevelDaily = dailyHabitsRaw.filter(h => h.type !== 'Hábito' || !dailyHabitsRaw.some(r => r.type === 'Rutina' && r.id === h.parentId));
  const topLevelHabits = topLevelDaily.filter(h => h.type !== 'Pulso');
  const topLevelPulses = topLevelDaily.filter(h => h.type === 'Pulso');
  const topLevelMaint = maintHabitsRaw.filter(h => h.type !== 'Hábito' || !maintHabitsRaw.some(r => r.type === 'Rutina' && r.id === h.parentId));

  const days: Date[] = [];
  for (let i = 29; i >= 0; i--) { 
    const d = new Date(); 
    d.setDate(d.getDate() - i); 
    days.push(d); 
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col animate-in fade-in px-6 md:px-10 pt-10 pb-16 max-w-4xl mx-auto w-full">
      <Header filter={filter} setFilter={setFilter} config={config} />

      {/* Leyenda de Colores */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10px] font-mono uppercase tracking-wider text-text-dim/80 mb-6 border-b border-border-line/10 pb-4 justify-start">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-[var(--color-primary)] rounded-sm"></div>
          <span>Hábito/Acción</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-accent rounded-sm"></div>
          <span>Rutina / Progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[8px] font-bold text-primary rounded-sm">1</div>
          <span>Pulso Logrado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-amber-500/20 border border-amber-500/25 flex items-center justify-center text-[8px] font-bold text-amber-600 rounded-sm">1</div>
          <span>Pulso en Progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-red-500/20 border border-red-500/25 flex items-center justify-center text-[8px] font-bold text-red-600 rounded-sm">!</div>
          <span>Pulso Excedido (Evitar)</span>
        </div>
      </div>

      {topLevelHabits.length > 0 && (
        <div className="bg-transparent py-4 md:py-6 border-b border-border-line/40 mb-8 text-left">
          <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 pb-2 border-b border-border-line/20 flex items-center gap-2">
            Hábitos y Rutinas Diarias
          </h3>
          
          <div ref={dailyScrollRef} className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 px-3 border-b border-border-line/40 text-text-dim font-mono text-xs uppercase tracking-wider w-48 sticky left-0 bg-base z-10">Elemento</th>
                  {days.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} className={cn("py-2 border-b border-border-line/30 text-center text-xs font-mono w-8", isToday ? "text-primary font-bold bg-[var(--color-primary)]/10" : "text-text-dim/70")}>
                        {d.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {topLevelHabits.map(item => {
                  const isRoutine = item.type === 'Rutina';
                  const isExpanded = expandedRoutines.includes(item.id);
                  const subtasks = dailyHabitsRaw.filter(t => t.parentId === item.id && t.type === 'Hábito');

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-base-dim/30 transition-colors">
                        <td className="py-2.5 px-3 border-b border-border-line/20 text-text-main font-normal truncate max-w-[12rem] sticky left-0 bg-base z-10">
                          <div className="flex items-center gap-1">
                            {isRoutine ? (
                               <button onClick={() => toggleExpand(item.id)} className="p-0.5 hover:bg-base-dim/50 rounded-none text-text-dim bg-transparent border-0 cursor-pointer">
                                 {isExpanded ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                               </button>
                            ) : (
                               <div className="w-[18px] shrink-0"></div>
                            )}
                            <span className="text-xs text-primary font-mono min-w-8">{extractSafeTime(item.hora) || '-'}</span>
                            {item.type === 'Pulso' && <Activity className="inline w-3.5 h-3.5 text-primary/80 mr-1" />}
                            <span className="truncate font-light">{item.text}</span>
                          </div>
                        </td>
                        {days.map((d, i) => {
                          const execs = history.filter(h => h.taskId === item.id && isSameDay(h.date, d.toISOString()));
                          const count = execs.length;
                          let cellContent = null;

                          if (isRoutine) {
                            const subtasksCount = subtasks.length;
                            const subtasksCompleted = subtasks.filter(st => history.some(h => h.taskId === st.id && isSameDay(h.date, d.toISOString()))).length;
                            
                            if (subtasksCount === 0) {
                              cellContent = <div className={cn("w-[18px] h-[18px] mx-auto rounded-none", count ? "bg-accent" : "bg-transparent")}></div>;
                            } else {
                              const ratio = count > 0 ? 1 : Math.min(subtasksCompleted / subtasksCount, 1);
                              if (ratio === 0) {
                                 cellContent = <div className="w-[18px] h-[18px] mx-auto rounded-none bg-transparent"></div>;
                              } else {
                                 cellContent = <div className="w-[18px] h-[18px] mx-auto rounded-none bg-accent" style={{ opacity: Math.max(0.2, ratio) }} title={`${subtasksCompleted}/${subtasksCount}`}></div>;
                              }
                            }
                          } else if (item.type === 'Pulso') {
                            const target = item.targetCount || item.objetivo || 1;
                            const isAbandonar = item.polaridad === 'Abandonar';
                            
                            if (isAbandonar) {
                              const isOver = count > target;
                              cellContent = (
                                <div 
                                  className={cn(
                                    "w-5 h-5 mx-auto rounded-none flex items-center justify-center font-mono text-[9px] font-bold",
                                    count === 0 ? "text-text-main/20 bg-transparent" :
                                    isOver ? "bg-red-500/20 text-red-600 border border-red-500/25" :
                                    "bg-amber-500/20 text-amber-600 border border-amber-500/25"
                                  )}
                                  title={`Log: ${count}/${target}`}
                                >
                                  {count > 0 ? count : '-'}
                                </div>
                              );
                            } else {
                              const isDone = count >= target;
                              cellContent = (
                                <div 
                                  className={cn(
                                    "w-5 h-5 mx-auto rounded-none flex items-center justify-center font-mono text-[9px] font-bold",
                                    count === 0 ? "text-text-main/20 bg-transparent" :
                                    isDone ? "bg-primary/20 text-primary border border-primary/30" :
                                    "bg-primary/10 text-primary/80 border border-primary/10"
                                  )}
                                  title={`Log: ${count}/${target}`}
                                >
                                  {count > 0 ? count : '-'}
                                </div>
                              );
                            }
                          } else {
                            cellContent = <div className={cn("w-[18px] h-[18px] mx-auto rounded-none", count ? "bg-primary" : "bg-transparent")}></div>;
                          }

                          return <td key={i} className="py-2 border-b border-border-line/20 text-center">{cellContent}</td>;
                        })}
                      </tr>
                      {isExpanded && subtasks.map(st => (
                        <tr key={st.id} className="hover:bg-base-dim/20 transition-colors bg-transparent border-b border-border-line/10">
                          <td className="py-2 px-3 border-b border-border-line/15 text-text-dim truncate max-w-[12rem] sticky left-0 bg-base z-10 pl-8">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-[10px] text-primary/80 min-w-6 font-mono">{extractSafeTime(st.hora) || '-'}</span>
                              <span className="truncate font-light text-text-dim">{st.text}</span>
                            </div>
                          </td>
                          {days.map((d, i) => {
                            const stCount = history.filter(h => h.taskId === st.id && isSameDay(h.date, d.toISOString())).length;
                            return (
                              <td key={`st-${i}`} className="py-2 border-b border-border-line/15 text-center">
                                <div className={cn("w-4 h-4 mx-auto rounded-none", stCount ? "bg-[var(--color-primary)]" : "bg-transparent")}></div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topLevelPulses.length > 0 && (
        <div className="bg-transparent py-4 md:py-6 border-b border-border-line/40 mb-8 text-left">
          <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 pb-2 border-b border-border-line/20 flex items-center gap-2">
            Pulsos (Eventos Frecuentes)
          </h3>
          
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 px-3 border-b border-border-line/40 text-text-dim font-mono text-xs uppercase tracking-wider w-48 sticky left-0 bg-base z-10">Elemento</th>
                  {days.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} className={cn("py-2 border-b border-border-line/30 text-center text-xs font-mono w-8", isToday ? "text-primary font-bold bg-[var(--color-primary)]/10" : "text-text-dim/70")}>
                        {d.getDate()}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {topLevelPulses.map(item => {
                  return (
                    <tr key={item.id} className="hover:bg-base-dim/30 transition-colors">
                      <td className="py-2.5 px-3 border-b border-border-line/20 text-text-main font-normal truncate max-w-[12rem] sticky left-0 bg-base z-10">
                        <div className="flex items-center gap-1">
                          <div className="w-[18px] shrink-0"></div>
                          <span className="text-xs text-primary font-mono min-w-8">{extractSafeTime(item.hora) || '-'}</span>
                          <Activity className="inline w-3.5 h-3.5 text-primary/80 mr-1" />
                          <span className="truncate font-light">{item.text}</span>
                        </div>
                      </td>
                      {days.map((d, i) => {
                        const execs = history.filter(h => h.taskId === item.id && isSameDay(h.date, d.toISOString()));
                        const count = execs.length;
                        
                        const target = item.targetCount || item.objetivo || 1;
                        const isAbandonar = item.polaridad === 'Abandonar';
                        let cellContent = null;
                        
                        if (isAbandonar) {
                          const isOver = count > target;
                          cellContent = (
                            <div 
                              className={cn(
                                "w-5 h-5 mx-auto rounded-none flex items-center justify-center font-mono text-[9px] font-bold",
                                count === 0 ? "text-text-main/20 bg-transparent" :
                                isOver ? "bg-red-500/20 text-red-600 border border-red-500/25" :
                                "bg-amber-500/20 text-amber-600 border border-amber-500/25"
                              )}
                              title={`Log: ${count}/${target}`}
                            >
                              {count > 0 ? count : '-'}
                            </div>
                          );
                        } else {
                          const isDone = count >= target;
                          cellContent = (
                            <div 
                              className={cn(
                                "w-5 h-5 mx-auto rounded-none flex items-center justify-center font-mono text-[9px] font-bold",
                                count === 0 ? "text-text-main/20 bg-transparent" :
                                isDone ? "bg-primary/20 text-primary border border-primary/30" :
                                "bg-primary/10 text-primary/80 border border-primary/10"
                              )}
                              title={`Log: ${count}/${target}`}
                            >
                              {count > 0 ? count : '-'}
                            </div>
                          );
                        }
                        
                        return <td key={i} className="py-2 border-b border-border-line/20 text-center">{cellContent}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topLevelMaint.length > 0 && (
        <div className="bg-transparent py-4 md:py-6 border-b border-border-line/40 text-left">
          <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 pb-2 border-b border-border-line/20 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" /> Mantenimiento Estratégico (≥ 7 días)
          </h3>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 px-3 border-b border-border-line/40 text-text-dim font-mono text-xs uppercase w-56 sticky left-0 bg-base z-10">Hábito</th>
                  <th className="py-2 px-3 border-b border-border-line/40 text-text-dim font-mono text-xs uppercase w-28 text-center font-bold">Plan</th>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                    <th key={q} className="py-2 border-b border-border-line/40 text-center text-xs font-mono font-bold text-primary/80 w-12 bg-base-dim/10">{q}</th>
                  ))}
                  {months.map(m => (
                    <th key={m} className="py-2 border-b border-border-line/40 text-center text-xs font-mono text-text-dim/70 w-10">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topLevelMaint.map(habit => {
                  const isRoutine = habit.type === 'Rutina';
                  const isExpanded = expandedRoutines.includes(habit.id);
                  const subtasks = maintHabitsRaw.filter(t => t.parentId === habit.id && t.type === 'Hábito');

                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const planDate = habit.fechaPlanificada ? new Date(habit.fechaPlanificada) : new Date();
                  planDate.setHours(0,0,0,0);
                  
                  const diffDays = Math.ceil((planDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  let hText = `En ${diffDays}d`;
                  if (diffDays < 0) {
                    hText = `Vencido (${Math.abs(diffDays)}d)`;
                  } else if (diffDays <= 3) {
                    hText = diffDays === 0 ? 'Hoy' : `En ${diffDays}d`;
                  }

                  const execs = history.filter(h => h.taskId === habit.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const lastDateStr = execs.length > 0 ? new Date(execs[0].date).toLocaleDateString() : 'Sin registro';

                  return (
                    <React.Fragment key={habit.id}>
                      <tr className="hover:bg-base-dim/30 transition-colors group">
                        <td className="py-2.5 px-3 border-b border-border-line/20 sticky left-0 bg-base z-10 group-hover:bg-base-dim/30">
                          <div className="flex items-center gap-1 font-medium truncate max-w-[14rem] text-text-main">
                            {isRoutine ? (
                               <button onClick={() => toggleExpand(habit.id)} className="p-0.5 hover:bg-base-dim/50 rounded-none text-text-dim bg-transparent border-0 cursor-pointer">
                                 {isExpanded ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                               </button>
                            ) : (
                               <div className="w-[18px] shrink-0"></div>
                            )}
                            <span className="text-xs text-primary font-mono min-w-8">{extractSafeTime(habit.hora) || '-'}</span>
                            <span className="truncate font-light text-text-main" title={habit.text}>{habit.text}</span>
                          </div>
                          <p className="text-[10px] text-text-dim/70 font-mono mt-1 ml-6">Última: {lastDateStr} <span className="mx-1 text-[var(--color-border-line)]/50">•</span> Ciclo: {habit.frecuencia}d</p>
                        </td>
                        <td className="py-2 px-3 border-b border-border-line/20 text-center">
                          <span className="inline-block text-[10px] font-mono px-2 py-0.5 border border-border-line text-text-main rounded-none" title={`Planificado: ${habit.fechaPlanificada ? habit.fechaPlanificada.substring(0, 10) : 'N/A'}`}>
                            {hText}
                          </span>
                        </td>
                        {[0, 1, 2, 3].map(qIndex => {
                          const startMonth = qIndex * 3;
                          const qExecs = isRoutine 
                            ? history.filter(h => {
                                const tkIdMatch = subtasks.length > 0 ? subtasks.some(st => st.id === h.taskId) : h.taskId === habit.id;
                                const d = new Date(h.date);
                                return tkIdMatch && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3 && d.getFullYear() === currentYear;
                              })
                            : execs.filter(h => {
                                const d = new Date(h.date);
                                return d.getMonth() >= startMonth && d.getMonth() < startMonth + 3 && d.getFullYear() === currentYear;
                              });
                          return (
                            <td key={`q-${qIndex}`} className="py-2 border-b border-border-line/20 text-center bg-base-dim/5">
                              {qExecs.length > 0 ? (
                                <span className="font-mono font-bold text-[11px] text-primary">{qExecs.length}</span>
                              ) : (
                                <span className="text-[var(--color-border-line)]/40 text-[10px] font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                        {months.map((m, index) => {
                          let monthExecs;
                          if (isRoutine) {
                            monthExecs = history.filter(h => {
                               const tkIdMatch = subtasks.length > 0 ? subtasks.some(st => st.id === h.taskId) : h.taskId === habit.id;
                               const d = new Date(h.date);
                               return tkIdMatch && d.getMonth() === index && d.getFullYear() === currentYear;
                            });
                          } else {
                            monthExecs = execs.filter(h => {
                              const d = new Date(h.date);
                              return d.getMonth() === index && d.getFullYear() === currentYear;
                            });
                          }

                          return (
                            <td key={index} className="py-2 border-b border-border-line/20 text-center">
                              {monthExecs.length > 0 ? (
                                <span className="flex items-center justify-center w-5 h-5 mx-auto rounded-none text-[var(--color-base)] bg-[var(--color-primary)] font-mono font-bold text-[10px] cursor-help transition-transform hover:scale-105" title={`${monthExecs.length} ejecuciones (${monthExecs.reduce((sum, e) => sum + (e.duration || 0), 0)}h)`}>
                                  {monthExecs.length}
                                </span>
                              ) : (
                                <span className="text-[var(--color-border-line)]/40 text-xs font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && subtasks.map(st => {
                        const stExecs = history.filter(h => h.taskId === st.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        return (
                          <tr key={st.id} className="hover:bg-base-dim/20 transition-colors bg-transparent border-b border-border-line/10">
                            <td className="py-2 px-3 border-b border-border-line/15 sticky left-0 bg-base z-10 pl-8">
                               <div className="flex items-center gap-1 text-text-dim truncate max-w-[12rem]">
                                 <span className="text-[10px] text-primary/80 min-w-8 font-mono">{extractSafeTime(st.hora) || '-'}</span>
                                 <span className="truncate text-xs font-light">{st.text}</span>
                               </div>
                            </td>
                            <td className="py-2 px-3 border-b border-border-line/15 text-center"></td>
                            {[0, 1, 2, 3].map(qIndex => {
                               const startMonth = qIndex * 3;
                               const qExecs = stExecs.filter(h => {
                                 const d = new Date(h.date);
                                 return d.getMonth() >= startMonth && d.getMonth() < startMonth + 3 && d.getFullYear() === currentYear;
                               });
                               return (
                                 <td key={`st-q-${qIndex}`} className="py-2 border-b border-border-line/15 text-center bg-base-dim/5">
                                   {qExecs.length > 0 ? (
                                     <span className="text-text-main font-mono font-bold text-xs">{qExecs.length}</span>
                                   ) : (
                                     <span className="text-[var(--color-border-line)]/40 text-xs font-mono">-</span>
                                   )}
                                 </td>
                               );
                            })}
                            {months.map((m, index) => {
                              const mExecs = stExecs.filter(h => {
                                const d = new Date(h.date);
                                return d.getMonth() === index && d.getFullYear() === currentYear;
                              });
                              return (
                                <td key={`st-${index}`} className="py-2 border-b border-border-line/15 text-center">
                                  {mExecs.length > 0 ? (
                                    <span className="text-text-main font-mono font-bold text-xs">{mExecs.length}</span>
                                  ) : (
                                    <span className="text-[var(--color-border-line)]/40 text-xs font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ filter, setFilter, config }: { filter: string, setFilter: (val: string) => void, config: Config | null }) {
  return (
    <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-border-line pb-6 text-left">
      <h2 className="text-title flex items-center gap-3">
        <Calendar className="text-text-main w-6 h-6 stroke-[2]" /> Seguimiento Operativo
      </h2>
      <div className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 flex items-center pr-6 bg-base">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0"
        >
          <option value="Todas">Todas las áreas</option>
          {Object.keys(config?.areas || {}).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
      </div>
    </div>
  )
}
