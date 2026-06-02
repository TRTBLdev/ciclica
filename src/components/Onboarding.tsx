import React, { useState } from 'react';
import { Config, AppTask, CycleTrackingType, BiologicalPhase } from '../types';
import { Target, Shapes, Compass, BookOpen, Lock, Sparkles, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  config: Config | null;
  onUpdateConfig: (c: Partial<Config>) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onClose: () => void;
  onBackToLogin?: () => void;
}

export default function Onboarding({ config, onUpdateConfig, onAddTask, onClose, onBackToLogin }: Props) {
  const [step, setStep] = useState(1);
  
  // Step 1 States
  const [trackingType, setTrackingType] = useState<CycleTrackingType>('menstrual');
  const [lastCycleStartDate, setLastCycleStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [manualPhase, setManualPhase] = useState<BiologicalPhase>('expresiva');

  // Step 2 States
  const [dumpText, setDumpText] = useState('');
  const [dumpTasks, setDumpTasks] = useState<Array<{ text: string, category: string }>>([]);
  const [addingArea, setAddingArea] = useState<string>('HOME');

  // Step 3 States
  const [payMode, setPayMode] = useState<'select' | 'crypto'>('select');
  const [cryptoStatus, setCryptoStatus] = useState<'waiting' | 'success'>('waiting');

  const handleNextStep = () => {
    if (step === 1) {
      // Generate initial flow logs (periodLength days of moderate flow) to populate the cycle history
      const initialFlowLogs: Record<string, number> = {};
      if (trackingType === 'menstrual') {
        const parts = lastCycleStartDate.split('-');
        if (parts.length === 3) {
          const yr = Number(parts[0]);
          const mo = Number(parts[1]) - 1; // Months are 0-indexed in JS Dates
          const dy = Number(parts[2]);
          
          for (let i = 0; i < periodLength; i++) {
            const nextDay = new Date(yr, mo, dy + i);
            const y = nextDay.getFullYear();
            const m = String(nextDay.getMonth() + 1).padStart(2, '0');
            const d = String(nextDay.getDate()).padStart(2, '0');
            initialFlowLogs[`${y}-${m}-${d}`] = 2; // Default to moderate flow
          }
        }
      }

      // Save Step 1 Configuration
      onUpdateConfig({
        cycleConfig: {
          trackingType,
          lastCycleStartDate: trackingType === 'menstrual' ? new Date(lastCycleStartDate).toISOString() : undefined,
          cycleLengthDays: trackingType === 'menstrual' ? cycleLength : undefined,
          periodLengthDays: trackingType === 'menstrual' ? periodLength : undefined,
          currentManualPhase: trackingType === 'none' ? manualPhase : undefined,
          flowLogs: trackingType === 'menstrual' ? initialFlowLogs : undefined
        }
      });
      setStep(2); // Step 2 is now the Syllabus Premium page!
    } else if (step === 2) {
      // Step 2 is Syllabus, clicking next goes to Step 3 (Mental Dump Backlog)!
      setStep(3);
    }
  };

  const handleFinish = () => {
    // Save Step 3 Backlog Dump Tasks upon completion
    dumpTasks.forEach(task => {
      onAddTask({
        userId: 'placeholder',
        text: task.text,
        type: 'Tarea',
        category: task.category,
        completed: false,
        view: 'Backlog',
        createdAt: new Date().toISOString()
      });
    });
    localStorage.setItem('ciclica_onboarding_done', 'true');
    onClose();
  };

  const handleAddDumpTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dumpText.trim()) return;
    setDumpTasks([...dumpTasks, { text: dumpText.trim(), category: addingArea }]);
    setDumpText('');
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto transition-all duration-500",
      config?.theme === 'kyoto-dusk' ? "theme-kyoto-dusk bg-base text-text-main" : "bg-base text-text-main"
    )}>
      <div className="max-w-2xl w-full bg-base-dim/30 border border-border-line p-8 md:p-12 rounded-3xl flex flex-col gap-8 shadow-sm transition-all duration-500">
        
        {/* Navigation Indicator */}
        <div className="flex justify-between items-center w-full border-b border-border-line pb-4">
          <div className="flex items-center gap-2">
            {onBackToLogin && (
              <button
                onClick={onBackToLogin}
                className="p-1 hover:bg-[var(--color-border-line)]/60 rounded-full transition-colors cursor-pointer text-text-dim"
                title="Volver al Inicio"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-[10px] tracking-widest font-mono uppercase text-primary font-bold">Desembarco Cíclico</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all", 
                  step === s ? "bg-[var(--color-text-main)] scale-125" : "bg-[var(--color-border-line)]"
                )} 
              />
            ))}
          </div>
        </div>

        {/* STEP 1: DESEMBARCO BIOLÓGICO */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="text-left">
              <h2 className="text-2xl font-light tracking-tight text-text-main mb-2 leading-none flex items-center gap-2">
                <Target className="w-6 h-6 stroke-[2]" /> 1. Sincronización Fisiológica
              </h2>
              <p className="text-xs text-text-dim leading-relaxed">
                CÍCLICA no te exige un rendimiento lineal corporativo. Calibra tu energía en base a tu biología o sincronización lunar.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-left">
              <label className="text-[10px] uppercase tracking-wider font-mono text-primary font-bold">Selecciona tu brújula biológica:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTrackingType('menstrual')}
                  className={cn(
                    "p-4 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                    trackingType === 'menstrual' ? "border-[var(--color-text-main)] bg-base" : "border-border-line hover:bg-[var(--color-border-line)]/20"
                  )}
                >
                  <span className="text-xs font-bold text-text-main">Ciclo Menstrual</span>
                  <span className="text-[10px] text-text-dim">Ajuste por fases hormonales.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrackingType('lunar')}
                  className={cn(
                    "p-4 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                    trackingType === 'lunar' ? "border-[var(--color-text-main)] bg-base" : "border-border-line hover:bg-[var(--color-border-line)]/20"
                  )}
                >
                  <span className="text-xs font-bold text-text-main">Ciclo Lunar</span>
                  <span className="text-[10px] text-text-dim">Inclusivo (Espejo analógico).</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrackingType('none')}
                  className={cn(
                    "p-4 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                    trackingType === 'none' ? "border-[var(--color-text-main)] bg-base" : "border-border-line hover:bg-[var(--color-border-line)]/20"
                  )}
                >
                  <span className="text-xs font-bold text-text-main">Manual / Ninguno</span>
                  <span className="text-[10px] text-text-dim">Límite personalizable.</span>
                </button>
              </div>

              {/* Conditional Inputs */}
              {trackingType === 'menstrual' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-base/50 border border-border-line rounded-xl animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Último inicio periodo:</label>
                    <input 
                      type="date" 
                      value={lastCycleStartDate}
                      onChange={e => setLastCycleStartDate(e.target.value)}
                      className="text-[11px] bg-base border border-border-line text-text-main px-3 py-2 rounded-lg outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Duración ciclo (días):</label>
                    <input 
                      type="number" 
                      min={20}
                      max={45}
                      value={cycleLength}
                      onChange={e => setCycleLength(Number(e.target.value))}
                      className="text-xs bg-base border border-border-line text-text-main px-3 py-2 rounded-lg outline-none font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim pl-1">Sangrado estimado (días):</label>
                    <input 
                      type="number" 
                      min={2}
                      max={12}
                      value={periodLength}
                      onChange={e => setPeriodLength(Number(e.target.value))}
                      className="text-xs bg-base border border-border-line text-text-main px-3 py-2 rounded-lg outline-none font-bold"
                    />
                  </div>
                </div>
              )}

              {trackingType === 'none' && (
                <div className="flex flex-col gap-1 p-4 bg-base/50 border border-border-line rounded-xl animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[9px] uppercase tracking-wider font-mono text-text-dim">Elige tu fase energética de inicio:</label>
                  <select
                    value={manualPhase}
                    onChange={e => setManualPhase(e.target.value as BiologicalPhase)}
                    className="text-xs bg-base border border-border-line text-text-main px-3 py-2 rounded-lg outline-none font-bold cursor-pointer"
                  >
                    <option value="dinamica">Oro (Fase Dinámica - 12h)</option>
                    <option value="expresiva">Coral (Fase Expresiva - 10h)</option>
                    <option value="creativa">Turquesa (Fase Creativa - 8h)</option>
                    <option value="reflexiva">Azul Lino (Fase Reflexiva - 5h)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: EL SYLLABUS Y LITERATURA INTEGRADA */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="text-left">
              <h2 className="text-2xl font-light tracking-tight text-text-main mb-2 leading-none flex items-center gap-2">
                <Compass className="w-6 h-6 text-primary" /> 2. Literatura y Recursos Integrados
              </h2>
              <p className="text-xs text-text-dim leading-relaxed">
                CÍCLICA incluye guías de productividad orgánica, plantillas de copilotos de IA y literatura técnica de soberanía de forma 100% gratuita y desbloqueada. Todo este material está integrado nativamente y listo para leer en tu aplicación.
              </p>
            </div>

            <div className="text-left">
              <span className="text-[10px] tracking-widest font-mono uppercase text-primary font-bold">Índice de Literatura y Guías Incluidas:</span>
            </div>

            {/* Syllabus Table */}
            <div className="border border-border-line rounded-2xl overflow-hidden bg-base/50 divide-y divide-[var(--color-border-line)] text-left transition-colors duration-500">
              <div className="p-4 flex justify-between items-center bg-base-dim/10">
                <div>
                  <span className="text-xs font-bold text-text-main block">Módulo I: Sincronización Fisiológica & Lunar</span>
                  <span className="text-[10px] text-text-dim">Guía de gestión energética adaptada a tus ciclos biológicos.</span>
                </div>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              
              <div className="p-4 flex justify-between items-center bg-base-dim/10">
                <div>
                  <span className="text-xs font-bold text-text-main block">Módulo II: El Prompt-Book Interactivo</span>
                  <span className="text-[10px] text-text-dim">Plantillas y literatura para ChatGPT, Claude o Gemini según tu fase.</span>
                </div>
                <BookOpen className="w-4 h-4 text-accent" />
              </div>

              <div className="p-4 flex justify-between items-center bg-base-dim/10">
                <div>
                  <span className="text-xs font-bold text-text-main block">Módulo III: Soberanía de Datos y Sincronización Local</span>
                  <span className="text-[10px] text-text-dim">Configuración técnica para portar tus datos de forma 100% offline y privada.</span>
                </div>
                <Check className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Business Actions */}
            <div className="flex flex-col gap-3 mt-2">
              <a
                href="https://trtbl.substack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[var(--color-text-main)] text-[var(--color-base)] py-3.5 rounded-xl font-bold tracking-wider text-xs uppercase hover:opacity-90 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <Sparkles className="w-4 h-4 text-primary fill-[var(--color-primary)] animate-pulse" /> Apoyar en Substack
              </a>

              <button
                type="button"
                onClick={() => {
                  setStep(3);
                }}
                className="w-full border border-border-line text-text-dim py-3 rounded-xl font-medium hover:bg-[var(--color-border-line)]/40 transition-all text-xs cursor-pointer text-center"
              >
                Continuar Gratis (Modo Local Sencillo)
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ONBOARDING DEL REFUGIO (DESCARGA MENTAL) */}
        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="text-left">
              <h2 className="text-2xl font-light tracking-tight text-text-main mb-2 leading-none flex items-center gap-2">
                <Shapes className="w-6 h-6 stroke-[2]" /> 3. Descarga Mental del Refugio
              </h2>
              <p className="text-xs text-text-dim leading-relaxed">
                ¡Ahora que has calibrado tu brújula biológica! Despeja tu mente anotando aquí las tareas o pendientes que te abruman hoy. Las guardaremos en tu backlog para que puedas organizarlas después con calma.
              </p>
            </div>

            <form onSubmit={handleAddDumpTask} className="flex flex-col sm:flex-row gap-2">
              <select
                value={addingArea}
                onChange={e => setAddingArea(e.target.value)}
                className="px-3 py-2 text-xs bg-base border border-border-line text-text-main rounded-full outline-none cursor-pointer shrink-0"
              >
                <option value="HOME">🏠 HOME</option>
                <option value="BODY">🌿 BODY</option>
                <option value="MIND">🧠 MIND</option>
                <option value="FINANCE">💰 FINANCE</option>
              </select>

              <input 
                autoFocus
                type="text" 
                placeholder="Ej. Limpiar el horno, planificar compras..."
                className="flex-1 px-4 py-2 text-sm bg-base border border-border-line text-text-main rounded-full outline-none focus:border-[var(--color-primary)] transition-all"
                value={dumpText}
                onChange={e => setDumpText(e.target.value)}
              />
              <button 
                type="submit" 
                className="bg-[var(--color-text-main)] text-[var(--color-base)] px-5 py-2 rounded-full font-bold text-xs uppercase hover:opacity-90 transition-colors cursor-pointer shrink-0"
              >
                + Añadir
              </button>
            </form>

            {/* List of Dump Tasks */}
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto no-scrollbar border-t border-border-line pt-4 text-left">
              {dumpTasks.length === 0 ? (
                <span className="text-xs text-primary italic">Tu backlog mental está vacío y en paz.</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dumpTasks.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs px-3 py-1.5 bg-base border border-border-line text-text-main rounded-full flex items-center gap-2"
                    >
                      <span className="font-mono text-[9px] uppercase opacity-75 tracking-wider flex items-center gap-1 font-bold">
                        {t.category === 'HOME' && '🏠 HOME'}
                        {t.category === 'BODY' && '🌿 BODY'}
                        {t.category === 'MIND' && '🧠 MIND'}
                        {t.category === 'FINANCE' && '💰 FINANCE'}
                      </span>
                      <span className="w-[1px] h-3 bg-[var(--color-border-line)]" />
                      <span>{t.text}</span>
                      <button 
                        type="button" 
                        onClick={() => setDumpTasks(dumpTasks.filter((_, i) => i !== idx))}
                        className="text-primary hover:text-red-500 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP BUTTONS */}
        {step < 3 ? (
          <div className="flex justify-end w-full border-t border-border-line pt-6 mt-4">
            <button
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-[var(--color-text-main)] text-[var(--color-base)] rounded-xl text-xs uppercase tracking-wider font-bold hover:opacity-90 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end w-full border-t border-border-line pt-6 mt-4">
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 bg-[var(--color-text-main)] text-[var(--color-base)] rounded-xl text-xs uppercase tracking-wider font-bold hover:opacity-90 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Finalizar Desembarco <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
