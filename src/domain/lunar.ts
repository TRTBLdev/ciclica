export interface LunarDetails {
  age: number;
  ratio: number;
  phaseName: string;
  emoji: string;
}

export interface LunarArchetypeDetails {
  archetype: 'Luna Blanca' | 'Luna Roja' | 'Luna Rosa (Creciente)' | 'Luna Violeta (Menguante)';
  archetypeDesc: string;
  colorClass: string;
  pillColorClass: string;
  bgClass: string;
  borderColorClass: string;
}

export function getLunarDetailsForDate(date: string | Date): LunarDetails {
  const d = new Date(date);
  const refDate = new Date('2000-01-06T18:14:00');
  const diffTime = d.getTime() - refDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const lunarCycle = 29.530588853;
  const age = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
  const ratio = age / lunarCycle;

  let phaseName = 'Luna Nueva';
  let emoji = '🌑';

  if (ratio >= 0.9375 || ratio < 0.0625) {
    phaseName = 'Luna Nueva';
    emoji = '🌑';
  } else if (ratio >= 0.0625 && ratio < 0.1875) {
    phaseName = 'Luna Creciente Cóncava';
    emoji = '🌒';
  } else if (ratio >= 0.1875 && ratio < 0.3125) {
    phaseName = 'Cuarto Creciente';
    emoji = '🌓';
  } else if (ratio >= 0.3125 && ratio < 0.4375) {
    phaseName = 'Luna Creciente Gibosa';
    emoji = '🌔';
  } else if (ratio >= 0.4375 && ratio < 0.5625) {
    phaseName = 'Luna Llena';
    emoji = '🌕';
  } else if (ratio >= 0.5625 && ratio < 0.6875) {
    phaseName = 'Luna Menguante Gibosa';
    emoji = '🌖';
  } else if (ratio >= 0.6875 && ratio < 0.8125) {
    phaseName = 'Cuarto Menguante';
    emoji = '🌗';
  } else {
    phaseName = 'Luna Menguante Cóncava';
    emoji = '🌘';
  }

  return { age, ratio, phaseName, emoji };
}

export function getLunarArchetype(ratioOnDay1: number): LunarArchetypeDetails {
  if (ratioOnDay1 >= 0.875 || ratioOnDay1 < 0.125) {
    return {
      archetype: 'Luna Blanca',
      archetypeDesc: 'Tu menstruación se alinea con la Luna Nueva (oscuridad) y tu ovulación con la Luna Llena. Tradicionalmente asociado a la energía nutricia, el cuidado del entorno y proyectos orientados al exterior.',
      colorClass: 'text-[#81b29a]',
      pillColorClass: 'bg-[#81b29a]/10 text-[#81b29a]',
      bgClass: 'bg-[#81b29a]/5',
      borderColorClass: 'border-[#81b29a]/20'
    };
  } else if (ratioOnDay1 >= 0.375 && ratioOnDay1 < 0.625) {
    return {
      archetype: 'Luna Roja',
      archetypeDesc: 'Tu menstruación se alinea con la Luna Llena (plenitud) y tu ovulación con la Luna Nueva. Tradicionalmente conocido como el ciclo de la Sabia o la Hechicera: enfoca tu energía hacia la intuición, la creatividad, la enseñanza y el autoconocimiento profundo.',
      colorClass: 'text-[#e07a5f]',
      pillColorClass: 'bg-[#e07a5f]/10 text-[#e07a5f]',
      bgClass: 'bg-[#e07a5f]/5',
      borderColorClass: 'border-[#e07a5f]/20'
    };
  } else if (ratioOnDay1 >= 0.125 && ratioOnDay1 < 0.375) {
    return {
      archetype: 'Luna Rosa (Creciente)',
      archetypeDesc: 'Tu menstruación coincide con la Luna Creciente. Simboliza una fase de transición de energía, idónea para iniciar proyectos con cautela e ir de la introspección a la acción progresiva.',
      colorClass: 'text-[#d4af37]',
      pillColorClass: 'bg-[#d4af37]/10 text-[#d4af37]',
      bgClass: 'bg-[#d4af37]/5',
      borderColorClass: 'border-[#d4af37]/20'
    };
  } else {
    return {
      archetype: 'Luna Violeta (Menguante)',
      archetypeDesc: 'Tu menstruación coincide con la Luna Menguante. Simboliza una fase de transición hacia adentro, idónea para la purga de tareas, la limpieza, soltar lo que ya no sirve y prepararse para el descanso.',
      colorClass: 'text-[#73c2b8]',
      pillColorClass: 'bg-[#73c2b8]/10 text-[#73c2b8]',
      bgClass: 'bg-[#73c2b8]/5',
      borderColorClass: 'border-[#73c2b8]/20'
    };
  }
}
