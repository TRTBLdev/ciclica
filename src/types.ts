export interface AreaConfig {
  color: string;
  categories?: string[];
}

export type CycleTrackingType = 'menstrual' | 'lunar' | 'none';
export type BiologicalPhase = 'dinamica' | 'expresiva' | 'creativa' | 'reflexiva';

export interface UserCycleConfig {
  trackingType: CycleTrackingType;
  lastCycleStartDate?: string; // ISO Date "YYYY-MM-DD"
  cycleLengthDays?: number;    // Por defecto 28
  periodLengthDays?: number;   // Por defecto 5 (duración promedio del sangrado)
  currentManualPhase?: BiologicalPhase; // Para modo manual
  flowLogs?: Record<string, number>; // YYYY-MM-DD -> intensidad (0-3)
  menstruates?: boolean;
  enableLunarMirror?: boolean;
}

export interface Config {
  id?: string;
  userId: string;
  theme: 'muji' | 'kyoto-dusk';
  cycleConfig: UserCycleConfig;
  areas: Record<string, string | AreaConfig>;
  separators: Separator[];
  createdAt: string;
  updatedAt?: string;
}

export interface Separator {
  hora: string;
  text: string;
  detalle: string;
}

export type TaskType = 'Hábito' | 'Pulso' | 'Proyecto' | 'Tarea' | 'Rutina' | 'Meta';

export interface AppTask {
  id: string; // Document ID
  userId: string;
  text: string;
  category?: string; // BODY, MIND, FINANCE, HOME
  subCategory?: string;
  completed?: boolean;
  view?: string;
  hora?: string;
  type: TaskType;
  priority?: string;
  parentId?: string;
  dependencyId?: string;
  fechaPlanificada?: string;
  fechaInicio?: string;
  frecuencia?: number; // Ej. 3
  frecuenciaUnidad?: 'días' | 'semanas' | 'meses';
  duracion?: number; // Estimación en horas (Energía Ejecutiva)
  objetivo?: number;
  polaridad?: string;
  currentCount?: number; // Valor acumulado hoy (ej. 3)
  targetCount?: number; // Meta diaria cuantitativa (ej. 8)
  unitLabel?: string; // Ej. "vasos", "veces", "pastillas"
  lastExecutedAt?: string; // Último check real
  createdAt: string;
  updatedAt?: string;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  taskId: string;
  date: string;
  duration?: number;
  createdAt: string;
  startTime?: string;
  endTime?: string;
}

