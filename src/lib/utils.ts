import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppTask, Config, BiologicalPhase, CycleTrackingType } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractSafeTime(t: string | undefined): string | null {
  if (!t) return null;
  if (t.includes('1899') || t.includes('GMT') || t.includes('T')) {
    const d = new Date(t);
    if (!isNaN(d.getTime())) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return t;
}

export function timeToMins(t: string | null | undefined): number {
  if (!t) return 0;
  const parts = t.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function minsToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export function isSameDay(d1: string | Date, d2: string | Date): boolean {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
}

export function isTodayOrBefore(dateStr: string | undefined): boolean {
  if (!dateStr) return true;
  const taskDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate <= today;
}

export function isFutureDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const taskDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate > today;
}

export function getAreaColorClasses(color: string) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 border-slate-200 text-slate-700',
    blue: 'bg-blue-100 border-blue-200 text-blue-700',
    orange: 'bg-orange-100 border-orange-200 text-orange-700',
    purple: 'bg-purple-100 border-purple-200 text-purple-700',
    emerald: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-100 border-amber-200 text-amber-700',
    red: 'bg-red-100 border-red-200 text-red-700',
    green: 'bg-green-100 border-green-200 text-green-700',
    teal: 'bg-teal-100 border-teal-200 text-teal-700',
    cyan: 'bg-cyan-100 border-cyan-200 text-cyan-700',
  };
  return map[color] || map.slate;
}

export function getAreaProgressClasses(color: string) {
  const map: Record<string, string> = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
  };
  return map[color] || map.slate;
}

export function getAreaTextClasses(color: string) {
  const map: Record<string, string> = {
    slate: 'text-slate-500',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    green: 'text-green-500',
    teal: 'text-teal-500',
    cyan: 'text-cyan-500',
  };
  return map[color] || map.slate;
}

export function getSafeTailwindClasses() {
  return [
    'text-blue-400', 'text-blue-500', 'text-blue-600', 'text-blue-700', 'bg-blue-50', 'bg-blue-400', 'bg-blue-500', 'border-blue-100', 'border-blue-200',
    'text-orange-400', 'text-orange-500', 'text-orange-600', 'text-orange-700', 'bg-orange-50', 'bg-orange-400', 'bg-orange-500', 'border-orange-100', 'border-orange-200',
    'text-purple-400', 'text-purple-500', 'text-purple-600', 'text-purple-700', 'bg-purple-50', 'bg-purple-400', 'bg-purple-500', 'border-purple-100', 'border-purple-200',
    'text-emerald-400', 'text-emerald-500', 'text-emerald-600', 'text-emerald-700', 'bg-emerald-50', 'bg-emerald-400', 'bg-emerald-500', 'border-emerald-100', 'border-emerald-200',
    'text-slate-400', 'text-slate-500', 'text-slate-600', 'text-slate-700', 'bg-slate-50', 'bg-slate-400', 'bg-slate-500', 'border-slate-100', 'border-slate-200',
    'text-amber-400', 'text-amber-500', 'text-amber-600', 'text-amber-700', 'bg-amber-50', 'bg-amber-400', 'bg-amber-500', 'border-amber-100', 'border-amber-200',
    'text-red-400', 'text-red-500', 'text-red-600', 'text-red-700', 'bg-red-50', 'bg-red-400', 'bg-red-500', 'border-red-100', 'border-red-200',
    'text-green-400', 'text-green-500', 'text-green-600', 'text-green-700', 'bg-green-50', 'bg-green-400', 'bg-green-500', 'border-green-100', 'border-green-200',
  ];
}


