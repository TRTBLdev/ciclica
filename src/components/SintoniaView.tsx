import React, { useState } from 'react';
import { Compass, BookOpen } from 'lucide-react';
import { Config, CycleTrackingType, BiologicalPhase } from '../types';
import { cn, calculateBiologicalPhase } from '../lib/utils';
import SyllabusView from './SyllabusView';

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

interface Props {
  config: Config | null;
  onUpdateConfig: (c: Partial<Config>) => void;
  onNavigate: (view: any) => void;
}

export default function SintoniaView({ config, onUpdateConfig, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<'sincronizacion' | 'syllabus'>('sincronizacion');

  const cycleType = config?.cycleConfig?.trackingType || 'none';
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

        {/* Top Navigation Tabs Bar */}
        <div className="flex gap-6 mt-6 font-mono text-xs uppercase tracking-widest font-bold border-t border-border-line/10 pt-4">
          {[
            { id: 'sincronizacion', label: 'Sincronización', icon: <Compass className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
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
                { key: 'menstrual', label: '🩸 Menstrual' },
                { key: 'lunar', label: '🌙 Lunar / Sinódico' },
                { key: 'none', label: '🔄 Manual / Fijo' }
              ].map(t => {
                const isActive = cycleType === t.key;
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
            {cycleType === 'menstrual' && (
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
      </div>
    </div>
  );
}
