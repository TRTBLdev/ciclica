import React, { useState } from 'react';
import { BiologicalPhase } from '../types';
import { BookOpen, Copy, Check, Sparkles, Target, Compass, Flame, Info, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptTemplate {
  phase: BiologicalPhase | 'jerarquia';
  title: string;
  concept: string;
  promptText: string;
  icon: React.ReactNode;
}

export default function PromptBook({ currentPhase }: { currentPhase: BiologicalPhase }) {
  const [activeTab, setActiveTab] = useState<BiologicalPhase | 'jerarquia'>(currentPhase || 'dinamica');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const prompts: PromptTemplate[] = [
    {
      phase: 'dinamica',
      title: 'Fase Dinámica (Pico de Lógica y Planificación)',
      concept: 'Es el Momento Óptimo para el análisis objetivo, la estructuración lógica y el desglose de proyectos masivos o finanzas complejas.',
      icon: <Target className="w-4 h-4 text-[#d4af37]" />,
      promptText: `Actúa como un experto en ingeniería de sistemas y gestión de proyectos. Tengo el siguiente objetivo general: [Escribe aquí tu meta o proyecto]. Considerando que hoy me encuentro en mi Fase Dinámica (con alta capacidad analítica, memoria y enfoque estructurado), desglosa este proyecto en una lista lógica de micro-tareas secuenciales y dependencias que pueda ejecutar de inmediato sin dispersarme.`
    },
    {
      phase: 'expresiva',
      title: 'Fase Expresiva (Pico de Conexión y Comunicación)',
      concept: 'Es el momento para el intercambio social, la empatía, el networking y la preparación de conversaciones o negociaciones interpersonales.',
      icon: <Compass className="w-4 h-4 text-[#e07a5f]" />,
      promptText: `Tengo que preparar la siguiente conversación/reunión estratégica: [Describe brevemente con quién y el propósito]. Actúa como un experto en psicología conductual y comunicación empática. Considerando que me encuentro en mi Fase Expresiva (alto volumen de empatía, empatización y habilidades verbales), estructúrame una guía de conversación con puntos clave de interés común y un tono asertivo que me permita conectar y cooperar eficazmente.`
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
      concept: 'Es el momento óptimo para la recapitulación imparcial de metas y la introspección silenciosa, alejándose de los detalles de ejecución.',
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activePrompt = prompts.find(p => p.phase === activeTab);

  return (
    <div className="animate-in fade-in flex flex-col gap-6 px-6 md:px-10 py-8 mx-auto w-full max-w-4xl text-left bg-transparent">
      <div>
        <h2 className="text-title flex items-center gap-2">
          <BookOpen className="text-text-main w-6 h-6 stroke-[2]" /> Biblioteca Prompt-Book
        </h2>
        <p className="text-sm text-text-dim leading-relaxed mt-1">
          Usa tu LLM favorito (ChatGPT, Claude, Gemini) de forma autónoma con plantillas optimizadas para tu nivel de energía biológico o jerarquía organizacional.
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
            const isActive = tb.ph === activeTab;
            return (
              <button
                key={tb.ph}
                onClick={() => setActiveTab(tb.ph as any)}
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

        {/* Prompt Card Display */}
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
                  onClick={() => handleCopy(activePrompt.promptText, activePrompt.phase)}
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
  );
}