export function calculateBiologicalPhase(config: Config | null): BiologicalPhase {
  if (!config || !config.cycleConfig) return 'expresiva'; // fallback
  
  const { trackingType, currentManualPhase, flowLogs, cycleLengthDays } = config.cycleConfig;
  
  if (currentManualPhase && currentManualPhase !== 'none' as any) {
    return currentManualPhase;
  }
  
  if (trackingType === 'menstrual' && flowLogs && Object.keys(flowLogs).length > 0) {
    // --- ALGORITMO PREDICTIVO ADAPTATIVO POR INTENSIDAD DE FLUJO ---
    // 1. Sort flow log dates chronologically
    const logEntries = Object.entries(flowLogs)
      .filter(([_, intensity]) => intensity > 0)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
    if (logEntries.length === 0) return 'expresiva'; // fallback
    
    // 2. Identify start dates of all cycles (Day 1 of period)
    // A new cycle starts if flow intensity > 0 after a gap of at least 10 days
    const cycleStartDates: Date[] = [];
    let lastDate: Date | null = null;
    
    logEntries.forEach(([dateStr]) => {
      const currentDate = new Date(dateStr);
      if (!lastDate) {
        cycleStartDates.push(currentDate);
      } else {
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 10) {
          cycleStartDates.push(currentDate);
        }
      }
      lastDate = currentDate;
    });
    
    // 3. Current active cycle details
    const activeCycleStart = new Date(cycleStartDates[cycleStartDates.length - 1].getTime());
    const today = new Date();
    today.setHours(0,0,0,0);
    activeCycleStart.setHours(0,0,0,0);
    
    const daysIntoCycle = Math.floor((today.getTime() - activeCycleStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // 4. Calculate adaptive cycle length (average of completed cycles)
    let calculatedCycleLength = cycleLengthDays || 28;
    if (cycleStartDates.length >= 2) {
      let totalIntervalDays = 0;
      for (let i = 1; i < cycleStartDates.length; i++) {
        totalIntervalDays += Math.floor((cycleStartDates[i].getTime() - cycleStartDates[i-1].getTime()) / (1000 * 60 * 60 * 24));
      }
      calculatedCycleLength = Math.round(totalIntervalDays / (cycleStartDates.length - 1));
    }
    
    // 5. Determine active phase of current cycle
    // Menstrual phase length: periodLengthDays (or 5) by default, or extends if flow intensity > 0 continues
    const configuredPeriodLength = config.cycleConfig.periodLengthDays || 5;
    let menstrualPhaseLength = configuredPeriodLength;
    
    // Find consecutive flow days from start
    let cursor = new Date(activeCycleStart.getTime());
    let consecutiveFlowDays = 0;
    while (consecutiveFlowDays < 15) { // safety limit
      const cursorStr = cursor.toISOString().slice(0, 10);
      if (flowLogs[cursorStr] && flowLogs[cursorStr] > 0) {
        consecutiveFlowDays++;
        cursor.setDate(cursor.getDate() + 1);
      } else {
        break;
      }
    }
    
    menstrualPhaseLength = Math.max(configuredPeriodLength, consecutiveFlowDays);
    
    if (daysIntoCycle < menstrualPhaseLength) {
      return 'reflexiva'; // Fase Menstrual
    }
    
    // Proportional ratios for remaining phases inside the adaptive cycle length
    if (daysIntoCycle < calculatedCycleLength * 0.40) {
      return 'dinamica';
    }
    if (daysIntoCycle < calculatedCycleLength * 0.58) {
      return 'expresiva';
    }
    return 'creativa';
  }
  
  if (trackingType === 'lunar') {
    const refDate = new Date('2000-01-06T18:14:00');
    const today = new Date();
    const diffTime = today.getTime() - refDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const lunarCycle = 29.530588853;
    const currentAge = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;
    
    const ratio = currentAge / lunarCycle;
    if (ratio <= 0.25) return 'reflexiva';
    if (ratio <= 0.50) return 'dinamica';
    if (ratio <= 0.75) return 'expresiva';
    return 'creativa';
  }
  
  return 'expresiva'; // Default
}

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

export function migrateDatabase(rawData: any): { tasks: AppTask[]; history: any[]; config: Config } {
  console.log("CÍCLICA Migration Engine: Iniciando verificación de esquema local-first...");

  const defaultAreas = {
    BODY: { color: 'emerald', categories: ['EJERCICIO', 'DESCANSO', 'NUTRICIÓN'] },
    MIND: { color: 'teal', categories: ['MEDITACIÓN', 'APRENDIZAJE', 'CREATIVIDAD'] },
    FINANCE: { color: 'amber', categories: ['FINANZAS', 'PLANIFICACIÓN', 'TRABAJO'] },
    HOME: { color: 'slate', categories: ['LIMPIEZA', 'MANTENIMIENTO', 'ORDEN'] }
  };

  const defaultSeparators = [
    { hora: "08:00", text: "Mañana", detalle: "Foco e inicio" },
    { hora: "14:00", text: "Tarde", detalle: "Bloque operativo" },
    { hora: "20:00", text: "Noche", detalle: "Descanso y desconexión" }
  ];

  // 2. Validate Config Schema
  let config = rawData.config || {};
  
  if (config.theme !== 'muji' && config.theme !== 'kyoto-dusk') {
    config.theme = 'muji';
  }

  // Purely preserve config areas and blend with default structures if missing
  if (config.areas) {
    config.areas = { ...defaultAreas, ...config.areas };
  } else {
    config.areas = defaultAreas;
  }

  if (!Array.isArray(config.separators) || config.separators.length === 0) {
    config.separators = defaultSeparators;
  }

  if (!config.cycleConfig) {
    config.cycleConfig = { trackingType: 'none' };
  } else {
    if (!config.cycleConfig.trackingType) {
      config.cycleConfig.trackingType = 'none';
    }
    if (!config.cycleConfig.flowLogs) {
      config.cycleConfig.flowLogs = {};
    }
  }

  // 3. Migrate Tasks
  const rawTasks = Array.isArray(rawData.tasks) ? rawData.tasks : [];
  const tasks: AppTask[] = rawTasks.map((t: any) => {
    const task = { ...t };
    
    if (!task.id) {
      task.id = `task_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    if (task.type === 'Contador' || task.type === 'Evento') {
      task.type = 'Pulso';
    }

    if (!task.type) {
      task.type = 'Tarea';
    }

    if (task.type === 'Pulso') {
      task.currentCount = typeof task.currentCount === 'number' ? task.currentCount : 0;
      task.targetCount = typeof task.targetCount === 'number' ? task.targetCount : 8;
      task.unitLabel = typeof task.unitLabel === 'string' ? task.unitLabel : 'veces';
    }

    task.completed = !!task.completed;
    task.createdAt = task.createdAt || new Date().toISOString();

    return task as AppTask;
  });

  // 4. Migrate History Records
  const rawHistory = Array.isArray(rawData.history) ? rawData.history : [];
  const history: any[] = rawHistory.map((h: any) => {
    const hist = { ...h };

    if (!hist.id) {
      hist.id = `hist_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    hist.date = hist.date || new Date().toISOString();
    hist.duration = typeof hist.duration === 'number' ? hist.duration : 0;
    hist.createdAt = hist.createdAt || new Date().toISOString();

    return hist;
  });

  console.log("CÍCLICA Migration Engine: Verificación exitosa. Registros migrados:", {
    tareasCount: tasks.length,
    historialCount: history.length,
    version: 1
  });

  return { tasks, history, config: config as Config };
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
}

export interface PeriodGroup {
  startDate: string;
  endDate: string;
  days: { date: string; intensity: number }[];
}

export function getCyclePeriods(flowLogs: Record<string, number> | undefined): PeriodGroup[] {
  if (!flowLogs) return [];
  const flowEntries = Object.entries(flowLogs)
    .filter(([_, intensity]) => intensity > 0)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    
  if (flowEntries.length === 0) return [];
  
  const periods: PeriodGroup[] = [];
  let currentGroup: PeriodGroup | null = null;
  
  flowEntries.forEach(([dateStr, intensity]) => {
    if (!currentGroup) {
      currentGroup = { startDate: dateStr, endDate: dateStr, days: [{ date: dateStr, intensity }] };
    } else {
      const lastDay = parseLocalDate(currentGroup.endDate);
      const thisDay = parseLocalDate(dateStr);
      const diffDays = Math.floor((thisDay.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 10) {
        periods.push(currentGroup);
        currentGroup = { startDate: dateStr, endDate: dateStr, days: [{ date: dateStr, intensity }] };
      } else {
        currentGroup.endDate = dateStr;
        currentGroup.days.push({ date: dateStr, intensity });
      }
    }
  });
  if (currentGroup) periods.push(currentGroup);
  return periods;
}

export interface LunarDetails {
  age: number;
  ratio: number;
  phaseName: string;
  emoji: string;
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

export interface LunarArchetypeDetails {
  archetype: 'Luna Blanca' | 'Luna Roja' | 'Luna Rosa (Creciente)' | 'Luna Violeta (Menguante)';
  archetypeDesc: string;
  colorClass: string;
  pillColorClass: string;
  bgClass: string;
  borderColorClass: string;
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


