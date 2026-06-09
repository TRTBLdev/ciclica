import React, { useState } from 'react';
import { Compass, BookOpen } from 'lucide-react';
import { Config, CycleTrackingType, BiologicalPhase } from '../types';
import { calculateBiologicalPhase, getCyclePeriods, parseLocalDate } from '../domain/cycle';
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

  const getActiveCycleStats = () => {
    const flowLogs = config?.cycleConfig?.flowLogs || {};
    const flowEntries = Object.entries(flowLogs)
      .filter(([_, intensity]) => intensity > 0)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
    if (flowEntries.length === 0) return null;
    
    // Group consecutive flow days into periods (gap >= 10 days = new cycle)
    interface PeriodGroup {
      startDate: string;
      endDate: string;
    }
    const periods: PeriodGroup[] = [];
    let currentGroup: PeriodGroup | null = null;
    
    flowEntries.forEach(([dateStr]) => {
      if (!currentGroup) {
        currentGroup = { startDate: dateStr, endDate: dateStr };
      } else {
        const lastDay = parseLocalDate(currentGroup.endDate);
        const thisDay = parseLocalDate(dateStr);
        const diffDays = Math.floor((thisDay.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 10) {
          periods.push(currentGroup);
          currentGroup = { startDate: dateStr, endDate: dateStr };
        } else {
          currentGroup.endDate = dateStr;
        }
      }
    });
    if (currentGroup) periods.push(currentGroup);

    const stats = {
      meanCycleLength: config?.cycleConfig?.cycleLengthDays || 28,
    };

    const lastPeriodStart = periods.length > 0 ? parseLocalDate(periods[periods.length - 1].startDate) : null;
    
    if (lastPeriodStart) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      const currentCycleDay = daysSinceLastPeriod + 1;
      
      return {
        currentCycleDay,
        daysSinceExpected: daysSinceLastPeriod - Math.round(stats.meanCycleLength),
      };
    }

    return null;
  };

  const cycleStats = getActiveCycleStats();

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
        <h1 className="text-title mb-2 leading-none flex items-center gap-3">
          <Compass className="w-6 h-6 text-text-main" /> Sintonía Biológica
        </h1>
        <p className="text-sm text-text-dim max-w-2xl leading-relaxed">
          Sincronice su agenda y su nivel de energía ejecutiva en base a sus ciclos biológicos y ritmos naturales.
        </p>
        <div className="flex gap-6 mt-6 font-mono text-xs uppercase tracking-widest font-bold border-t border-border-line/10 pt-4">
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
                  "flex items-center gap-1.5 hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors pb-1",
                  isActive 
                    ? "text-primary font-black border-b-2 border-primary" 
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
                {/* Active Cycle Status Banner */}
                {cycleStats ? (
                  <div className="py-4 border-b border-border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-left">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim block">Estado del Ciclo Activo</span>
                      <span className="text-sm font-light text-text-main font-sans mt-0.5 block">
                        Hoy te encuentras en el <span className="text-primary font-mono font-bold">Día {cycleStats.currentCycleDay}</span>
                      </span>
                    </div>
                    {cycleStats.daysSinceExpected !== null && (
                      <div className="text-left sm:text-right">
                        {cycleStats.daysSinceExpected > 0 ? (
                          <>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#e07a5f] block">Retraso Estimado</span>
                            <span className="text-xs font-mono font-bold text-[#e07a5f] mt-0.5 block">
                              {cycleStats.daysSinceExpected} día{cycleStats.daysSinceExpected !== 1 ? 's' : ''} tarde
                            </span>
                          </>
                        ) : cycleStats.daysSinceExpected < 0 ? (
                          <>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#81b29a] block">Próxima Menstruación</span>
                            <span className="text-xs font-mono font-bold text-[#81b29a] mt-0.5 block">
                              En {Math.abs(cycleStats.daysSinceExpected)} día{Math.abs(cycleStats.daysSinceExpected) !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] block">Periodo Esperado</span>
                            <span className="text-xs font-mono font-bold text-[#d4af37] mt-0.5 block">Hoy</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 border-b border-border-line/30">
                    <span className="text-xs font-mono text-text-dim leading-relaxed block">
                      Aún no has registrado ciclos pasados. Visita la pestaña de <span onClick={() => onNavigate('bitacora')} className="text-primary hover:underline font-bold cursor-pointer font-sans text-xs">Bitácora ➔ Archivo de Ciclos</span> para inicializar las predicciones y calibrar automáticamente tus duraciones.
                    </span>
                  </div>
                )}

                <div className="border border-border-line p-6 rounded-none text-left space-y-6">
                  <div>
                    <span className="text-3xl block mb-2">🩸</span>
                    <h4 className="text-xs font-mono tracking-widest text-text-main font-bold uppercase mb-2">Seguimiento Menstrual Predictivo</h4>
                    <p className="text-xs text-text-dim leading-relaxed font-sans font-light">
                      Su Barra de Energía Dinámica y los arquetipos cognitivos de Foco mutarán diariamente en sintonía con su ritmo hormonal. Puede consultar y descargar el historial completo de sus ciclos y periodos pasados dentro de la vista de <span onClick={() => onNavigate('bitacora')} className="text-primary hover:underline cursor-pointer font-bold">Bitácora</span>.
                    </p>
                  </div>

                  {/* Form to update menstrual configuration directly in Sintonía */}
                  <div className="border-t border-border-line/40 pt-6 space-y-4">
                    <h5 className="text-[10px] font-mono tracking-widest text-text-main font-bold uppercase">Calibración de Parámetros</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Último inicio periodo:</label>
                        <input 
                          type="date" 
                          value={config?.cycleConfig?.lastCycleStartDate ? new Date(config.cycleConfig.lastCycleStartDate).toISOString().slice(0, 10) : ''}
                          onChange={e => {
                            if (!e.target.value) return;
                            onUpdateConfig({
                              cycleConfig: {
                                ...config?.cycleConfig,
                                lastCycleStartDate: new Date(e.target.value).toISOString()
                              }
                            });
                          }}
                          className="text-[11px] bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] text-text-main py-1.5 outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Duración ciclo (días):</label>
                        <input 
                          type="number" 
                          min={20}
                          max={45}
                          value={config?.cycleConfig?.cycleLengthDays || 28}
                          onChange={e => {
                            const val = Number(e.target.value);
                            if (val >= 20 && val <= 45) {
                              onUpdateConfig({
                                cycleConfig: {
                                  ...config?.cycleConfig,
                                  cycleLengthDays: val
                                }
                              });
                            }
                          }}
                          className="text-xs bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] text-text-main py-1.5 outline-none font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Sangrado estimado (días):</label>
                        <input 
                          type="number" 
                          min={2}
                          max={12}
                          value={config?.cycleConfig?.periodLengthDays || 5}
                          onChange={e => {
                            const val = Number(e.target.value);
                            if (val >= 2 && val <= 12) {
                              onUpdateConfig({
                                cycleConfig: {
                                  ...config?.cycleConfig,
                                  periodLengthDays: val
                                }
                              });
                            }
                          }}
                          className="text-xs bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] text-text-main py-1.5 outline-none font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
                        {new Date(item.period.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
