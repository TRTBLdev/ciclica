import { BiologicalPhase, CycleTrackingType } from '../types';

export function getEnergyEngineDetails(phase: BiologicalPhase, trackingType?: CycleTrackingType) {
  const isLunar = trackingType === 'lunar';
  switch (phase) {
    case 'dinamica':
      return {
        limit: 12,
        label: isLunar ? 'Fase Dinámica (Luna Creciente)' : 'Fase Dinámica (Folicular)',
        details: isLunar
          ? 'Expansión y crecimiento. La luna crece: planifica, estructura y avanza con determinación.'
          : 'Enfoque lógico y estructurado. Planificación y Meal Prep.',
        color: 'text-[#d4af37]',
        bg: 'bg-[#d4af37]',
        borderColor: 'border-[#d4af37]/30',
        pillBg: 'bg-[#d4af37]/10 text-[#d4af37]'
      };
    case 'expresiva':
      return {
        limit: 10,
        label: isLunar ? 'Fase Expresiva (Luna Llena)' : 'Fase Expresiva (Ovulación)',
        details: isLunar
          ? 'Plenitud e iluminación. La luna llena potencia la comunicación, las relaciones y la visibilidad.'
          : 'Pico social, empatía e intercambio. Networking y relaciones.',
        color: 'text-[#e07a5f]',
        bg: 'bg-[#e07a5f]',
        borderColor: 'border-[#e07a5f]/30',
        pillBg: 'bg-[#e07a5f]/10 text-[#e07a5f]'
      };
    case 'creativa':
      return {
        limit: 8,
        label: isLunar ? 'Fase Creativa (Luna Menguante)' : 'Fase Creativa (Lútea)',
        details: isLunar
          ? 'Liberación y cierre. La luna decrece: descarta, ordena y reorganiza con intuición.'
          : 'Organización física del entorno, purga, descarte y limpieza sutil.',
        color: 'text-[#73c2b8]',
        bg: 'bg-[#73c2b8]',
        borderColor: 'border-[#73c2b8]/30',
        pillBg: 'bg-[#73c2b8]/10 text-[#73c2b8]'
      };
    case 'reflexiva':
      return {
        limit: 5,
        label: isLunar ? 'Fase Reflexiva (Luna Nueva)' : 'Fase Reflexiva (Menstruación)',
        details: isLunar
          ? 'Introspección y renovación. La oscuridad lunar invita al descanso y la visión interior.'
          : 'Hibernación y autocuidado compasivo. Casa al mínimo.',
        color: 'text-[#81b29a]',
        bg: 'bg-[#81b29a]',
        borderColor: 'border-[#81b29a]/30',
        pillBg: 'bg-[#81b29a]/10 text-[#81b29a]'
      };
  }
}
