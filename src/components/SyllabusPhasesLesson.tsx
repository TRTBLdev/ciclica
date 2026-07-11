import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function SyllabusPhasesLesson({ onBack }: Props) {
  return (
    <div className="animate-in fade-in flex flex-col w-full px-6 md:px-10 py-10 pb-16 max-w-3xl mx-auto text-left bg-transparent">
      {/* HEADER SECTION */}
      <div className="relative flex flex-col border-b border-border-line pb-6 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-dim hover:text-text-main transition-colors mb-8 w-fit bg-transparent border-0 outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Syllabus
        </button>
        <span className="text-[10px] tracking-widest font-mono uppercase text-primary font-bold mb-2">Módulo I</span>
        <h2 className="text-3xl font-light text-text-main leading-tight mb-4">
          Fundamentos de la Sincronización Fisiológica & Lunar
        </h2>
        <p className="text-sm text-text-dim leading-relaxed italic">
          Aprende a hackear tu agenda en base a las fluctuaciones hormonales del ciclo menstrual o la ritmología del ciclo lunar.
        </p>
      </div>

      {/* CONTENT */}
      <article className="prose prose-sm md:prose-base prose-invert prose-p:text-text-main prose-p:leading-relaxed prose-headings:text-primary prose-a:text-[#73c2b8] max-w-none font-sans font-light">
        <p className="lead text-lg opacity-90 mb-8">
          La productividad lineal corporativa exige un rendimiento uniforme de 8 horas diarias de lunes a viernes, ignorando las fluctuaciones biológicas. 
          La productividad orgánica, en cambio, reconoce cuatro picos energéticos clave en el ciclo de 28 días.
        </p>

        <h3 className="text-lg font-bold text-text-main mt-10 mb-4 border-l-2 border-[#d4af37] pl-4">1. Fase Dinámica (Pico Analítico)</h3>
        <p>
          Duración aproximada: 7-10 días (Folicular / Luna Creciente). 
          Tienes hasta <strong>12 horas de energía subjetiva</strong>. 
          Este es el momento de construir, desglosar proyectos complejos en tareas atómicas, organizar tus finanzas y estructurar sistemas. Tu cerebro está preparado para la lógica lineal y la ejecución sostenida.
        </p>

        <h3 className="text-lg font-bold text-text-main mt-10 mb-4 border-l-2 border-[#e07a5f] pl-4">2. Fase Expresiva (Pico Interpersonal)</h3>
        <p>
          Duración aproximada: 3-5 días (Ovulatoria / Luna Llena). 
          Tienes unas <strong>10 horas de energía subjetiva</strong>. 
          Tu foco está en la empatía y la conexión. Agenda reuniones, presentaciones, networking o graba videos. La comunicación fluye con menor esfuerzo y tu carisma alcanza su punto máximo.
        </p>

        <h3 className="text-lg font-bold text-text-main mt-10 mb-4 border-l-2 border-[#73c2b8] pl-4">3. Fase Creativa (Pico Divergente)</h3>
        <p>
          Duración aproximada: 10-14 días (Lútea / Luna Menguante). 
          La energía cae a <strong>8 horas subjetivas</strong>. 
          A medida que las hormonas fluctúan, tu cerebro se vuelve excepcionalmente bueno para detectar ineficiencias (el "nido"). Es ideal para limpiar, purgar código, organizar espacios físicos y resolver problemas creativos con un enfoque crítico. <em>Peligro: Puedes volverte autocrítico si exiges producción lineal.</em>
        </p>

        <h3 className="text-lg font-bold text-text-main mt-10 mb-4 border-l-2 border-[#81b29a] pl-4">4. Fase Reflexiva (Pico Estratégico)</h3>
        <p>
          Duración aproximada: 3-6 días (Menstrual / Luna Nueva). 
          La energía desciende a <strong>5 horas subjetivas</strong> o menos. 
          Es la fase del invierno biológico. No intentes construir ni ejecutar. Tu intuición está al máximo: es el momento perfecto para revisar la brújula, evaluar si tus metas de vida siguen alineadas, hacer journaling y descansar.
        </p>

        <h3 className="text-lg font-bold text-text-main mt-12 mb-4 border-l-2 border-primary pl-4">Presupuesto de Energía Cíclica (Soporte vs Inversión)</h3>
        <p>
          No toda la energía subjetiva de tu fase debe ir al mismo tipo de esfuerzo. Para evitar el desgaste biológico, Cíclica divide la capacidad energética diaria en dos presupuestos clave:
        </p>
        <ul className="list-disc pl-5 mb-6 text-sm text-text-main">
          <li><strong>🛡️ Soporte Vital:</strong> Tareas esenciales de mantenimiento (limpieza, administración básica, rutinas repetitivas, contestar correos).</li>
          <li><strong>⚡ Inversión:</strong> Proyectos creativos, estudio, tareas de alta concentración y crecimiento estratégico.</li>
        </ul>
        
        <p>
          Según la fase activa, el reparto recomendado cambia para optimizar tu fisiología:
        </p>
        <div className="overflow-x-auto my-6 border border-border-line/60 rounded-xl">
          <table className="w-full text-xs text-left text-text-main border-collapse">
            <thead>
              <tr className="bg-base-dim/20 border-b border-border-line">
                <th className="p-3 font-mono uppercase tracking-wider text-text-dim text-[10px]">Fase</th>
                <th className="p-3 font-mono uppercase tracking-wider text-text-dim text-[10px] text-center">Límite Total</th>
                <th className="p-3 font-mono uppercase tracking-wider text-text-dim text-[10px] text-center">Soporte Vital</th>
                <th className="p-3 font-mono uppercase tracking-wider text-text-dim text-[10px] text-center">Inversión / Crecimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-line/40">
                <td className="p-3 font-medium">Fase Dinámica</td>
                <td className="p-3 text-center font-mono">12.0h</td>
                <td className="p-3 text-center font-mono text-[#81b29a]">2.0h</td>
                <td className="p-3 text-center font-mono text-[#d4af37]">10.0h</td>
              </tr>
              <tr className="border-b border-border-line/40">
                <td className="p-3 font-medium">Fase Expresiva</td>
                <td className="p-3 text-center font-mono">10.0h</td>
                <td className="p-3 text-center font-mono text-[#81b29a]">2.0h</td>
                <td className="p-3 text-center font-mono text-[#d4af37]">8.0h</td>
              </tr>
              <tr className="border-b border-border-line/40">
                <td className="p-3 font-medium">Fase Creativa</td>
                <td className="p-3 text-center font-mono">8.0h</td>
                <td className="p-3 text-center font-mono text-[#81b29a]">3.0h</td>
                <td className="p-3 text-center font-mono text-[#d4af37]">5.0h</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Fase Reflexiva</td>
                <td className="p-3 text-center font-mono">5.0h</td>
                <td className="p-3 text-center font-mono text-[#81b29a]">4.0h</td>
                <td className="p-3 text-center font-mono text-[#d4af37]">1.0h</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="my-10 bg-base-dim/10 border border-border-line p-6 rounded-lg">
          <h4 className="text-sm font-mono uppercase tracking-widest text-primary font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Conclusión Práctica
          </h4>
          <p className="text-sm text-text-main m-0">
            Adaptar tu agenda y tus listas a estas fases reduce drásticamente el cortisol y previene el burnout crónico. No somos máquinas lineales; somos ecosistemas. Respetar tus propios inviernos te garantiza veranos más productivos.
          </p>
        </div>
      </article>
    </div>
  );
}
