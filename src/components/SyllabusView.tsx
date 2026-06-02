import React, { useState } from 'react';
import { BookOpen, Copy, Check, Sparkles, Target, Compass, Flame, Info, Smartphone, Download, RefreshCw, Layers, ChevronDown } from 'lucide-react';
import { BiologicalPhase } from '../types';
import { cn } from '../lib/utils';

interface Props {
  currentPhase: BiologicalPhase;
}

export default function SyllabusView({ currentPhase }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'guia' | 'prompts' | 'literatura'>('guia');
  
  // Prompt Book states
  const [activePromptTab, setActivePromptTab] = useState<BiologicalPhase | 'jerarquia'>(currentPhase || 'dinamica');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sovereign Guide states
  const [activeGuideTab, setActiveGuideTab] = useState<'instalacion' | 'casos'>('instalacion');

  const prompts = [
    {
      phase: 'dinamica',
      title: 'Fase Dinámica (Pico de Lógica y Planificación)',
      concept: 'Momento óptimo para el análisis objetivo, la estructuración lógica y el desglose de proyectos masivos o finanzas complejas.',
      icon: <Target className="w-4 h-4 text-[#d4af37]" />,
      promptText: `Actúa como un experto en ingeniería de sistemas y gestión de proyectos. Tengo el siguiente objetivo general: [Escribe aquí tu meta o proyecto]. Considerando que hoy me encuentro en mi Fase Dinámica (con alta capacidad analítica, memoria y enfoque estructurado), desglosa este proyecto en una lista lógica de micro-tareas secuenciales y dependencias que pueda ejecutar de inmediato sin dispersarme.`
    },
    {
      phase: 'expresiva',
      title: 'Fase Expresiva (Pico de Conexión y Comunicación)',
      concept: 'Excelente para el intercambio social, la empatía, el networking y la preparación de conversaciones o negociaciones interpersonales.',
      icon: <Compass className="w-4 h-4 text-[#e07a5f]" />,
      promptText: `Tengo que preparar la siguiente conversación/reunión estratégica: [Describe brevemente con quién y el propósito]. Actúa como un experto en psicología conductual y comunicación empática. Considerando que me encuentro en mi Fase Expresiva (alto volumen de empatía y habilidades verbales), estructúrame una guía de conversación con puntos clave de interés común y un tono asertivo que me permita conectar y cooperar eficazmente.`
    },
    {
      phase: 'creativa',
      title: 'Fase Creativa (Pico de Purga y Resolución de Conflictos)',
      concept: 'Perfecto para la resolución original de problemas, identificación de ineficiencias domésticas/laborales y limpieza/organización profunda.',
      icon: <Sparkles className="w-4 h-4 text-[#73c2b8]" />,
      promptText: `Tengo el siguiente problema u organización pendiente en mi espacio físico o laboral: [Describir brevemente el desorden o problema]. Actúa como un experto en diseño de espacios y productividad minimalista. Dame un desglose paso a paso de micro-acciones que me tome menos de 10 minutos cada una para limpiar, purgar y reorganizar esta área de manera eficiente, reduciendo al máximo mi parálisis por desorden.`
    },
    {
      phase: 'reflexiva',
      title: 'Fase Reflexiva (Pico de Evaluación General y Hibernación)',
      concept: 'Momento idóneo para la recapitulación imparcial de metas y la introspección silenciosa, alejándose de los detalles de ejecución.',
      icon: <Flame className="w-4 h-4 text-[#81b29a]" />,
      promptText: `Actúa como mi mentor personal y coach de vida compasivo. Quiero evaluar mi último mes de forma objetiva pero sin juzgarme. Te proporcionaré una lista breve de lo que logré y de lo que quedó en el tintero: [Escribe tus notas rápidas]. Hazme 3 preguntas reflexivas profundas que me ayuden a discernir si estos objetivos siguen alineados con mis valores esenciales o si es momento de soltarlos para descansar en paz.`
    },
    {
      phase: 'jerarquia',
      title: 'Jerarquía Operativa (Soberanía de Pilares ➔ Metas ➔ Proyectos)',
      concept: 'Diseñado para estructurar y clarificar su mapa mental general de forma orgánica y libre de parálisis por dispersión.',
      icon: <Layers className="w-4 h-4 text-primary" />,
      promptText: `Actúa como un experto en sistemas de organización personal soberana. Ayúdame a desglosar mi visión general siguiendo esta jerarquía modular exacta:
1. Pilar de Vida (BODY, MIND, FINANCE, HOME)
2. Meta Cualitativa (bajo su Pilar respectivo)
3. Resultado Clave (Opcional, bajo la Meta)
4. Proyecto Finito (puede colgar directamente de la Meta o del Pilar, sin obligarte a crear un Resultado Clave intermedio si esto añade fricción innecesaria)
5. Tarea Atómica / Hábito Recurrente / Pulso Diario (acciones del día a día)

Mis notas generales e ideas desordenadas son estas: [Escribe aquí tu visión general, sueños o metas].

Procesa esta información y estrucúrala en un desglose recursivo limpio y legible de acuerdo con la jerarquía indicada. Evita capas intermedias redundantes; mantén el flujo lo más directo y Zen posible.`
    }
  ];

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activePrompt = prompts.find(p => p.phase === activePromptTab);

  return (
    <div className="animate-in fade-in flex flex-col w-full px-6 md:px-10 py-10 pb-16 max-w-4xl mx-auto text-left bg-transparent">
      
      {/* HEADER SECTION */}
      <div className="relative flex flex-col justify-between border-b border-border-line pb-6 mb-8">
        <h2 className="text-title flex items-center gap-3">
          <BookOpen className="w-6 h-6 stroke-[2] text-text-main" /> El Syllabus de Productividad Orgánica
        </h2>
        <p className="text-sm text-text-dim max-w-2xl leading-relaxed mt-2">
          Su manual offline de formación integral, biblioteca de copilotos cognitivos y guías técnicas para la soberanía digital de sus datos.
        </p>

        {/* Unified Sub-Tabs - Flat text-triggers Muji Style */}
        <div className="flex flex-wrap gap-6 mt-6 font-mono text-xs uppercase tracking-wider font-bold">
          {[
            { id: 'guia', label: '📖 Guía Soberana' },
            { id: 'prompts', label: '🤖 Prompt-Book' },
            { id: 'literatura', label: '✨ Lecciones Premium' }
          ].map(tb => (
            <button
              key={tb.id}
              onClick={() => setActiveSubTab(tb.id as any)}
              className={cn(
                "hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors",
                activeSubTab === tb.id 
                  ? "text-primary font-black" 
                  : "text-text-dim hover:text-text-main"
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TABS CONTENT */}
      <div className="w-full">
        
        {/* SUB-TAB 1: GUÍA SOBERANA */}
        {activeSubTab === 'guia' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Guide Header Sub-tab */}
            <div className="flex gap-4 border-b border-border-line/50 pb-px mb-6 overflow-x-auto no-scrollbar font-mono text-xs uppercase tracking-wider font-bold">
              <button
                onClick={() => setActiveGuideTab('instalacion')}
                className={cn(
                  "py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent outline-none",
                  activeGuideTab === 'instalacion' 
                    ? "border-[var(--color-text-main)] text-text-main font-black" 
                    : "border-transparent text-text-dim hover:text-text-main"
                )}
              >
                ⚙️ Instalación Offline
              </button>
              <button
                onClick={() => setActiveGuideTab('casos')}
                className={cn(
                  "py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap bg-transparent outline-none",
                  activeGuideTab === 'casos' 
                    ? "border-[var(--color-text-main)] text-text-main font-black" 
                    : "border-transparent text-text-dim hover:text-text-main"
                )}
              >
                💡 Casos Prácticos
              </button>
            </div>

            {activeGuideTab === 'instalacion' && (
              <div className="space-y-6">
                {/* PWA Section */}
                <div className="border-b border-border-line/30 pb-6 flex gap-4 items-start">
                  <Smartphone className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="text-subtitle font-medium">Instalación Móvil e Independencia de App Stores (PWA)</h3>
                    <p className="text-sm text-text-dim leading-relaxed">
                      CÍCLICA opera como una **Progressive Web App (PWA)**. Esto significa que no necesitas descargarla desde tiendas centralizadas (como Google Play o App Store), protegiendo tus datos de algoritmos corporativos.
                    </p>
                    <div className="text-xs text-text-dim space-y-2 pt-2 font-mono leading-relaxed bg-base-dim/10 p-4 border border-border-line">
                      <p>✨ **¿Cómo funciona?**: Al abrir tu dominio en el navegador de tu celular, el navegador lee la configuración segura offline y te ofrece instalar la app.</p>
                      <p>📱 **iOS (iPhone/iPad)**: En Safari, pulsa **"Compartir"** (cuadrado con flecha arriba) y elige **"Agregar a pantalla de inicio"**.</p>
                      <p>🤖 **Android**: En Chrome/Edge, toca los 3 puntos y selecciona **"Instalar aplicación"**.</p>
                      <p>🚀 **Resultado**: Se crea un icono en tu celular y la app se ejecuta en pantalla completa a velocidad nativa y de forma **100% offline**.</p>
                    </div>
                  </div>
                </div>

                {/* USB Section */}
                <div className="border-b border-border-line/30 pb-6 flex gap-4 items-start">
                  <Download className="w-5 h-5 text-accent shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="text-subtitle font-medium">Portabilidad Total en Pendrive USB (PC/Mac/Linux)</h3>
                    <p className="text-sm text-text-dim leading-relaxed">
                      Lleva CÍCLICA en tu bolsillo. Al compilar la aplicación, se generan archivos puramente estáticos (`index.html`, `CSS` y `JS`) libres de bases de datos externas.
                    </p>
                    <div className="text-xs text-text-dim space-y-2 pt-2 font-mono leading-relaxed bg-base-dim/10 p-4 border border-border-line">
                      <p>1️⃣ Copia la carpeta de producción en tu memoria USB.</p>
                      <p>2️⃣ Haz doble clic en `index.html` para ejecutarla localmente, o utiliza un micro-servidor local portable (`iniciar.bat`).</p>
                      <p>3️⃣ **Soberanía de Datos**: Todos los registros e historiales se almacenan cifrados en tu navegador local, pudiendo exportarlos e importarlos en formato JSON directamente en el pendrive.</p>
                    </div>
                  </div>
                </div>

                {/* Syncthing Section */}
                <div className="pb-6 flex gap-4 items-start">
                  <RefreshCw className="w-5 h-5 text-primary shrink-0 mt-1" />
                  <div className="space-y-2">
                    <h3 className="text-subtitle font-medium">Sincronización P2P Privada mediante Syncthing o SyncTrayzor</h3>
                    <p className="text-sm text-text-dim leading-relaxed">
                      Sincroniza tus datos de forma soberana entre tu computadora y celular sin entregar tu información a servidores en la nube de Google o Apple.
                    </p>
                    <div className="text-xs text-text-dim space-y-2 pt-2 font-mono leading-relaxed bg-base-dim/10 p-4 border border-border-line">
                      <p>🔄 **Syncthing / SyncTrayzor**: Son herramientas libres y gratuitas de sincronización peer-to-peer encriptada.</p>
                      <p>📂 **Paso 1**: Exporta tu base de datos JSON en una carpeta dedicada de tu PC (ej: `~/Documents/Ciclica`).</p>
                      <p>🔗 **Paso 2**: Instala Syncthing (en Android) o SyncTrayzor (en Windows) en tus dispositivos y vincúlalos de forma privada.</p>
                      <p>⚡ **Resultado**: Tu historial se sincroniza de forma segura por red local directa de dispositivo a dispositivo sin intermediarios corporativos.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'casos' && (
              <div className="space-y-6">
                {[
                  {
                    num: '1',
                    title: 'Predicción de Energía y Fisiología',
                    bg: 'border-red-500/20 text-red-500',
                    desc: 'Al registrar tu periodo como Moderado o Abundante en Foco, CÍCLICA calibra dinámicamente tu Barra de Energía Ejecutiva reduciéndola a un máximo compasivo de 5 horas (Fase Reflexiva) y congela las rachas de hábitos para evitar la frustración lineal.'
                  },
                  {
                    num: '2',
                    title: 'Pulsos Diarios (Métricas de Hábitos Flexibles)',
                    bg: 'border-emerald-500/20 text-emerald-500',
                    desc: 'Perfectos para acciones cuantitativas recurrentes (ej: tomar 8 vasos de agua, meditar, registrar dosis de suplementos). Pueden crearse directamente bajo un Pilar de Vida (ej: BODY), ligarse a una Meta Cualitativa o anidarse dentro de un Proyecto específico.'
                  },
                  {
                    num: '3',
                    title: 'Autocuidado Cíclico en Hábitos Recurrentes',
                    bg: 'border-teal-500/20 text-teal-500',
                    desc: 'Crea hábitos con frecuencias inteligentes (cada X días, semanas o meses). Cuando estés en tu fase menstrual, la app suspende de forma automática las penalizaciones por inactividad, preservando tus rachas intactas hasta que tu energía se recupere.'
                  },
                  {
                    num: '4',
                    title: 'La Cascada de Planificación Operativa',
                    bg: 'border-amber-500/20 text-amber-500',
                    desc: 'Organiza tu mente de forma jerárquica: Pilar de Vida ➔ Meta Cualitativa ➔ Proyecto Finito ➔ Tarea / Hábito / Pulso. Toda esta estructura jerárquica se colapsa y gestiona de forma interactiva en la pestaña de Áreas para evitar dispersión.'
                  }
                ].map(cs => (
                  <div key={cs.num} className="border-b border-border-line/30 pb-6 flex gap-6 items-start">
                    <div className={cn("px-2.5 py-0.5 font-mono font-bold text-[9px] uppercase tracking-wider border shrink-0", cs.bg)}>
                      Caso {cs.num}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-text-main">{cs.title}</h4>
                      <p className="text-xs text-text-dim leading-relaxed">{cs.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 2: PROMPT-BOOK */}
        {activeSubTab === 'prompts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="mb-6">
              <h3 className="text-subtitle font-medium mb-1">Biblioteca de Copiloto Cognitivo</h3>
              <p className="text-xs text-text-dim">
                Utiliza tu modelo de lenguaje favorito (ChatGPT, Claude, Gemini) mediante plantillas calibradas específicamente para tu fase o jerarquía activa.
              </p>
            </div>

            {/* Two-Column Responsive Layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start mt-4">
              {/* Sidebar Selector */}
              <div className="flex flex-col w-full md:w-60 border-r border-border-line/10 pr-0 md:pr-4 gap-1 flex-shrink-0">
                {[
                  { ph: 'dinamica', name: '⚡ Oro (Dinámica)' },
                  { ph: 'expresiva', name: '🌸 Coral (Expresiva)' },
                  { ph: 'creativa', name: '🍃 Turquesa (Creativa)' },
                  { ph: 'reflexiva', name: '🩸 Azul Lino (Reflexiva)' },
                  { ph: 'jerarquia', name: '📁 Soberanía (Jerarquías)' }
                ].map(tb => {
                  const isActive = tb.ph === activePromptTab;
                  return (
                    <button
                      key={tb.ph}
                      onClick={() => setActivePromptTab(tb.ph as any)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer bg-transparent border border-transparent outline-none flex items-center justify-between",
                        isActive 
                          ? "bg-base-dim/40 border-border-line text-text-main" 
                          : "text-text-dim hover:text-text-main hover:bg-base-dim/20"
                      )}
                    >
                      <span>{tb.name}</span>
                      {tb.ph === currentPhase && <span className="text-[10px]" title="Fase actual">📍</span>}
                    </button>
                  );
                })}
              </div>

              {/* Prompt Card */}
              <div className="flex-grow w-full">
                {activePrompt && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-line/30 pb-4">
                      <div className="flex items-center gap-2">
                        {activePrompt.icon}
                        <span className="text-xs font-mono font-bold text-text-main uppercase tracking-wider">
                          {activePrompt.title}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleCopyPrompt(activePrompt.promptText, activePrompt.phase)}
                        className={cn(
                          "text-xs font-mono font-bold tracking-wider uppercase hover:underline transition-all bg-transparent border-0 outline-none flex items-center gap-2 cursor-pointer text-primary",
                          copiedId === activePrompt.phase && "text-green-600 font-black"
                        )}
                      >
                        {copiedId === activePrompt.phase ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Prompt
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex gap-3 bg-base-dim/20 border border-border-line/50 p-4">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-text-dim leading-relaxed">{activePrompt.concept}</p>
                    </div>

                    <div className="bg-base-dim/10 border border-border-line p-5 font-mono text-xs text-text-dim leading-relaxed whitespace-pre-wrap select-all select-none">
                      {activePrompt.promptText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: LITERATURA PREMIUM (SYLLABUS) */}
        {activeSubTab === 'literatura' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="mb-6">
              <h3 className="text-subtitle font-medium mb-1">Módulos de Formación Cíclica (Kyoto Premium)</h3>
              <p className="text-xs text-text-dim">
                Acceda de forma local y privada al conocimiento estratégico del Syllabus de Productividad Orgánica.
              </p>
            </div>

            {[
              {
                mod: 'Módulo I',
                title: 'Fundamentos de la Sincronización Fisiológica & Lunar',
                desc: 'Aprende a hackear tu agenda en base a las fluctuaciones hormonales del ciclo menstrual o la ritmología del ciclo lunar.',
                content: 'La productividad lineal corporativa exige un rendimiento uniforme de 8 horas diarias de lunes a viernes, ignorando las fluctuaciones biológicas. La productividad orgánica, en cambio, reconoce cuatro picos energéticos clave en el ciclo de 28 días:\n\n• Fase Dinámica (Foco analítico - 12h de energía subjetiva).\n• Fase Expresiva (Foco interpersonal - 10h de energía subjetiva).\n• Fase Creativa (Foco divergente y purga - 8h de energía subjetiva).\n• Fase Reflexiva (Foco estratégico y descanso - 5h de energía subjetiva).\n\nAdaptar tu agenda y tus listas a estas fases reduce drásticamente el cortisol y previene el burnout crónico.'
              },
              {
                mod: 'Módulo II',
                title: 'El Copiloto Cognitivo y la Interacción con Inteligencia Artificial',
                desc: 'Estrategias de prompts avanzados para delegar tareas y desglosar parálisis de análisis según tu fase energética activa.',
                content: 'Delegar en modelos de lenguaje artificial no requiere habilidades complejas de programación, sino una alineación energética correcta. Cuando te encuentres en fases de baja energía física (Fase Reflexiva/Menstrual), utiliza prompts diseñados para la evaluación global o la introspección silenciosa. Cuando tu mente esté lógica y ágil (Fase Dinámica), utilízalos para realizar desgloses minuciosos e ingenierías de procesos.'
              },
              {
                mod: 'Módulo III',
                title: 'Soberanía Digital: Sincronización Multidispositivo sin Nube Corporativa',
                desc: 'Configuración detallada de Obsidian Vaults, Syncthing y respaldos fríos para la posesión e intimidad absoluta de tus datos.',
                content: 'En la era del capitalismo de vigilancia, tus datos de salud íntima son un recurso comercial cotizado. CÍCLICA ha sido diseñada bajo la filosofía Local-First para asegurar que tus datos nunca salgan de tus dispositivos sin tu consentimiento. La sincronización se realiza mediante redes P2P encriptadas de extremo a extremo directas, permitiendo tener la misma base de datos en tu móvil, tablet y laptop sin regalar tu información a servidores corporativos en la nube.'
              }
            ].map(m => (
              <div key={m.mod} className="border-b border-border-line pb-6 space-y-3">
                <span className="text-[10px] tracking-widest font-mono uppercase text-primary font-bold">{m.mod}</span>
                <h4 className="text-base font-light tracking-tight text-text-main">{m.title}</h4>
                <p className="text-xs text-text-dim italic">{m.desc}</p>
                <div className="bg-base-dim/20 p-5 border border-border-line text-xs text-text-dim leading-relaxed whitespace-pre-line">
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}
