import React, { useState } from 'react';
import { Settings, Download, Upload, LogOut, Trash2, Check } from 'lucide-react';
import { Config } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './ToastProvider';
import SeparatorForm from './SeparatorForm';

interface Props {
  config: Config | null;
  onUpdateConfig: (c: Partial<Config>) => void;
  tasks: any[];
  history: any[];
  progressSnapshots: any[];
  intentions?: any[];
  onSignOut: () => void;
  importLocalData: (tasks: any[], history: any[], config: any, intentions?: any[], progressSnapshots?: any[]) => void;
  mergeLocalData: (tasks: any[], history: any[], config: any, intentions?: any[], progressSnapshots?: any[]) => void;
  clearPartialData: (type: 'ciclos' | 'habitos' | 'tareas' | 'intenciones') => void;
  onNavigate?: (view: any) => void;
}

export default function ConfiguracionView({ config, onUpdateConfig, tasks, history, progressSnapshots, intentions, onSignOut, importLocalData, mergeLocalData, clearPartialData }: Props) {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [editingSepIdx, setEditingSepIdx] = useState<number | null>(null);

  const handleExportData = (type: 'all' | 'ciclos' | 'habitos' | 'tareas' | 'intenciones') => {
    let dataToExport: any = {};
    let filename = `ciclica_vault_${new Date().toISOString().slice(0, 10)}.json`;

    if (type === 'all') {
      dataToExport = { tasks, history, progressSnapshots, config, intentions };
    } else if (type === 'ciclos') {
      dataToExport = { config: { cycleConfig: config?.cycleConfig } };
      filename = `ciclica_ciclos_${new Date().toISOString().slice(0, 10)}.json`;
    } else if (type === 'habitos') {
      const habitTasks = tasks.filter(t => t.type === 'Hábito' || t.type === 'Rutina');
      const habitIds = habitTasks.map(t => t.id);
      const habitHistory = history.filter(h => habitIds.includes(h.taskId));
      dataToExport = { tasks: habitTasks, history: habitHistory, progressSnapshots: progressSnapshots.filter(snapshot => habitIds.includes(snapshot.taskId)) };
      filename = `ciclica_habitos_${new Date().toISOString().slice(0, 10)}.json`;
    } else if (type === 'tareas') {
      const projTasks = tasks.filter(t => t.type === 'Tarea' || t.type === 'Proyecto' || t.type === 'Pulso');
      const projIds = projTasks.map(t => t.id);
      const projHistory = history.filter(h => projIds.includes(h.taskId));
      dataToExport = { tasks: projTasks, history: projHistory, config: { areas: config?.areas } };
      filename = `ciclica_tareas_${new Date().toISOString().slice(0, 10)}.json`;
    } else if (type === 'intenciones') {
      dataToExport = { intentions };
      filename = `ciclica_intenciones_${new Date().toISOString().slice(0, 10)}.json`;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { showToast } = useToast();

  const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.tasks || imported.history || imported.config || imported.intentions || imported.progressSnapshots) {
          if (window.confirm("⚠️ Importar Bóveda Completa reemplazará TODOS tus datos actuales. Si deseas combinar datos, usa las opciones parciales. ¿Continuar?")) {
            importLocalData(imported.tasks || [], imported.history || [], imported.config || {}, imported.intentions || [], imported.progressSnapshots || []);
            setImportStatus('success');
            showToast("¡Cíclica Vault importado con éxito!", "success");
            setTimeout(() => window.location.reload(), 1500);
          }
        } else {
          setImportStatus('error');
          showToast("El archivo no tiene el formato correcto de Cíclica.", "error");
        }
      } catch (err) {
        setImportStatus('error');
        showToast("Error al leer el archivo JSON.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportPartial = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.tasks || imported.history || imported.config || imported.intentions || imported.progressSnapshots) {
          mergeLocalData(imported.tasks || [], imported.history || [], imported.config || null, imported.intentions || [], imported.progressSnapshots || []);
          setImportStatus('success');
          showToast("Datos parciales combinados con éxito!", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus('error');
          showToast("El archivo no tiene el formato correcto.", "error");
        }
      } catch (err) {
        setImportStatus('error');
        showToast("Error al leer el archivo JSON.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFactoryReset = () => {
    if (window.confirm("⚠️ ¿Estás segura de que deseas BORRAR TODOS TUS DATOS de CÍCLICA en este navegador y restablecer de fábrica? \n\nEsta acción es irreversible y eliminará tus tareas, proyectos, hábitos, configuraciones e historial local de forma permanente. (Te recomendamos 'Exportar' tu bóveda en JSON primero).")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handlePartialClear = (type: 'ciclos' | 'habitos' | 'tareas' | 'intenciones', name: string) => {
    if (window.confirm(`⚠️ ¿Estás segura de que deseas BORRAR los datos de ${name}? \n\nEsta acción eliminará de forma irreversible esa información, pero el resto de tus datos quedará intacto.`)) {
      clearPartialData(type);
      window.location.reload();
    }
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base text-left">
      {/* Header Statement */}
      <div className="p-6 md:p-10 relative">
         <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
         <h1 className="text-title mb-2 leading-none flex items-center gap-3">
            <Settings className="w-6 h-6 text-text-main" /> Ajustes del Sistema
         </h1>
         <p className="text-sm text-text-dim max-w-2xl leading-relaxed">
            Ajuste la apariencia visual de la aplicación y administre la persistencia local-first de su bóveda de datos.
         </p>
      </div>

      <div className="flex-1 p-6 md:p-10 flex flex-col gap-10 max-w-3xl w-full mx-auto pb-24">
        
        {/* SECTION 1: TEMA Y APARIENCIA */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            🎨 TEMA Y APARIENCIA VISUAL
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Alterne entre temas visuales curados. El sistema aplica acentos adaptativos según su fase biológica activa para armonizar su flujo de trabajo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onUpdateConfig({ theme: 'muji' })}
              className={cn(
                "p-4 border text-left flex flex-col gap-1 transition-all cursor-pointer bg-[#fbf9f4]",
                config?.theme === 'muji' 
                  ? "border-[#2d2d2d] scale-[1.01] shadow-sm text-black" 
                  : "border-border-line hover:border-[var(--color-text-main)] text-slate-500"
              )}
            >
              <span className="text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-between">
                🌸 MUJI NEUTRO
                {config?.theme === 'muji' && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className="text-[10px] opacity-80 leading-relaxed font-sans font-light text-slate-600">
                Inspirado en la simplicidad orgánica japonesa. Fondo beige lino y tipografías grises suaves sin cortisol visual.
              </span>
            </button>

            <button
              onClick={() => onUpdateConfig({ theme: 'kyoto-dusk' })}
              className={cn(
                "p-4 border text-left flex flex-col gap-1 transition-all cursor-pointer bg-[#181512] text-[#f3eae1]",
                config?.theme === 'kyoto-dusk' 
                  ? "border-[#d4af37] scale-[1.01] shadow-sm" 
                  : "border-border-line hover:border-[var(--color-text-main)] text-slate-500"
              )}
            >
              <span className="text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-between">
                🌙 KYOTO DUSK (PREMIUM)
                {config?.theme === 'kyoto-dusk' && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className="text-[10px] opacity-80 leading-relaxed font-sans font-light text-[#f3eae1]/75">
                Modo oscuro profundo y elegante de alto contraste estético. Enfoque relajante e inmersivo para la noche y fases creativas.
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 1.5: SINTONIZACIÓN Y CICLOS BIOLÓGICOS */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            🧬 SINTONIZACIÓN Y CICLOS BIOLÓGICOS
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Calibre la forma en que la aplicación calcula sus niveles de energía ejecutiva diaria y qué herramientas cíclicas están habilitadas.
          </p>

          <div className="flex flex-col gap-6 bg-base-dim/10 border border-border-line p-5 rounded-none text-left">
            {/* Control Menstruación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left max-w-md">
                <span className="text-xs font-bold text-text-main font-sans block">Registro de Ciclo Menstrual</span>
                <span className="text-[10px] text-text-dim leading-relaxed font-sans font-light mt-0.5 block">
                  Si menstrúa, active esta opción para calibrar su energía según su ciclo hormonal. Si la desactiva, se ocultará el registro de sangrado, las alertas de periodo y el archivo de ciclos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentVal = config?.cycleConfig?.menstruates !== false;
                  onUpdateConfig({
                    cycleConfig: {
                      ...config?.cycleConfig,
                      menstruates: !currentVal,
                      trackingType: !currentVal ? 'lunar' : (config?.cycleConfig?.trackingType === 'menstrual' ? 'menstrual' : (config?.cycleConfig?.trackingType || 'menstrual')),
                      enableLunarMirror: !currentVal ? false : (config?.cycleConfig?.enableLunarMirror || false)
                    }
                  });
                }}
                className={cn(
                  "px-4 py-2 text-xs font-mono font-bold uppercase transition-all rounded-none cursor-pointer border bg-transparent",
                  config?.cycleConfig?.menstruates !== false
                    ? "border-[var(--color-text-main)] text-text-main bg-base-dim/15"
                    : "border-border-line text-text-dim hover:text-text-main hover:bg-base-dim/5"
                )}
              >
                {config?.cycleConfig?.menstruates !== false ? 'Activo (Sí)' : 'Inactivo (No)'}
              </button>
            </div>

            {/* Control Espejo Lunar (solo si menstrua) */}
            {config?.cycleConfig?.menstruates !== false && (
              <div className="border-t border-border-line/40 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
                <div className="text-left max-w-md">
                  <span className="text-xs font-bold text-text-main font-sans block">Espejo Lunar</span>
                  <span className="text-[10px] text-text-dim leading-relaxed font-sans font-light mt-0.5 block">
                    Activa la pestaña de análisis cruzado en Sintonía para evaluar la relación de tu ciclo hormonal con las fases de la luna.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = !!config?.cycleConfig?.enableLunarMirror;
                    onUpdateConfig({
                      cycleConfig: {
                        ...config?.cycleConfig,
                        enableLunarMirror: !currentVal
                      }
                    });
                  }}
                  className={cn(
                    "px-4 py-2 text-xs font-mono font-bold uppercase transition-all rounded-none cursor-pointer border bg-transparent",
                    config?.cycleConfig?.enableLunarMirror
                      ? "border-[var(--color-text-main)] text-text-main bg-base-dim/15"
                      : "border-border-line text-text-dim hover:text-text-main hover:bg-base-dim/5"
                  )}
                >
                  {config?.cycleConfig?.enableLunarMirror ? 'Habilitado' : 'Deshabilitado'}
                </button>
              </div>
            )}

            {/* Calibración de Parámetros (solo si menstrua) */}
            {config?.cycleConfig?.menstruates !== false && (
              <div className="border-t border-border-line/40 pt-6 space-y-4 animate-in fade-in duration-200">
                <div className="text-left max-w-md">
                  <span className="text-xs font-bold text-text-main font-sans block">Calibración de Parámetros</span>
                  <span className="text-[10px] text-text-dim leading-relaxed font-sans font-light mt-0.5 block">
                    Define la duración promedio de tu ciclo y sangrado para las predicciones futuras si no has introducido suficientes datos en tu historial.
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="text-xs bg-base-dim/10 border border-border-line focus:border-[var(--color-text-main)] text-text-main px-3 py-2 outline-none font-mono font-bold rounded-none"
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
                      className="text-xs bg-base-dim/10 border border-border-line focus:border-[var(--color-text-main)] text-text-main px-3 py-2 outline-none font-mono font-bold rounded-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1.6: PLANIFICACIÓN Y CUARTOS OPERATIVOS */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            📅 CUARTOS OPERATIVOS Y ESCALAS
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Calibre la escala de Cuarto (Trimestre). Seleccione el comportamiento de calendario estándar o defina fechas personalizadas que se alineen con sus ciclos estratégicos o personales.
          </p>

          <div className="flex flex-col gap-6 bg-base-dim/10 border border-border-line p-5 rounded-none text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-left max-w-md">
                <span className="text-xs font-bold text-text-main font-sans block">Definición de Cuartos</span>
                <span className="text-[10px] text-text-dim leading-relaxed font-sans font-light mt-0.5 block">
                  Calendario Estándar: Ene-Mar (Q1), Abr-Jun (Q2), Jul-Sep (Q3), Oct-Dic (Q4).
                  Personalizado: define libremente el inicio y fin de cada cuarto.
                </span>
              </div>
              <select
                value={config?.quarterConfig?.type || 'calendar'}
                onChange={(e) => {
                  const val = e.target.value as 'calendar' | 'personal';
                  onUpdateConfig({
                    quarterConfig: {
                      type: val,
                      q1: config?.quarterConfig?.q1 || { start: '03-01', end: '05-31' },
                      q2: config?.quarterConfig?.q2 || { start: '06-01', end: '08-31' },
                      q3: config?.quarterConfig?.q3 || { start: '09-01', end: '11-30' },
                      q4: config?.quarterConfig?.q4 || { start: '12-01', end: '02-28' }
                    }
                  });
                }}
                className="bg-base border border-border-line text-xs font-mono px-3 py-1.5 rounded focus:outline-none cursor-pointer uppercase text-text-main"
              >
                <option value="calendar">Calendario Estándar</option>
                <option value="personal">Cuartos Personalizados</option>
              </select>
            </div>

            {config?.quarterConfig?.type === 'personal' && (
              <div className="border-t border-border-line/40 pt-6 flex flex-col gap-4 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-text-main font-sans block">Rangos de Cuartos Personalizados</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['q1', 'q2', 'q3', 'q4'] as const).map((qKey) => {
                    const qData = config?.quarterConfig?.[qKey] || { start: '01-01', end: '12-31' };
                    const label = qKey.toUpperCase();
                    return (
                      <div key={qKey} className="flex flex-col gap-2 p-3 bg-base border border-border-line/40">
                        <span className="text-[10px] font-mono font-bold text-primary">{label}</span>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-text-dim uppercase font-mono">Inicio</span>
                            <MonthDaySelect
                              value={qData.start}
                              onChange={(val) => {
                                onUpdateConfig({
                                  quarterConfig: {
                                    ...config.quarterConfig!,
                                    [qKey]: { ...qData, start: val }
                                  }
                                });
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-text-dim uppercase font-mono">Fin</span>
                            <MonthDaySelect
                              value={qData.end}
                              onChange={(val) => {
                                onUpdateConfig({
                                  quarterConfig: {
                                    ...config.quarterConfig!,
                                    [qKey]: { ...qData, end: val }
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 1.75: BLOQUES DE TIEMPO (SEPARADORES DE LÍNEA DE TIEMPO) */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            ⏰ BLOQUES DE TIEMPO (LÍNEA DE TIEMPO)
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Configure bloques horarios fijos (ej. Mañana, Almuerzo, Tarde) para estructurar visualmente su jornada en la Línea de Tiempo.
          </p>

          <div className="flex flex-col gap-4 bg-base-dim/10 border border-border-line p-5 rounded-none text-left">
            {/* List of existing separators */}
            {(!config?.separators || config.separators.length === 0) ? (
              <p className="text-xs text-text-dim italic">No hay bloques de tiempo configurados.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
                {config.separators.map((sep, idx) => (
                  <div key={idx} className="flex flex-col py-1.5 border-b border-border-line/40 last:border-0 text-xs">
                    {editingSepIdx === idx ? (
                      <SeparatorForm
                        initialValue={sep}
                        onSave={updated => {
                          const newSeps = [...config.separators!];
                          newSeps[idx] = updated;
                          newSeps.sort((a, b) => a.hora.localeCompare(b.hora));
                          onUpdateConfig({ separators: newSeps });
                          setEditingSepIdx(null);
                        }}
                        onCancel={() => setEditingSepIdx(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary">{sep.hora}</span>
                          <span className="text-text-main font-bold flex items-center gap-2">
                            {sep.color && <span className={cn("w-2 h-2 rounded-full", `bg-${sep.color}-500`)} />}
                            {sep.text}
                          </span>
                          {sep.detalle && <span className="text-text-dim text-[11px]">({sep.detalle})</span>}
                          <span className="text-text-dim text-[10px] font-mono">
                            {sep.weekdays?.length ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].filter((_, dayIndex) => sep.weekdays!.includes(dayIndex + 1)).join(' · ') : 'Todos los días'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setEditingSepIdx(idx)} className="p-1 hover:text-primary text-text-dim transition-colors cursor-pointer bg-transparent border-0 outline-none text-xs">Editar</button>
                          <button
                            type="button"
                            onClick={() => {
                              const newSeps = config.separators!.filter((_, i) => i !== idx);
                              onUpdateConfig({ separators: newSeps });
                            }}
                            className="p-1 hover:text-red-500 text-text-dim transition-colors cursor-pointer bg-transparent border-0 outline-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Form to add a new separator */}
            <div className="border-t border-border-line/40 pt-4 mt-2">
              <span className="text-xs font-bold text-text-main font-sans block mb-2">Añadir Nuevo Bloque</span>
              <div key={(config?.separators || []).length}>
              <SeparatorForm
                onSave={separator => {
                  const newSeps = [...(config?.separators || []), separator].sort((a, b) => a.hora.localeCompare(b.hora));
                  onUpdateConfig({ separators: newSeps });
                }}
              />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DATOS LOCALES Y BÓVEDA */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            💾 CÍCLICA VAULT Y DATOS LOCALES
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Cíclica opera de forma local en su navegador. Exporte o importe todos sus datos (Bóveda Completa) o descargue módulos específicos para fusionarlos.
          </p>

          <div className="flex flex-col gap-4">
            <div className="text-xs font-bold text-text-main font-sans mt-2">Bóveda Completa (Todos los datos)</div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <button
                onClick={() => handleExportData('all')}
                className="flex-1 p-4 border border-border-line hover:border-[var(--color-text-main)] text-left flex items-center gap-4 cursor-pointer hover:bg-base-dim/10 transition-all bg-transparent"
              >
                <Download className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs font-mono font-bold uppercase text-text-main">Exportar Todo</div>
                  <div className="text-[10px] text-text-dim font-sans font-light mt-0.5">Descarga copia total (JSON).</div>
                </div>
              </button>

              <label className="flex-1 p-4 border border-border-line hover:border-[var(--color-text-main)] text-left flex items-center gap-4 cursor-pointer hover:bg-base-dim/10 transition-all bg-transparent">
                <Upload className="w-5 h-5 text-accent shrink-0 font-normal" />
                <div>
                  <div className="text-xs font-mono font-bold uppercase text-text-main">Importar y Sobrescribir Todo</div>
                  <div className="text-[10px] text-text-dim font-sans font-light mt-0.5">Reemplaza tus datos actuales.</div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportVault}
                />
              </label>
            </div>

            <div className="text-xs font-bold text-text-main font-sans mt-2">Datos Parciales (Combinar / Merge)</div>
            <p className="text-[10px] text-text-dim font-sans mb-2">Descarga o sube módulos individuales. Al importar, los datos se combinarán con los existentes.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Ciclos */}
              <div className="border border-border-line p-3 flex flex-col justify-between">
                <div className="text-xs font-mono font-bold mb-3">CICLOS</div>
                <div className="flex gap-2">
                  <button onClick={() => handleExportData('ciclos')} className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10">Exportar</button>
                  <label className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10 text-center cursor-pointer">
                    Importar
                    <input type="file" accept=".json" className="hidden" onChange={handleImportPartial} />
                  </label>
                </div>
              </div>

              {/* Hábitos */}
              <div className="border border-border-line p-3 flex flex-col justify-between">
                <div className="text-xs font-mono font-bold mb-3">HÁBITOS</div>
                <div className="flex gap-2">
                  <button onClick={() => handleExportData('habitos')} className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10">Exportar</button>
                  <label className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10 text-center cursor-pointer">
                    Importar
                    <input type="file" accept=".json" className="hidden" onChange={handleImportPartial} />
                  </label>
                </div>
              </div>

              {/* Tareas */}
              <div className="border border-border-line p-3 flex flex-col justify-between">
                <div className="text-xs font-mono font-bold mb-3">TAREAS Y PROY.</div>
                <div className="flex gap-2">
                  <button onClick={() => handleExportData('tareas')} className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10">Exportar</button>
                  <label className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10 text-center cursor-pointer">
                    Importar
                    <input type="file" accept=".json" className="hidden" onChange={handleImportPartial} />
                  </label>
                </div>
              </div>

              {/* Intenciones */}
              <div className="border border-border-line p-3 flex flex-col justify-between">
                <div className="text-xs font-mono font-bold mb-3">INTENCIONES</div>
                <div className="flex gap-2">
                  <button onClick={() => handleExportData('intenciones')} className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10">Exportar</button>
                  <label className="flex-1 py-1.5 border border-border-line text-[10px] uppercase font-mono hover:bg-base-dim/10 text-center cursor-pointer">
                    Importar
                    <input type="file" accept=".json" className="hidden" onChange={handleImportPartial} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: SESIÓN Y BORRADO DE DATOS */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            🛡️ SEGURIDAD Y DEPURACIÓN
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Administre su sesión o elimine rastros de su huella de datos de forma destructiva y permanente.
          </p>

          <div className="flex flex-col gap-3 max-w-sm mb-8">
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-between border border-border-line hover:border-[var(--color-text-main)] px-4 py-3 transition-all text-xs font-mono uppercase tracking-wider text-text-main cursor-pointer bg-transparent"
            >
              <span>Cerrar Sesión</span>
              <LogOut className="w-4 h-4 text-text-dim" />
            </button>
          </div>

          <div className="border-t border-red-500/20 pt-6">
            <h4 className="text-xs font-bold text-red-500 font-sans mb-4">Zona de Peligro: Borrado de Datos</h4>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
               <button
                  onClick={() => handlePartialClear('ciclos', 'Ciclos y Registros Hormonales')}
                  className="p-3 text-left border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase text-red-500 font-bold mb-1">Borrar Ciclos</div>
                  <div className="text-[9px] text-text-dim leading-tight">Elimina registros menstruales.</div>
                </button>
                <button
                  onClick={() => handlePartialClear('habitos', 'Hábitos y Rutinas')}
                  className="p-3 text-left border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase text-red-500 font-bold mb-1">Borrar Hábitos</div>
                  <div className="text-[9px] text-text-dim leading-tight">Elimina hábitos y su historial.</div>
                </button>
                <button
                  onClick={() => handlePartialClear('tareas', 'Tareas, Áreas y Proyectos')}
                  className="p-3 text-left border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase text-red-500 font-bold mb-1">Borrar Tareas</div>
                  <div className="text-[9px] text-text-dim leading-tight">Elimina tareas, proyectos y áreas.</div>
                </button>
                <button
                  onClick={() => handlePartialClear('intenciones', 'Intenciones')}
                  className="p-3 text-left border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase text-red-500 font-bold mb-1">Borrar Intenciones</div>
                  <div className="text-[9px] text-text-dim leading-tight">Elimina tus propósitos y compromisos.</div>
                </button>
            </div>

            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-between border border-red-500 hover:border-red-600 px-4 py-3 transition-all text-xs font-mono uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 cursor-pointer"
            >
              <span>Restablecer Todo de Fábrica</span>
              <Trash2 className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function MonthDaySelect({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  disabled?: boolean 
}) {
  const safeValue = value || '01-01';
  const [mStr, dStr] = safeValue.split('-');
  const month = parseInt(mStr, 10) || 1;
  const day = parseInt(dStr, 10) || 1;

  const months = [
    { v: 1, l: 'Ene' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Abr' },
    { v: 5, l: 'May' }, { v: 6, l: 'Jun' }, { v: 7, l: 'Jul' }, { v: 8, l: 'Ago' },
    { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dic' }
  ];

  return (
    <div className="flex gap-1 items-center font-mono mt-1">
      <select
        value={month}
        disabled={disabled}
        onChange={(e) => {
          const newM = parseInt(e.target.value, 10);
          const newMStr = newM.toString().padStart(2, '0');
          const newDStr = day.toString().padStart(2, '0');
          onChange(`${newMStr}-${newDStr}`);
        }}
        className="bg-base border border-border-line text-xs px-2 py-1 rounded focus:outline-none cursor-pointer uppercase text-text-main"
      >
        {months.map(m => (
          <option key={m.v} value={m.v}>{m.l}</option>
        ))}
      </select>
      <select
        value={day}
        disabled={disabled}
        onChange={(e) => {
          const newD = parseInt(e.target.value, 10);
          const newMStr = month.toString().padStart(2, '0');
          const newDStr = newD.toString().padStart(2, '0');
          onChange(`${newMStr}-${newDStr}`);
        }}
        className="bg-base border border-border-line text-xs px-2 py-1 rounded focus:outline-none cursor-pointer text-text-main"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d.toString().padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}
