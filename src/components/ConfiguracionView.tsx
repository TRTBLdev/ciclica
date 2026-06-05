import React, { useState } from 'react';
import { Settings, Download, Upload, LogOut, Trash2, Check } from 'lucide-react';
import { Config } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './ToastProvider';

interface Props {
  config: Config | null;
  onUpdateConfig: (c: Partial<Config>) => void;
  tasks: any[];
  history: any[];
  onSignOut: () => void;
  importLocalData: (tasks: any[], history: any[], config: any) => void;
  onNavigate?: (view: any) => void;
}

export default function ConfiguracionView({ config, onUpdateConfig, tasks, history, onSignOut, importLocalData }: Props) {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExportVault = () => {
    const data = { tasks, history, config };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ciclica_vault_${new Date().toISOString().slice(0, 10)}.json`;
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
        if (imported.tasks || imported.history || imported.config) {
          importLocalData(imported.tasks || [], imported.history || [], imported.config || {});
          setImportStatus('success');
          showToast("¡Cíclica Vault importado con éxito!", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
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
  };

  const handleFactoryReset = () => {
    if (window.confirm("⚠️ ¿Estás segura de que deseas BORRAR TODOS TUS DATOS de CÍCLICA en este navegador y restablecer de fábrica? \n\nEsta acción es irreversible y eliminará tus tareas, proyectos, hábitos, configuraciones e historial local de forma permanente. (Te recomendamos 'Exportar' tu bóveda en JSON primero).")) {
      localStorage.clear();
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
          </div>
        </div>

        {/* SECTION 2: DATOS LOCALES Y BÓVEDA */}
        <div className="border-b border-border-line/30 pb-10">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            💾 CÍCLICA VAULT (PERSISTENCIA LOCAL-FIRST)
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Sus datos pertenecen únicamente a usted. Cíclica opera 100% de forma local en su navegador. Exporte copias de seguridad de su base de datos o impórtelas de vuelta en formato JSON portátil en cualquier dispositivo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExportVault}
              className="flex-1 p-4 border border-border-line hover:border-[var(--color-text-main)] text-left flex items-center gap-4 cursor-pointer hover:bg-base-dim/10 transition-all bg-transparent"
            >
              <Download className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-xs font-mono font-bold uppercase text-text-main">Exportar Bóveda</div>
                <div className="text-[10px] text-text-dim font-sans font-light mt-0.5">Descarga un archivo JSON portable con todas tus tareas, hábitos e historial.</div>
              </div>
            </button>

            <label className="flex-1 p-4 border border-border-line hover:border-[var(--color-text-main)] text-left flex items-center gap-4 cursor-pointer hover:bg-base-dim/10 transition-all bg-transparent">
              <Upload className="w-5 h-5 text-accent shrink-0 font-normal" />
              <div>
                <div className="text-xs font-mono font-bold uppercase text-text-main">Importar Bóveda</div>
                <div className="text-[10px] text-text-dim font-sans font-light mt-0.5">Carga una copia de seguridad JSON previa. Reemplazará tus datos actuales.</div>
              </div>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportVault}
              />
            </label>
          </div>
        </div>

        {/* SECTION 3: SESIÓN Y BORRADO DE DATOS */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-4 font-bold flex items-center gap-2">
            🛡️ SEGURIDAD Y DEPURACIÓN
          </h3>
          <p className="text-xs text-text-dim leading-relaxed mb-6 font-sans">
            Administre su sesión en este dispositivo o elimine todo rastro de su huella de datos de forma destructiva y permanente.
          </p>

          <div className="flex flex-col gap-3 max-w-sm">
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-between border border-border-line hover:border-[var(--color-text-main)] px-4 py-3 transition-all text-xs font-mono uppercase tracking-wider text-text-main cursor-pointer bg-transparent"
            >
              <span>Cerrar Sesión</span>
              <LogOut className="w-4 h-4 text-text-dim" />
            </button>

            <button
              onClick={handleFactoryReset}
              className="w-full flex items-center justify-between border border-red-500/20 hover:border-red-500 px-4 py-3 transition-all text-xs font-mono uppercase tracking-wider text-red-500 hover:bg-red-500/10 cursor-pointer bg-transparent"
            >
              <span>Restablecer de Fábrica</span>
              <Trash2 className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
