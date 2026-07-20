export interface AreaConfig {
  color: string;
  categories?: string[];
}

export type CycleTrackingType = 'menstrual' | 'lunar' | 'weekly' | 'none';
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

export interface QuarterRange {
  start: string; // "MM-DD"
  end: string;   // "MM-DD"
}

export interface QuarterConfig {
  type: 'calendar' | 'personal';
  q1?: QuarterRange;
  q2?: QuarterRange;
  q3?: QuarterRange;
  q4?: QuarterRange;
}

export interface Config {
  id?: string;
  userId: string;
  theme: 'muji' | 'kyoto-dusk';
  cycleConfig: UserCycleConfig;
  areas: Record<string, string | AreaConfig>;
  separators: Separator[];
  quarterConfig?: QuarterConfig;
  createdAt: string;
  updatedAt?: string;
}

export interface Separator {
  hora: string;
  text: string;
  detalle: string;
  color?: string;
  /** ISO weekdays: 1 = lunes, 7 = domingo. Undefined means every day. */
  weekdays?: number[];
}

export type TaskType = 'Hábito' | 'Pulso' | 'Proyecto' | 'Tarea' | 'Rutina';
export type RecurrenceUnit = 'días' | 'semanas' | 'meses';
export type AppearanceMode = 'persistent' | 'interval' | 'weekdays' | 'quota' | 'once';
export type QuotaPeriodUnit = 'semanas' | 'meses';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

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
  priority?: string; // @deprecated - Kept for compatibility with existing data; temporal indicators are derived from history.
  parentId?: string;
  dependencyId?: string;
  /** @deprecated Legacy scheduling field. Migrated to fechaAparicion/fechaLimite. */
  fechaPlanificada?: string;
  /** Calendar date (YYYY-MM-DD) on which this item starts/next appears in Hoy. */
  fechaAparicion?: string;
  /** Optional completion deadline (YYYY-MM-DD); it never controls placement in Hoy. */
  fechaLimite?: string;
  /** @deprecated Operational start is derived from the first history record. */
  fechaInicio?: string;
  appearanceMode?: AppearanceMode;
  appearanceFrequency?: number;
  appearanceFrequencyUnit?: RecurrenceUnit;
  frecuencia?: number; // Ej. 3
  frecuenciaUnidad?: RecurrenceUnit;
  /** Stable date used to avoid calendar drift in recurring tasks. */
  recurrenceAnchorDate?: string;
  /** Routine-only progress cycle. Missing values mean the legacy routine still needs configuration. */
  routineCycleFrequency?: number;
  routineCycleUnit?: RecurrenceUnit;
  routineCycleAnchorDate?: string;
  /** ISO weekdays used by weekly routine appearances. */
  appearanceWeekdays?: number[];
  /** Flexible target for a standalone habit inside quotaPeriodUnit. */
  quotaTarget?: number;
  quotaPeriodUnit?: QuotaPeriodUnit;
  /** Direct execution target inherited from the parent routine progress cycle. */
  objetivoPorCiclo?: number;
  duracion?: number; // Estimación en horas (Energía Ejecutiva)
  objetivo?: number;
  polaridad?: 'Reforzar' | 'Abandonar';
  currentCount?: number; // Valor acumulado hoy (ej. 3)
  targetCount?: number; // Meta diaria cuantitativa (ej. 8)
  unitLabel?: string; // Ej. "vasos", "veces", "pastillas"
  lastExecutedAt?: string; // Último check real
  order?: number; // Posición de ordenación para subtareas/hábitos
  allocationType?: 'fixed' | 'growth' | 'mixed';
  completionMode?: 'auto' | 'manual';
  notes?: string;
  checklist?: ChecklistItem[];
  /** Routine-cycle key owning the current child-habit checklist state. */
  checklistCycleStart?: string;
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
  isCompletion?: boolean;
  /** Checklist completion captured when an occurrence was explicitly closed. */
  completionPercent?: number;
  taskSnapshotText?: string;
  /** Context for a child-habit completion inside a routine appearance/cycle. */
  routineId?: string;
  routineCycleStart?: string;
  routineAppearanceDate?: string;
  /** Explicit confirmation that an abandoning pulse had no occurrences that day. */
  pulseOutcome?: 'safe-day';
}

export type ProgressSnapshotKind = 'routine-appearance' | 'routine-cycle' | 'habit-period';

export interface ProgressSnapshot {
  id: string;
  userId: string;
  kind: ProgressSnapshotKind;
  taskId: string;
  taskSnapshotText: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  targetPercent?: number;
  progressPercent: number;
  wasCompleted?: boolean;
  createdAt: string;
}

// --- Intention System (Fase 3) ---

export type IntentionScale = 'phase' | 'cycle' | 'quarter' | 'year';

export interface IntentionItem {
  id: string;                    // 'ii_{timestamp}_{random7}'
  targetType: 'hours' | 'consistency' | 'completion';
  // Vinculación (4 niveles, en cascada):
  areaName?: string;             // Nivel 1: área completa (ej. 'BODY')
  subCategory?: string;          // Nivel 2: subcategoría (ej. 'EJERCICIO') — requiere areaName
  projectId?: string;            // Nivel 3: proyecto específico
  taskId?: string;               // Nivel 4: tarea/hábito/rutina/pulso específico
  // Para 'hours':
  targetHours?: number;          // Horas target para el período completo
  // Para 'consistency':
  targetDays?: number;           // Días target en el período completo
  // 'completion' no necesita campos extra — se lee completed del task/proyecto
}

export interface LinkedItem {
  parentItemId: string;     // ID del item en la escala mayor (padre)
  childIntentionId: string; // ID de la intención de escala menor (hijo)
  childItemId: string;      // ID del item en la escala menor (hijo)
}

export interface Intention {
  id: string;                    // 'int_{timestamp}_{random7}'
  userId: string;
  scale: IntentionScale;
  periodStart: string;           // ISO Date 'YYYY-MM-DD'
  periodEnd: string;             // ISO Date 'YYYY-MM-DD'
  theme?: string;                // Norte narrativo (opcional, todas las escalas)
  items: IntentionItem[];
  linkedItems?: LinkedItem[];    // Vinculaciones con la escala padre
  createdAt: string;             // ISO DateTime
  updatedAt?: string;            // ISO DateTime
}
