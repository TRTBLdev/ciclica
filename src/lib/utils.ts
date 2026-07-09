import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppTask } from "../types";

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

function getCalendarDateParts(value: string | Date) {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);
  if (dateOnlyMatch) {
    return {
      year: Number(dateOnlyMatch[1]),
      month: Number(dateOnlyMatch[2]),
      day: Number(dateOnlyMatch[3]),
    };
  }

  const parsed = new Date(value);
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function calendarDateValue(value: string | Date) {
  const parts = getCalendarDateParts(value);
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

export function isSameDay(d1: string | Date, d2: string | Date): boolean {
  if (!d1 || !d2) return false;
  return calendarDateValue(d1) === calendarDateValue(d2);
}

export function isTodayOrBefore(dateStr: string | undefined): boolean {
  if (!dateStr) return true;
  return calendarDateValue(dateStr) <= calendarDateValue(new Date());
}

export function isFutureDate(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return calendarDateValue(dateStr) > calendarDateValue(new Date());
}

export const APP_COLORS = ['slate', 'blue', 'orange', 'purple', 'emerald', 'amber', 'red', 'green', 'teal', 'cyan'];

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
    'text-teal-400', 'text-teal-500', 'text-teal-600', 'text-teal-700', 'bg-teal-50', 'bg-teal-400', 'bg-teal-500', 'border-teal-100', 'border-teal-200',
    'text-cyan-400', 'text-cyan-500', 'text-cyan-600', 'text-cyan-700', 'bg-cyan-50', 'bg-cyan-400', 'bg-cyan-500', 'border-cyan-100', 'border-cyan-200',
  ];
}

export function getEffectiveAllocation(task: AppTask, allTasks: AppTask[]): 'fixed' | 'growth' | 'mixed' {
  if (task.allocationType) return task.allocationType;

  if (task.parentId) {
    const parent = allTasks.find(t => t.id === task.parentId);
    if (parent) {
      return getEffectiveAllocation(parent, allTasks);
    }
  }

  if (task.type === 'Rutina' || task.type === 'Hábito' || task.type === 'Pulso') {
    return 'fixed';
  }
  return 'growth';
}

