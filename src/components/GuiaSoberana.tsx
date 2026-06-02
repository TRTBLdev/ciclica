import React, { useState } from 'react';
import { BookOpen, Download, Smartphone, Compass, HelpCircle, Activity, Target, Shield, Clock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function GuiaSoberana() {
  const [activeTab, setActiveTab] = useState<'instalacion' | 'casos'>('instalacion');

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-[#fbf9f4] w-full px-6 md:px-10 py-6 mx-auto">
      
      {/* Header Statement */}
      <div className="relative flex flex-col justify-between border-b border-[#e4e2dd] pb-6 mb-8">
        <h2 className="text-title flex items-center gap-3">
          <BookOpen className="w-6 h-6 stroke-[2]" /> Guía Soberana de CÍCLICA
        </h2>
        <p className="text-sm text-[#5d5d5d] max-w-2xl leading-relaxed mt-2">
          Manual de instalación offline y explicación práctica de funciones a través de casos de uso reales. Disponible de forma gratuita para todas las usuarias al momento de instalar.
        </p>

        {/* Tab Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setActiveTab('instalacion')}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider border rounded-xl transition-all cursor-pointer",
              activeTab === 'instalacion' 
                ? "bg-[#2d2d2d] text-white border-[#2d2d2d] font-bold" 
                : "border-[#e4e2dd] hover:bg-[#efede8]/40 text-[#5d5d5d]"
            )}
          >
            ⚙️ Instalación Soberana
          </button>
          <button
            onClick={() => setActiveTab('casos')}
            className={cn(
              "px-4 py-2 text-xs font-mono uppercase tracking-wider border rounded-xl transition-all cursor-pointer",
              activeTab === 'casos' 
                ? "bg-[#2d2d2d] text-white border-[#2d2d2d] font-bold" 
                : "border-[#e4e2dd] hover:bg-[#efede8]/40 text-[#5d5d5d]"
            )}
          >
            💡 Casos de Uso Prácticos
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto no-scrollbar max-w-4xl pb-10">
        
        {activeTab === 'instalacion' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* PWA Section */}
            <div className="glass-matte p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-start">
              <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-subtitle font-medium">Instalación en Celulares y Tablets (PWA)</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  CÍCLICA funciona como una **Progressive Web App (PWA)**. No necesitas descargarla de la Play Store o App Store ni entregar tus datos a corporaciones centralizadas.
                </p>
                <div className="text-xs text-[#5d5d5d] space-y-1.5 pt-2 font-mono">
                  <p>🔹 **iOS (iPhone/iPad)**: Abre tu dominio en Safari, pulsa el botón **"Compartir"** (cuadrado con flecha arriba) y selecciona **"Agregar a pantalla de inicio"**.</p>
                  <p>🔹 **Android (Samsung, Xiaomi, etc.)**: Abre tu dominio en Chrome, toca los tres puntos de configuración y selecciona **"Instalar aplicación"**.</p>
                  <p>🔹 **Resultado**: La app se añade a tu pantalla con su propio icono, se abre en pantalla completa sin barra de navegación y funciona **100% offline**.</p>
                </div>
              </div>
            </div>

            {/* USB Section */}
            <div className="glass-matte p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-start">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-subtitle font-medium">Ejecución Portable desde Memoria USB (PC/Mac)</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  Puedes llevar tu base de datos e interfaz de CÍCLICA en un pendrive USB y ejecutarla en cualquier ordenador sin conexión a internet y sin instalar nada.
                </p>
                <div className="text-xs text-[#5d5d5d] space-y-1.5 pt-2 font-mono">
                  <p>1️⃣ Copia el directorio `app/` (archivos estáticos compilados) en tu memoria USB.</p>
                  <p>2️⃣ Crea y ejecuta el archivo `iniciar.bat` provisto en la raíz del USB.</p>
                  <p>3️⃣ El script levanta un servidor estático local inmediato y abre la dApp en `http://localhost:3000` en menos de un segundo.</p>
                  <p>4️⃣ **Privacidad Máxima**: Tus datos se leen y escriben únicamente en el pendrive USB, sin tocar la nube central.</p>
                </div>
              </div>
            </div>

            {/* Syncthing Section */}
            <div className="glass-matte p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-start">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-subtitle font-medium">Sincronización P2P Segura con Syncthing</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  Para sincronizar tus datos de forma soberana entre tu computadora, celular o tablet sin pasar por servidores de Google o Apple, puedes usar herramientas como **Syncthing** o **SyncTrayor**.
                </p>
                <div className="text-xs text-[#5d5d5d] space-y-1.5 pt-2 font-mono">
                  <p>📂 **Paso 1**: En la configuración de CÍCLICA en tu laptop, selecciona una carpeta local (ej. `~/Documents/Ciclica`) para guardar tu base de datos encriptada `db.json`.</p>
                  <p>🔄 **Paso 2**: Instala la app gratuita Syncthing en tu PC y en tu celular Android.</p>
                  <p>🔗 **Paso 3**: Vincula ambos dispositivos en Syncthing y comparte la carpeta `Ciclica`.</p>
                  <p>⚡ **Resultado**: Cualquier tarea, pulso o flujo registrado se sincroniza automáticamente en segundos por red local de dispositivo a dispositivo, de forma encriptada y P2P.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'casos' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Caso 1: Ritmología Fisiológica */}
            <div className="glass-matte p-6 rounded-3xl flex gap-6 items-start text-left">
              <div className="p-3 bg-red-50 rounded-2xl text-red-500 shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-widest font-mono uppercase text-[#a2b29f]">CASO DE USO 1</span>
                <h3 className="text-subtitle font-medium leading-tight">Sincronización Menstrual & Lunar</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Escenario**: Te sientes agotada y sobrepasada por tu lista de tareas pendientes. 
                </p>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Solución Cíclica**: Al registrar tu periodo como *Moderado/Abundante* en el Logger de Flujo de la vista Foco, la barra de **Energía Ejecutiva** se adapta reduciéndose automáticamente a un límite máximo de **5 horas (Fase Reflexiva)**. Las tareas complejas se difieren al backlog y la app congela las mecánicas de hábitos recurrentes para permitirte descansar sin sentimientos de culpa lineal corporativa.
                </p>
              </div>
            </div>

            {/* Caso 2: Los Pulsos (Hábitos Cuantitativos) */}
            <div className="glass-matte p-6 rounded-3xl flex gap-6 items-start text-left">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-widest font-mono uppercase text-[#a2b29f]">CASO DE USO 2</span>
                <h3 className="text-subtitle font-medium leading-tight">Pulsos Flexibles (Métricas Diarias)</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Escenario**: Deseas registrar de forma cuantitativa acciones que repites varias veces al día (ej. tomar 8 vasos de agua, tomar 3 dosis de medicina, o registrar cigarrillos evitados), pero sin tener una hora fija.
                </p>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Implementación Cíclica**: Creas un **Pulso**. Es el elemento cuantitativo más ágil del sistema. 
                </p>
                <div className="text-xs text-[#5d5d5d] space-y-1 font-mono pl-2 border-l border-[#e4e2dd]">
                  <p>🟢 **Directo en Pilar**: Si es un hábito general (ej. 8 vasos de agua en el pilar `BODY`).</p>
                  <p>🎯 **Ligado a una Meta**: Si responde a un objetivo de salud (ej. 3 dosis de vitaminas en la Meta *"Recuperar energía biológica"*).</p>
                  <p>📁 **Dentro de un Proyecto**: Si es parte de un entregable operativo (ej. registrar 5 llamadas de prospección en el Proyecto *"Lanzamiento del estudio"*).</p>
                </div>
              </div>
            </div>

            {/* Caso 3: Los Hábitos Recurrentes */}
            <div className="glass-matte p-6 rounded-3xl flex gap-6 items-start text-left">
              <div className="p-3 bg-teal-50 rounded-2xl text-teal-500 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-widest font-mono uppercase text-[#a2b29f]">CASO DE USO 3</span>
                <h3 className="text-subtitle font-medium leading-tight">Hábitos Recurrentes & Ritmología</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Escenario**: Quieres crear hábitos consistentes con frecuencias personalizables (ej. hacer ejercicio 3 veces por semana, o auditar finanzas 1 vez al mes) y evitar que se acumulen o penalicen cuando tu cuerpo necesita descansar.
                </p>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Implementación Cíclica**: Creas un **Hábito**. Igual que los Pulsos, puede vivir directo en un Pilar, Meta o Proyecto. El sistema te permite marcar el check de completado hoy; si lo completas, recalcula automáticamente la siguiente fecha planificada en base a su frecuencia de días, semanas o meses. 
                </p>
                <p className="text-xs text-[#5d5d5d] font-mono pl-2 border-l border-[#e4e2dd]">
                  🧘 **Autocuidado Cíclico**: Cuando entras en tu fase menstrual (Reflexiva), CÍCLICA **congela automáticamente las penalizaciones y decaimientos** de tus hábitos. Puedes descansar tranquilamente, sabiendo que tus rachas y progresos se conservan intactos.
                </p>
              </div>
            </div>

            {/* Caso 4: Jerarquía Consciente */}
            <div className="glass-matte p-6 rounded-3xl flex gap-6 items-start text-left">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-widest font-mono uppercase text-[#a2b29f]">CASO DE USO 4</span>
                <h3 className="text-subtitle font-medium leading-tight">La Cascada de Planificación</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Escenario**: Tienes decenas de tareas y proyectos sueltos que te generan ruido visual y desorden mental.
                </p>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Solución Cíclica**: Estructuras tu vida en cascada jerárquica. Creas una **Meta** cualitativa vinculada al pilar `FINANCE` (ej: *"Construir colchón de paz financiera"*). A esta Meta le anidas un **Proyecto** (ej: *"Proyecto: Auditoría de suscripciones"*). Dentro del Proyecto creas **Tareas** y **Hábitos** específicos. Toda esta anidación se despliega de forma ordenada y colapsable con chevrons en tu vista de Áreas.
                </p>
              </div>
            </div>

            {/* Caso 4: Time Tracking */}
            <div className="glass-matte p-6 rounded-3xl flex gap-6 items-start text-left">
              <div className="p-3 bg-teal-50 rounded-2xl text-teal-500 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] tracking-widest font-mono uppercase text-[#a2b29f]">CASO DE USO 4</span>
                <h3 className="text-subtitle font-medium leading-tight">Time Tracking y Metas de Horas</h3>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Escenario**: Deseas destinar exactamente 15 horas de estudio a un proyecto este mes y evaluar tu enfoque de energía real en la PC.
                </p>
                <p className="text-sm text-[#5d5d5d] leading-relaxed">
                  **Solución Cíclica**: Habilitas la meta de tiempo de 15 horas en tu proyecto. Cada vez que trabajes, activas el **FloatingTimer** incorporado en el timeline de Foco. Al detenerlo, la app calcula y suma de forma recursiva todas las duraciones de los registros de tiempo de tu proyecto y sus tareas hijas, mostrándote una barra de progreso estético real (`6.5h / 15.0h`) y distribuyéndola en tus Reportes sin emitir notificaciones punitivas.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
