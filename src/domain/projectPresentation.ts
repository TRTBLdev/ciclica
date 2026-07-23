import { AppTask, HistoryRecord } from '../types';
import {
  formatRelativeCalendarDate,
  getAppearanceDate,
  getAppearanceFrequency,
  getAppearanceMode,
  getAppearanceUnit,
  getDeadlineDate,
  getNextAppearanceDate,
  getProjectDateSummary,
} from './appearance';
import { EnergyAllocation, getTaskEnergyBreakdown } from './energyAllocation';
import { formatDateOnly, parseDateOnly } from './recurrenceProgress';
import { getDescendantTaskIds, getProjectForTask } from './workTracking';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

export interface ProjectEnergySummary {
  support: number;
  investment: number;
  total: number;
  allocation?: EnergyAllocation;
}

export interface ProjectPresentation {
  descendants: AppTask[];
  pendingTasks: AppTask[];
  completedTasks: AppTask[];
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  progress: number;
  openEstimate: number;
  totalEstimate: number;
  trackedHours: number;
  energy: ProjectEnergySummary;
  scheduleLabel: string;
  nextAppearanceDate?: string;
  deadline?: string;
  startDate?: string;
  lastActivityDate?: string;
}

export function getProjectScheduleLabel(project: AppTask): string {
  const mode = getAppearanceMode(project);
  if (!mode) return 'Sin programación';

  if (mode === 'weekdays') {
    const days = (project.appearanceWeekdays || [])
      .map(day => WEEKDAY_LABELS[day])
      .filter(Boolean);
    return days.length ? days.join(' · ') : 'Días específicos';
  }

  if (mode === 'interval') {
    const frequency = getAppearanceFrequency(project);
    const unit = getAppearanceUnit(project);
    if (frequency === 1) {
      if (unit === 'días') return 'Cada día';
      if (unit === 'semanas') return 'Cada semana';
      return 'Cada mes';
    }
    return `Cada ${frequency} ${unit}`;
  }

  const appearanceDate = getAppearanceDate(project);
  return appearanceDate ? `Desde ${formatRelativeCalendarDate(appearanceDate)}` : 'Programado';
}

export function getProjectEnergySummary(projectId: string, tasks: AppTask[]): ProjectEnergySummary {
  const descendantIds = new Set(getDescendantTaskIds(projectId, tasks));
  const pendingTasks = tasks.filter(task => (
    descendantIds.has(task.id)
    && task.type === 'Tarea'
    && !task.completed
  ));

  const energy = pendingTasks.reduce((summary, task) => {
    const breakdown = getTaskEnergyBreakdown(task, tasks, task.duracion || 0);
    summary.support += breakdown.support;
    summary.investment += breakdown.investment;
    return summary;
  }, { support: 0, investment: 0 });

  const total = energy.support + energy.investment;
  const allocation = energy.support > 0 && energy.investment > 0
    ? 'mixed'
    : energy.support > 0
      ? 'fixed'
      : energy.investment > 0
        ? 'growth'
        : undefined;

  return { ...energy, total, allocation };
}

export function getProjectPresentation(
  project: AppTask,
  tasks: AppTask[],
  history: HistoryRecord[] = [],
  at: string | Date = new Date(),
): ProjectPresentation {
  const descendantIds = new Set(getDescendantTaskIds(project.id, tasks));
  const descendants = tasks.filter(task => descendantIds.has(task.id));
  const projectTasks = descendants.filter(task => task.type === 'Tarea');
  const pendingTasks = projectTasks.filter(task => !task.completed);
  const completedTasks = projectTasks.filter(task => task.completed);
  const totalCount = projectTasks.length;
  const completedCount = completedTasks.length;
  const dateSummary = getProjectDateSummary(project, tasks, history, at);
  const nextAppearanceDate = getNextAppearanceDate(project, at);
  const effectiveNextAppearanceDate = (
    nextAppearanceDate
    && dateSummary.lastActivityDate
    && nextAppearanceDate === dateSummary.lastActivityDate
  ) ? (() => {
      const dayAfterActivity = parseDateOnly(dateSummary.lastActivityDate);
      dayAfterActivity.setDate(dayAfterActivity.getDate() + 1);
      return getNextAppearanceDate(project, formatDateOnly(dayAfterActivity));
    })()
    : nextAppearanceDate;
  const projectTaskIds = new Set(projectTasks.map(task => task.id));

  return {
    descendants,
    pendingTasks,
    completedTasks,
    pendingCount: pendingTasks.length,
    completedCount,
    totalCount,
    progress: totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : project.completed ? 100 : 0,
    openEstimate: pendingTasks.reduce((total, task) => total + (task.duracion || 0), 0),
    totalEstimate: projectTasks.reduce((total, task) => total + (task.duracion || 0), 0),
    trackedHours: history
      .filter(record => projectTaskIds.has(record.taskId))
      .reduce((total, record) => total + (record.duration || 0), 0),
    energy: getProjectEnergySummary(project.id, tasks),
    scheduleLabel: getProjectScheduleLabel(project),
    nextAppearanceDate: effectiveNextAppearanceDate,
    deadline: getDeadlineDate(project),
    startDate: dateSummary.startDate,
    lastActivityDate: dateSummary.lastActivityDate,
  };
}

export function getInheritedProjectContext(task: AppTask, tasks: AppTask[]): AppTask | null {
  if (task.type === 'Proyecto') return null;
  return getProjectForTask(task.id, tasks);
}

export function canCloseProject(projectId: string, tasks: AppTask[]): boolean {
  const descendantIds = new Set(getDescendantTaskIds(projectId, tasks));
  return !tasks.some(task => (
    descendantIds.has(task.id)
    && task.type === 'Tarea'
    && !task.completed
  ));
}

export function projectMatchesEnergyFilter(
  project: AppTask,
  tasks: AppTask[],
  filter: string,
): boolean {
  if (filter === 'Todas') return true;
  return getProjectEnergySummary(project.id, tasks).allocation === filter;
}
