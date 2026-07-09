import React, { useState } from 'react';
import { Compass, BookOpen, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Config, CycleTrackingType, BiologicalPhase } from '../types';
import { calculateBiologicalPhase, getCyclePeriods, parseLocalDate, getCycleProjections, CycleProjections } from '../domain/cycle';
import { getLunarArchetype, getLunarDetailsForDate } from '../domain/lunar';
import { cn } from '../lib/utils';
import SyllabusView from './SyllabusView';



interface Props {
  config: Config | null;
  onUpdateConfig: (c: Partial<Config>) => void;
  onNavigate: (view: any) => void;
}

export default function SintoniaView({ config, onUpdateConfig, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'sincronizacion' | 'espejo' | 'syllabus'>('sincronizacion');

  const cycleType = config?.cycleConfig?.trackingType || 'none';
  const effectiveCycleType = (config?.cycleConfig?.menstruates === false && cycleType === 'menstrual') ? 'lunar' : cycleType;
  const currentPhase = calculateBiologicalPhase(config);

  const cycleProjections = getCycleProjections(config);
  const [showCalendarEditor, setShowCalendarEditor] = useState(false);

  const handleUpdateCycleType = (type: CycleTrackingType) => {
    onUpdateConfig({
      cycleConfig: {
        ...config?.cycleConfig,
        trackingType: type,
        lastCycleStartDate: type === 'menstrual' ? config?.cycleConfig?.lastCycleStartDate || new Date().toISOString().split('T')[0] : undefined,
        cycleLengthDays: type === 'menstrual' ? config?.cycleConfig?.cycleLengthDays || 28 : undefined,
        periodLengthDays: type === 'menstrual' ? config?.cycleConfig?.periodLengthDays || 5 : undefined,
        currentManualPhase: type === 'none' ? config?.cycleConfig?.currentManualPhase || 'dinamica' : undefined
      }
    });
  };

  const handleUpdateManualPhase = (phase: BiologicalPhase) => {
    onUpdateConfig({
      cycleConfig: {
        ...config?.cycleConfig,
        trackingType: 'none',
        currentManualPhase: phase
      }
    });
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base text-left">
      {/* Header Statement */}
      <div className="p-6 md:p-10 relative">
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 mb-6">
          <h1 className="text-title leading-none flex items-center gap-3 shrink-0">
            <Compass className="w-6 h-6 text-text-main" /> Sintonía Biológica
          </h1>
          <p className="text-sm text-text-dim md:text-right leading-relaxed max-w-xl">
            Sincronice su agenda y su nivel de energía ejecutiva en base a sus ciclos biológicos y ritmos naturales.
          </p>
        </div>

        {/* Top Tabs */}
        <div className="flex flex-wrap gap-6 font-sans text-xs uppercase tracking-widest font-light bg-transparent">
          {[
            { id: 'sincronizacion', label: 'Sincronización', icon: <Compass className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
            ...(config?.cycleConfig?.menstruates !== false
              ? [{ id: 'espejo', label: 'Espejo Lunar', icon: <Compass className="w-3.5 h-3.5 silhouette-icon text-text-main" /> }]
              : []),
            { id: 'syllabus', label: 'Syllabus', icon: <BookOpen className="w-3.5 h-3.5 silhouette-icon text-text-main" /> }
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer bg-transparent border-0 outline-none transition-colors pb-1",
                  isActive 
                    ? "text-primary border-b border-primary" 
                    : "text-text-dim hover:text-text-main"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto pb-24 text-left">
        {activeTab === 'sincronizacion' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Flat Tabs Sincronización Selector */}
            <div className="flex gap-8 border-b border-border-line pb-4 font-mono text-xs uppercase tracking-widest font-bold">
              {[
                ...(config?.cycleConfig?.menstruates !== false ? [{ key: 'menstrual', label: '🩸 Menstrual' }] : []),
                { key: 'lunar', label: '🌙 Lunar / Sinódico' },
                { key: 'weekly', label: '📅 Semanal' },
                { key: 'none', label: '🔄 Manual / Fijo' }
              ].map(t => {
                const isActive = effectiveCycleType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleUpdateCycleType(t.key as CycleTrackingType)}
                    className={cn(
                      "hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors",
                      isActive 
                        ? "text-primary font-black border-b-2 border-primary pb-4 -mb-[18px]" 
                        : "text-text-dim hover:text-text-main pb-4 -mb-[18px]"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* MENSTRUAL VIEW CONTENT */}
            {effectiveCycleType === 'menstrual' && config?.cycleConfig?.menstruates !== false && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Quick Editor Accordion */}
                <div className="border-b border-border-line/40 pb-2">
                  <button 
                    onClick={() => setShowCalendarEditor(!showCalendarEditor)}
                    className="w-full flex items-center justify-between py-3 bg-transparent border-0 outline-none cursor-pointer hover:bg-base-dim/5 transition-colors"
                  >
                    <span className="text-xs font-mono tracking-widest uppercase font-bold text-text-main">Historial de Sangrado</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-dim lowercase tracking-wider">{showCalendarEditor ? 'cerrar' : 'editar'}</span>
                      {showCalendarEditor ? <X className="w-4 h-4 text-text-dim" /> : <Plus className="w-4 h-4 text-text-dim" />}
                    </div>
                  </button>
                  {showCalendarEditor && (
                    <div className="animate-in slide-in-from-top-2 pt-2">
                      <CycleCalendar config={config} onUpdateConfig={onUpdateConfig} projections={cycleProjections} />
                    </div>
                  )}
                </div>

                {/* 2. Predictive Banner */}
                {cycleProjections && (
                  <div className="py-4 border-b border-border-line flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="text-left flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim block">Estado del Ciclo Activo</span>
                      <span className="text-sm font-light text-text-main font-sans mt-0.5 block">
                        Hoy te encuentras en el <span className="text-primary font-mono font-bold">Día {cycleProjections.currentCycleDay || '?'}</span>
                      </span>
                    </div>
                    
                    <div className="text-left sm:text-right flex-1 border-l-0 sm:border-l border-t sm:border-t-0 border-border-line/40 pt-4 sm:pt-0 sm:pl-4">
                      {cycleProjections.daysSinceExpected !== null && (
                        <>
                          {cycleProjections.daysSinceExpected > 0 ? (
                            <>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#e07a5f] block">Retraso Estimado</span>
                              <span className="text-xs font-mono font-bold text-[#e07a5f] mt-0.5 block">
                                {cycleProjections.daysSinceExpected} día{cycleProjections.daysSinceExpected !== 1 ? 's' : ''} tarde
                              </span>
                            </>
                          ) : cycleProjections.daysSinceExpected < 0 ? (
                            <>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#81b29a] block">Próxima Menstruación</span>
                              <span className="text-xs font-mono font-bold text-[#81b29a] mt-0.5 block">
                                En {Math.abs(cycleProjections.daysSinceExpected)} día{Math.abs(cycleProjections.daysSinceExpected) !== 1 ? 's' : ''}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block">Periodo Esperado</span>
                              <span className="text-xs font-mono font-bold text-[#d4af37] mt-0.5 block">Hoy</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    
                    {cycleProjections.projectedPeriods.length > 0 && (
                      <div className="text-left sm:text-right flex-1 border-l-0 sm:border-l border-t sm:border-t-0 border-border-line/40 pt-4 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#73c2b8] block">Próx. Ovulación</span>
                        <span className="text-xs font-mono font-bold text-text-main mt-0.5 block">
                          {cycleProjections.projectedPeriods[0].ovulationDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Trend Dashboard (Stats + Line Chart) */}
                {cycleProjections && cycleProjections.pastCycles.length > 0 && (
                  <CycleTrendChart projections={cycleProjections} />
                )}

                {/* 4. Analysis Tables (No Horizontal Scroll) */}
                {cycleProjections && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {/* A. Future Projections */}
                    <div className="flex flex-col">
                      <div className="pb-2 mb-2 border-b border-border-line/40">
                        <h4 className="text-[10px] font-mono tracking-widest text-text-dim font-bold uppercase">Proyecciones Futuras</h4>
                      </div>
                      <div className="w-full">
                        <table className="w-full text-[10px] font-mono border-collapse text-left">
                          <thead>
                            <tr className="bg-transparent border-b border-border-line/40">
                              <th className="py-2 px-3 text-text-dim uppercase tracking-wider font-bold">Próx. Periodo</th>
                              <th className="py-2 px-3 text-text-dim uppercase tracking-wider font-bold">Ovulación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cycleProjections.projectedPeriods.slice(1).map((p, idx) => (
                              <tr key={idx} className="border-b border-border-line/20 last:border-0">
                                <td className="py-2.5 px-3 text-text-main whitespace-nowrap">
                                  {p.startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {p.endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="py-2.5 px-3 text-[#73c2b8] font-bold whitespace-nowrap flex items-center gap-1.5">
                                  <span>✨</span> {p.ovulationDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* B. History */}
                    <div className="flex flex-col max-h-[300px]">
                      <div className="pb-2 mb-2 border-b border-border-line/40 shrink-0">
                        <h4 className="text-[10px] font-mono tracking-widest text-text-dim font-bold uppercase">Ciclos Anteriores</h4>
                      </div>
                      <div className="w-full overflow-y-auto scrollbar-thin">
                        <table className="w-full text-[10px] font-mono border-collapse text-left">
                          <thead className="sticky top-0 bg-base border-b border-border-line z-10">
                            <tr>
                              <th className="py-2 px-3 text-text-dim uppercase tracking-wider font-bold">Fechas</th>
                              <th className="py-2 px-3 text-text-dim uppercase tracking-wider font-bold">Ciclo</th>
                              <th className="py-2 px-3 text-text-dim uppercase tracking-wider font-bold">Flujo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cycleProjections.pastCycles.map((c, idx) => {
                              const s = parseLocalDate(c.startDate);
                              const e = parseLocalDate(c.endDate);
                              return (
                                <tr key={idx} className="border-b border-border-line/20 last:border-0 hover:bg-base-dim/5 transition-colors">
                                  <td className="py-2.5 px-3 text-text-main whitespace-nowrap font-bold">
                                    {s.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}<span className="text-text-dim font-light mx-1">-</span>{e.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                  </td>
                                  <td className="py-2.5 px-3 text-text-main whitespace-nowrap">
                                    {c.cycleLength ? `${c.cycleLength}d` : '-'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-end h-4 gap-[2px]">
                                      {c.days.map((d, i) => {
                                        const h = d.intensity === 1 ? 'h-1.5' : d.intensity === 2 ? 'h-2.5' : 'h-4';
                                        const bg = d.intensity === 1 ? 'bg-[#e5b3b3] dark:bg-[#c27c7c]' : d.intensity === 2 ? 'bg-[#d88282] dark:bg-[#a64d4d]' : 'bg-[#b84a4a] dark:bg-[#7a2e2e]';
                                        return <div key={i} className={cn("w-1.5 rounded-sm", h, bg)} title={`Intensidad: ${d.intensity}`} />
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LUNAR VIEW CONTENT */}
            {cycleType === 'lunar' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="py-4 border-b border-border-line flex flex-col gap-2 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#81b29a] font-bold">Ritmología Lunar Sintonizada</span>
                  <h3 className="text-base font-light text-text-main font-sans">
                    Tu motor de enfoque dinámico está sincronizado con el ciclo sinódico de la Luna.
                  </h3>
                  <p className="text-xs text-text-dim leading-relaxed max-w-2xl mt-1">
                    Ideal para periodos de gestación, menopausia, o para quienes desean estructurar sus fluctuaciones energéticas siguiendo el arquetipo clásico lunar: Luna Nueva (Reflexión), Creciente (Planificación), Llena (Comunicación/Acción), Menguante (Purga/Creatividad).
                  </p>
                </div>
                
                <div className="border border-border-line p-6 rounded-none text-left">
                  <span className="text-3xl block mb-2">🌙</span>
                  <h4 className="text-xs font-mono tracking-widest text-text-main font-bold uppercase mb-2">Estado Predictivo Lunar Activo</h4>
                  <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
                    La aplicación utiliza de forma predictiva la fase sinódica lunar actual calculada matemáticamente en base a la fecha real del sistema. Las variaciones de tu barra de Energía Ejecutiva diaria y tus arquetipos cognitivos mutarán sintonizados con el cielo.
                  </p>
                </div>
              </div>
            )}

            {/* WEEKLY VIEW CONTENT */}
            {cycleType === 'weekly' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="py-4 border-b border-border-line flex flex-col gap-2 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] font-bold">Rotación Semanal Automática</span>
                  <h3 className="text-base font-light text-text-main font-sans">
                    Las fases cambian automáticamente cada lunes en un ciclo de 4 semanas.
                  </h3>
                  <p className="text-xs text-text-dim leading-relaxed max-w-2xl mt-1">
                    Ideal si prefieres un ritmo regular y predecible sin seguimiento biológico. Cada semana (lunes a domingo) corresponde a una fase del ciclo de energía: Reflexiva → Dinámica → Expresiva → Creativa, repitiéndose cada 4 semanas.
                  </p>
                </div>
                
                <div className="border border-border-line p-6 rounded-none text-left space-y-4">
                  <span className="text-3xl block mb-2">📅</span>
                  <h4 className="text-xs font-mono tracking-widest text-text-main font-bold uppercase mb-2">Fase Activa Esta Semana</h4>
                  <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
                    Tu fase actual es <span className="text-primary font-mono font-bold uppercase">{currentPhase}</span>. 
                    Cambiará automáticamente el próximo lunes.
                  </p>
                  <div className="flex flex-col border-t border-border-line/40 pt-4 divide-y divide-border-line/20">
                    {[
                      { phase: 'reflexiva', label: '🩸 Semana 1 — Reflexiva', desc: '5h de Energía — Descansar, autocuidar, planificar suavemente' },
                      { phase: 'dinamica', label: '⚡ Semana 2 — Dinámica', desc: '12h de Energía — Estructurar, ejecutar, construir' },
                      { phase: 'expresiva', label: '🌸 Semana 3 — Expresiva', desc: '10h de Energía — Comunicar, relacionarse, colaborar' },
                      { phase: 'creativa', label: '🌿 Semana 4 — Creativa', desc: '8h de Energía — Organizar, descartar, soltar' }
                    ].map(p => (
                      <div 
                        key={p.phase}
                        className={cn(
                          "py-3 px-2 text-xs font-mono uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-1",
                          currentPhase === p.phase 
                            ? "text-text-main font-bold bg-base-dim/15" 
                            : "text-text-dim"
                        )}
                      >
                        <span>{p.label} {currentPhase === p.phase && '◀ Actual'}</span>
                        <span className="text-[10px] lowercase tracking-normal font-light opacity-80">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MANUAL VIEW CONTENT */}
            {cycleType === 'none' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="py-4 border-b border-border-line flex flex-col gap-2 text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim">Modo Operativo Manual</span>
                  <h3 className="text-base font-light text-text-main font-sans">
                    Fijar o cambiar manualmente la fase activa sin algoritmos predictivos.
                  </h3>
                  <p className="text-xs text-text-dim leading-relaxed max-w-2xl mt-1">
                    Fije directamente su arquetipo biológico activo. Ideal para personalizar libremente el límite de su Barra de Energía Dinámica y calibrar sus plantillas de Foco día a día.
                  </p>
                </div>

                <div className="flex flex-col border border-border-line rounded-none divide-y divide-border-line">
                  {[
                    { key: 'dinamica', label: '⚡ Oro (Dinámica)', desc: 'Fase Folicular / Cuarto Creciente · 12h de Energía Máxima' },
                    { key: 'expresiva', label: '🌸 Coral (Expresiva)', desc: 'Fase Ovulatoria / Luna Llena · 10h de Energía Máxima' },
                    { key: 'creativa', label: '🍃 Turquesa (Creativa)', desc: 'Fase Lútea / Cuarto Menguante · 8h de Energía Máxima' },
                    { key: 'reflexiva', label: '🩸 Azul Lino (Reflexiva)', desc: 'Fase Menstrual / Luna Nueva · 5h de Energía Máxima' }
                  ].map(p => {
                    const isActive = config?.cycleConfig?.currentManualPhase === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => handleUpdateManualPhase(p.key as BiologicalPhase)}
                        className={cn(
                          "w-full text-left px-5 py-4 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0 outline-none flex flex-col sm:flex-row sm:items-center justify-between gap-1",
                          isActive 
                            ? "text-text-main font-bold bg-base-dim/15" 
                            : "text-text-dim hover:text-text-main hover:bg-base-dim/5"
                        )}
                      >
                        <span>{p.label}</span>
                        <span className="text-[10px] lowercase tracking-normal font-light opacity-80">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'syllabus' && (
          <div className="animate-in fade-in duration-200">
            <SyllabusView currentPhase={currentPhase} />
          </div>
        )}

        {activeTab === 'espejo' && config?.cycleConfig?.menstruates !== false && (
          <div className="animate-in fade-in duration-200">
            <LunarMirrorPanel config={config} onUpdateConfig={onUpdateConfig} onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>
  );
}

function LunarMirrorPanel({ config, onUpdateConfig, onNavigate }: { config: Config | null; onUpdateConfig: (c: Partial<Config>) => void; onNavigate: (view: any) => void }) {
  const isEnabled = !!config?.cycleConfig?.enableLunarMirror;
  
  if (!isEnabled) {
    return (
      <div className="border border-border-line p-8 text-left space-y-6">
        <div>
          <span className="text-4xl block mb-2">🌙</span>
          <h3 className="text-sm font-mono tracking-widest text-text-main font-bold uppercase mb-2">Espejo Lunar</h3>
          <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
            Conecta tu ciclo hormonal con el ciclo sinódico de la Luna. Al habilitar el Espejo Lunar, la aplicación correlacionará las fechas de inicio de tus ciclos con las fases de la luna para revelar tu arquetipo energético dominante y entregarte pautas de productividad adaptadas.
          </p>
        </div>

        <div className="border-t border-border-line/45 pt-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="text-left">
            <span className="text-xs font-bold text-text-main block">¿Qué revela el Espejo Lunar?</span>
            <span className="text-[10px] text-text-dim leading-relaxed font-sans mt-0.5 block">
              • **Luna Blanca**: Menstruación en Luna Nueva. Foco en la creación externa, nutrición y proyectos.
              <br />
              • **Luna Roja**: Menstruación en Luna Llena. Foco en la intuición, creatividad y desarrollo interno.
              <br />
              • **Luna Rosa/Violeta**: Menstruación en transiciones (Creciente/Menguante) para fases de reajuste.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateConfig({
              cycleConfig: {
                ...config?.cycleConfig,
                enableLunarMirror: true
              }
            })}
            className="px-6 py-2.5 bg-[var(--color-text-main)] text-[var(--color-base)] hover:opacity-90 font-mono text-xs uppercase tracking-widest font-bold transition-all rounded-none cursor-pointer border-0"
          >
            Habilitar Espejo Lunar ➔
          </button>
        </div>
      </div>
    );
  }

  const flowLogs = config?.cycleConfig?.flowLogs || {};
  const periods = getCyclePeriods(flowLogs);

  const periodLunarDetails = periods.map((p, idx) => {
    const lDetails = getLunarDetailsForDate(p.startDate);
    const arch = getLunarArchetype(lDetails.ratio);
    return {
      period: p,
      index: idx + 1,
      lunar: lDetails,
      archetype: arch
    };
  }).reverse();

  const activeCycle = periodLunarDetails[0];

  let whiteMoonCount = 0;
  let redMoonCount = 0;
  let pinkMoonCount = 0;
  let violetMoonCount = 0;
  const totalCycles = periodLunarDetails.length;

  periodLunarDetails.forEach(item => {
    if (item.archetype.archetype === 'Luna Blanca') whiteMoonCount++;
    else if (item.archetype.archetype === 'Luna Roja') redMoonCount++;
    else if (item.archetype.archetype.startsWith('Luna Rosa')) pinkMoonCount++;
    else violetMoonCount++;
  });

  const getPercentage = (count: number) => {
    if (totalCycles === 0) return 0;
    return Math.round((count / totalCycles) * 100);
  };

  let dominantArchetype = 'Ninguno';
  let dominantDesc = 'Registra tus periodos para evaluar tu alineación dominante.';
  let dominantColor = 'text-text-dim';
  
  if (totalCycles > 0) {
    const max = Math.max(whiteMoonCount, redMoonCount, pinkMoonCount, violetMoonCount);
    if (max === whiteMoonCount) {
      dominantArchetype = 'Luna Blanca 🌑';
      dominantDesc = 'Tus periodos tienden a iniciar con la Luna Nueva. Estás en sintonía con las fuerzas de manifestación externa, nutrición y renovación física. Tu energía está orientada a consolidar proyectos y cuidar de tu entorno.';
      dominantColor = 'text-[#81b29a]';
    } else if (max === redMoonCount) {
      dominantArchetype = 'Luna Roja 🌕';
      dominantDesc = 'Tus periodos tienden a iniciar con la Luna Llena. Estás en sintonía con el arquetipo de la Sabia o Hechicera. Tu energía menstrual se orienta a la introspección profunda, la creatividad salvaje, la enseñanza y el autoconocimiento.';
      dominantColor = 'text-[#e07a5f]';
    } else if (max === pinkMoonCount) {
      dominantArchetype = 'Luna Rosa 🌓';
      dominantDesc = 'Tus periodos tienden a iniciar con la Luna Creciente. Representa una alineación de transición y crecimiento activo. Estás en un periodo de expansión, sembrando nuevas intenciones y asumiendo responsabilidades dinámicas.';
      dominantColor = 'text-[#d4af37]';
    } else {
      dominantArchetype = 'Luna Violeta 🌗';
      dominantDesc = 'Tus periodos tienden a iniciar con la Luna Menguante. Representa una alineación de transición hacia adentro. Estás en una etapa idónea para la purga de proyectos obsoletos, limpieza física/emocional y descarte.';
      dominantColor = 'text-[#73c2b8]';
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {totalCycles > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeCycle && (
            <div className={cn("border rounded-none p-5 text-left flex flex-col justify-between space-y-4", activeCycle.archetype.borderColorClass, activeCycle.archetype.bgClass)}>
              <div className="border-b border-border-line/40 pb-3">
                <span className="text-[9px] font-mono uppercase tracking-widest text-text-dim block">Ciclo Activo Actual</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl text-text-main font-semibold font-sans">{activeCycle.archetype.archetype}</span>
                  <span className="text-lg">{activeCycle.lunar.emoji}</span>
                </div>
                <span className="text-[10px] text-text-dim font-mono block mt-1">
                  Inicio del ciclo: {new Date(activeCycle.period.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ({activeCycle.lunar.phaseName})
                </span>
              </div>
              <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
                {activeCycle.archetype.archetypeDesc}
              </p>
            </div>
          )}

          <div className="border border-border-line rounded-none p-5 text-left flex flex-col justify-between space-y-4">
            <div className="border-b border-border-line/60 pb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-text-dim block">Alineación Predominante</span>
              <span className={cn("text-xl font-semibold font-sans mt-1 block", dominantColor)}>
                {dominantArchetype}
              </span>
            </div>
            <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
              {dominantDesc}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border-line p-8 text-center bg-transparent">
          <span className="text-3xl block mb-2">🩸🌑</span>
          <span className="text-xs font-mono text-text-dim leading-relaxed block">
            Aún no has registrado ciclos menstruales en el historial. Ve a la pestaña de <span onClick={() => onNavigate('bitacora')} className="text-primary hover:underline font-bold cursor-pointer font-sans text-xs">Bitácora ➔ Archivo de Ciclos</span> para ingresar tus periodos anteriores y activar la comparativa lunar.
          </span>
        </div>
      )}

      {totalCycles > 0 && (
        <div className="border border-border-line p-6 text-left space-y-4">
          <h4 className="text-xs font-mono tracking-widest text-text-main font-bold uppercase border-b border-border-line/40 pb-2">Distribución de Alineación Lunar</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: '🌑 Luna Blanca (Nueva)', count: whiteMoonCount, percent: getPercentage(whiteMoonCount), color: 'bg-[#81b29a]' },
              { name: '🌕 Luna Roja (Llena)', count: redMoonCount, percent: getPercentage(redMoonCount), color: 'bg-[#e07a5f]' },
              { name: '🌓 Luna Rosa (Creciente)', count: pinkMoonCount, percent: getPercentage(pinkMoonCount), color: 'bg-[#d4af37]' },
              { name: '🌗 Luna Violeta (Menguante)', count: violetMoonCount, percent: getPercentage(violetMoonCount), color: 'bg-[#73c2b8]' }
            ].map(item => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-main">{item.name}</span>
                  <span className="text-text-dim font-bold">{item.count} ({item.percent}%)</span>
                </div>
                <div className="w-full h-2 bg-base-dim rounded-none overflow-hidden relative">
                  <div style={{ width: `${item.percent}%` }} className={cn("h-full transition-all duration-300", item.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCycles > 0 && (
        <div className="border border-border-line rounded-none overflow-hidden text-left">
          <div className="p-4 border-b border-border-line bg-base-dim/10">
            <h4 className="text-xs font-mono tracking-widest text-text-main font-bold uppercase">Historial del Espejo Lunar</h4>
          </div>
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-transparent border-b border-border-line">
                  <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold w-12 text-left">#</th>
                  <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-left">Fecha Inicio</th>
                  <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-left">Fase de la Luna</th>
                  <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-left">Alineación / Arquetipo</th>
                </tr>
              </thead>
              <tbody>
                {periodLunarDetails.map((item, idx) => {
                  return (
                    <tr key={idx} className="border-b border-border-line/30 last:border-0 hover:bg-base-dim/5 transition-colors">
                      <td className="py-3 px-4 text-text-dim">{item.index}</td>
                      <td className="py-3 px-4 text-text-main font-bold">
                        {parseLocalDate(item.period.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-text-main">
                        <span className="text-base mr-1.5">{item.lunar.emoji}</span>
                        <span>{item.lunar.phaseName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider font-bold", item.archetype.colorClass, item.archetype.bgClass, item.archetype.borderColorClass)}>
                          {item.archetype.archetype}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => {
            if (confirm("¿Desactivar la vista del Espejo Lunar? Siempre puedes volver a habilitarla.")) {
              onUpdateConfig({
                cycleConfig: {
                  ...config?.cycleConfig,
                  enableLunarMirror: false
                }
              });
            }
          }}
          className="text-[10px] font-mono uppercase tracking-wider text-text-dim hover:text-red-500 hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
        >
          ✕ Desactivar Espejo Lunar
        </button>
      </div>
    </div>
  );
}

function CycleTrendChart({ projections }: { projections: CycleProjections }) {
  const cycles = projections.pastCycles
    .filter(c => c.cycleLength !== null)
    .slice(0, 6)
    .reverse();

  if (cycles.length < 2) return null;

  const maxLen = Math.max(...cycles.map(c => c.cycleLength as number), 35);
  const minLen = Math.min(...cycles.map(c => c.cycleLength as number), 21);
  
  const pMin = minLen - 2;
  const pMax = maxLen + 2;
  const range = pMax - pMin;

  return (
    <div className="py-4 border-b border-border-line/40 flex flex-col md:flex-row items-center gap-6">
      <div className="flex gap-6 shrink-0 w-full md:w-auto md:border-r md:border-border-line/40 md:pr-6 justify-around md:justify-start">
        <div className="text-center md:text-left">
          <span className="text-[9px] font-mono uppercase tracking-widest text-text-dim block mb-1">Promedio Ciclo</span>
          <span className="text-2xl font-sans font-semibold text-text-main">{projections.meanCycleLength} <span className="text-xs font-mono font-light text-text-dim">días</span></span>
        </div>
        <div className="text-center md:text-left">
          <span className="text-[9px] font-mono uppercase tracking-widest text-text-dim block mb-1">Promedio Sangrado</span>
          <span className="text-2xl font-sans font-semibold text-[#d88282]">{projections.meanPeriodLength} <span className="text-xs font-mono font-light text-[#d88282]/70">días</span></span>
        </div>
      </div>
      
      <div className="flex-1 w-full relative h-20 pt-4">
        <span className="absolute -top-1 left-0 text-[8px] font-mono text-text-dim">Tendencia (días totales)</span>
        <svg className="w-full h-full overflow-visible">
          {cycles.map((c, i) => {
            if (i === 0) return null;
            const prev = cycles[i - 1];
            const x1 = cycles.length === 1 ? 50 : ((i - 1) / (cycles.length - 1)) * 100;
            const y1 = 100 - (((prev.cycleLength as number - pMin) / range) * 100);
            const x2 = cycles.length === 1 ? 50 : (i / (cycles.length - 1)) * 100;
            const y2 = 100 - (((c.cycleLength as number - pMin) / range) * 100);
            return (
              <line 
                key={`line-${i}`}
                x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}
                stroke="var(--color-text-dim)" strokeWidth="1.5" strokeOpacity="0.4"
              />
            );
          })}
          {cycles.map((c, i) => {
            const x = cycles.length === 1 ? 50 : (i / (cycles.length - 1)) * 100;
            const y = 100 - (((c.cycleLength as number - pMin) / range) * 100);
            return (
              <g key={`point-${i}`}>
                <circle cx={`${x}%`} cy={`${y}%`} r="3.5" fill="var(--color-base)" stroke="var(--color-text-dim)" strokeWidth="1.5" strokeOpacity="0.8" />
                <text x={`${x}%`} y={`${y}%`} dy="-12px" fontSize="10px" fill="var(--color-text-main)" textAnchor="middle" className="font-mono font-bold">{c.cycleLength}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CycleCalendar({ config, onUpdateConfig, projections }: { config: Config | null; onUpdateConfig: (c: Partial<Config>) => void; projections: CycleProjections | null }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const flowLogs = config?.cycleConfig?.flowLogs || {};

  const handleDayClick = (dateStr: string) => {
    const currentIntensity = flowLogs[dateStr] || 0;
    const nextIntensity = (currentIntensity + 1) % 4;
    const newLogs = { ...flowLogs };
    if (nextIntensity === 0) {
      delete newLogs[dateStr];
    } else {
      newLogs[dateStr] = nextIntensity;
    }
    onUpdateConfig({ cycleConfig: { ...config?.cycleConfig, flowLogs: newLogs } });
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6; 

  const daysInMonth = lastDay.getDate();
  const weeks = [];
  let currentWeek: (string | null)[] = [];

  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentWeek.push(dateStr);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 1: return 'bg-[#e5b3b3] text-white font-bold dark:bg-[#c27c7c]';
      case 2: return 'bg-[#d88282] text-white font-bold dark:bg-[#a64d4d]';
      case 3: return 'bg-[#b84a4a] text-white font-bold dark:bg-[#7a2e2e]';
      default: return 'hover:bg-base-dim/10 text-text-main';
    }
  };

  const isFertile = (dateStr: string) => {
    if (!projections) return false;
    const d = parseLocalDate(dateStr).getTime();
    return projections.projectedPeriods.some(p => d >= p.fertileWindowStart.getTime() && d <= p.fertileWindowEnd.getTime());
  };

  const isOvulation = (dateStr: string) => {
    if (!projections) return false;
    const d = parseLocalDate(dateStr).getTime();
    return projections.projectedPeriods.some(p => d === p.ovulationDate.getTime());
  };

  return (
    <div className="p-4 sm:p-6 text-left space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] text-text-dim leading-relaxed font-sans font-light">
            Toca los días para registrar sangrado (Vacío ➔ 💧 ➔ 🩸 ➔ 🔴)<br/>
            Los días con fondo <span className="text-[#73c2b8] font-bold">verde</span> indican ventana fértil.
          </p>
        </div>
        <div className="flex items-center bg-base-dim/5 p-1 rounded-sm gap-1 border border-border-line/40">
          <button onClick={prevMonth} className="p-1.5 text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0 hover:bg-base-dim/10 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          
          <select 
            value={month} 
            onChange={handleMonthChange}
            className="text-xs font-mono font-bold uppercase bg-transparent border-0 text-text-main py-1 outline-none cursor-pointer appearance-none text-center hover:bg-base-dim/10 rounded px-2 transition-colors"
          >
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, i) => (
              <option key={i} value={i} className="bg-base">{m}</option>
            ))}
          </select>
          
          <select 
            value={year} 
            onChange={handleYearChange}
            className="text-xs font-mono font-bold uppercase bg-transparent border-0 text-text-main py-1 outline-none cursor-pointer appearance-none text-center hover:bg-base-dim/10 rounded px-2 transition-colors"
          >
            {Array.from({ length: 11 }).map((_, i) => {
              const y = new Date().getFullYear() - 5 + i;
              return <option key={y} value={y} className="bg-base">{y}</option>;
            })}
          </select>

          <button onClick={nextMonth} className="p-1.5 text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0 hover:bg-base-dim/10 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      
      <div className="w-full">
        <div className="grid grid-cols-7 mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-center text-[10px] font-mono text-text-dim font-bold">{d}</div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {weeks.map((w, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {w.map((dateStr, j) => {
                if (!dateStr) return <div key={j} className="h-10" />;
                const day = parseInt(dateStr.split('-')[2], 10);
                const intensity = flowLogs[dateStr] || 0;
                
                const fertile = intensity === 0 && isFertile(dateStr);
                const ovulation = intensity === 0 && isOvulation(dateStr);

                return (
                  <button 
                    key={j}
                    onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-10 border border-border-line/30 flex flex-col items-center justify-center text-xs font-sans transition-colors cursor-pointer relative",
                      getIntensityColor(intensity),
                      fertile ? "bg-[#73c2b8]/10" : ""
                    )}
                  >
                    <span>{day}</span>
                    {ovulation && <span className="absolute bottom-0.5 text-[8px] leading-none">✨</span>}
                    {fertile && !ovulation && <span className="absolute bottom-0.5 text-[#73c2b8] text-[8px] leading-none">·</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
