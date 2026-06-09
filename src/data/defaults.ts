import { AppTask, Config } from '../types';

export const DEFAULT_AREAS = {
  BODY: { color: 'emerald', categories: ['EJERCICIO', 'DESCANSO', 'NUTRICIÓN'] },
  MIND: { color: 'teal', categories: ['MEDITACIÓN', 'APRENDIZAJE', 'CREATIVIDAD'] },
  FINANCE: { color: 'amber', categories: ['FINANZAS', 'PLANIFICACIÓN', 'TRABAJO'] },
  HOME: { color: 'slate', categories: ['LIMPIEZA', 'MANTENIMIENTO', 'ORDEN'] }
};

export const DEFAULT_SEPARATORS = [
  { hora: "08:00", text: "Mañana", detalle: "Foco e inicio" },
  { hora: "14:00", text: "Tarde", detalle: "Bloque operativo" },
  { hora: "20:00", text: "Noche", detalle: "Descanso y desconexión" }
];

export function createDefaultConfig(userId: string, now = new Date()): Config {
  return {
    userId,
    theme: 'muji',
    cycleConfig: { trackingType: 'none' },
    areas: DEFAULT_AREAS,
    separators: DEFAULT_SEPARATORS,
    createdAt: now.toISOString()
  };
}

export function createDemoTasks(userId: string, now = new Date()): AppTask[] {
  const createdAt = now.toISOString();

  return [
    {
      id: 'task_demo_1',
      userId,
      text: 'Movimiento adaptado a mi energía',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'EJERCICIO',
      completed: false,
      fechaPlanificada: createdAt,
      frecuencia: 1,
      frecuenciaUnidad: 'días',
      duracion: 1,
      createdAt
    },
    {
      id: 'task_demo_2',
      userId,
      text: 'Revisión de prioridades y finanzas',
      type: 'Hábito',
      category: 'FINANCE',
      subCategory: 'FINANZAS',
      completed: false,
      fechaPlanificada: createdAt,
      frecuencia: 7,
      frecuenciaUnidad: 'días',
      duracion: 0.5,
      createdAt
    }
  ] as AppTask[];
}
