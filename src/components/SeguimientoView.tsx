import React from 'react';
import { AppTask, Config, HistoryRecord, ProgressSnapshot } from '../types';
import { cn } from '../lib/utils';
import { formatDateOnly, getNominalDays, isRoutineConfigured, isTaskScheduledOnDate } from '../domain/recurrenceProgress';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  progressSnapshots: ProgressSnapshot[];
}

const DAY_MS = 86_400_000;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function datesForLast30Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, index) => new Date(today.getTime() - (29 - index) * DAY_MS));
}

function completedHistoryFor(history: HistoryRecord[], taskId: string, date: Date) {
  const key = formatDateOnly(date);
  return history.filter(record => record.taskId === taskId && record.isCompletion && formatDateOnly(new Date(record.date)) === key).length;
}

function plannedDatesInMonth(task: AppTask, year: number, month: number) {
  if (task.frecuenciaUnidad === 'semanas') {
    const weekdayCount = task.type === 'Rutina' ? Math.max(1, task.appearanceWeekdays?.length || 1) : 1;
    return Math.max(1, Math.round(4 / Math.max(1, task.frecuencia || 1))) * weekdayCount;
  }
  if (task.frecuenciaUnidad === 'días') {
    return Math.max(1, Math.round(30 / Math.max(1, task.frecuencia || 1)));
  }
  const total = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= total; day += 1) {
    if (isTaskScheduledOnDate(task, new Date(year, month, day))) count += 1;
  }
  return count;
}

export default function SeguimientoView({ config, tasks, history, progressSnapshots }: Props) {
  const days = datesForLast30Days();
  const pulses = tasks.filter(task => task.type === 'Pulso');
  const trackable = tasks.filter(task => task.type === 'Hábito' || (task.type === 'Rutina' && isRoutineConfigured(task)));
  const frequent = trackable.filter(task => getNominalDays(task.frecuencia, task.frecuenciaUnidad) < 7);
  const monthly = trackable.filter(task => getNominalDays(task.frecuencia, task.frecuenciaUnidad) >= 7);
  const year = new Date().getFullYear();

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 text-left">
      <section>
        <h2 className="text-title mb-1">Pulsos</h2>
        <p className="text-xs text-text-dim mb-5">Cada registro cuenta como una ocurrencia durante los últimos 30 días.</p>
        {pulses.length === 0 ? <Empty text="No hay pulsos configurados." /> : (
          <div className="space-y-4 overflow-x-auto pb-2">
            {pulses.map(pulse => (
              <div key={pulse.id}>
              <TrackingRow label={pulse.text} days={days} renderCell={date => {
                const count = history.filter(record => record.taskId === pulse.id && formatDateOnly(new Date(record.date)) === formatDateOnly(date)).length;
                const target = pulse.targetCount || 1;
                const state = count > target ? 'exceeded' : count === target ? 'complete' : count > 0 ? 'partial' : 'absent';
                return <Cell state={state} title={`${formatDateOnly(date)}: ${count}/${target}`} value={count || undefined} />;
              }} /></div>
            ))}
          </div>
        )}
        <Legend labels={[['complete', 'Logrado'], ['partial', 'En progreso'], ['exceeded', 'Excedido']]} />
      </section>

      <section>
        <h2 className="text-title mb-1">Ritmo frecuente</h2>
        <p className="text-xs text-text-dim mb-5">Hábitos y apariciones de rutina con intervalos menores de siete días.</p>
        {frequent.length === 0 ? <Empty text="No hay elementos con ritmo menor de siete días." /> : (
          <div className="space-y-4 overflow-x-auto pb-2">
            {frequent.map(task => (
              <div key={task.id}>
              <TrackingRow label={task.text} days={days} renderCell={date => {
                const scheduled = isTaskScheduledOnDate(task, date);
                if (!scheduled) return <Cell state="unscheduled" title={`${formatDateOnly(date)}: no programado`} />;
                if (task.type === 'Hábito') {
                  const done = completedHistoryFor(history, task.id, date);
                  return <Cell state={done ? 'complete' : date > new Date() ? 'unscheduled' : 'absent'} title={`${formatDateOnly(date)}: ${done ? 'completo' : 'ausente'}`} />;
                }
                const snapshot = progressSnapshots.find(item => item.kind === 'routine-appearance' && item.taskId === task.id && item.periodStart === formatDateOnly(date));
                if (!snapshot) return <Cell state={date > new Date() ? 'unscheduled' : 'absent'} title={`${formatDateOnly(date)}: sin registro`} />;
                return <Cell state={snapshot.progressPercent >= (snapshot.targetPercent || 100) ? 'complete' : 'partial'} title={`${formatDateOnly(date)}: ${snapshot.progressPercent}% / meta ${snapshot.targetPercent || 100}%`} />;
              }} /></div>
            ))}
          </div>
        )}
        <Legend labels={[['complete', 'Completo'], ['partial', 'Parcial'], ['absent', 'Ausente'], ['unscheduled', 'No programado']]} />
      </section>

      <section>
        <h2 className="text-title mb-1">Resumen mensual · {year}</h2>
        <p className="text-xs text-text-dim mb-5">Cierres reales frente a apariciones nominales. Las sesiones parciales del timer no cuentan.</p>
        {monthly.length === 0 ? <Empty text="No hay hábitos o rutinas con frecuencia semanal o mayor." /> : (
          <div className="overflow-x-auto border border-border-line/50">
            <table className="w-full min-w-[880px] border-collapse text-xs">
              <thead><tr className="border-b border-border-line bg-base-dim/20"><th className="sticky left-0 bg-base-dim px-3 py-3 text-left font-mono uppercase tracking-wider">Elemento</th>{MONTHS.map(month => <th key={month} className="px-2 py-3 text-center font-mono font-normal text-text-dim">{month}</th>)}</tr></thead>
              <tbody>
                {monthly.map(task => (
                  <tr key={task.id} className="border-b border-border-line/40 last:border-0">
                    <th className="sticky left-0 bg-base px-3 py-3 text-left font-normal"><span className="block max-w-[190px] truncate">{task.text}</span><span className="text-[9px] font-mono uppercase text-text-dim">{task.type}</span></th>
                    {MONTHS.map((_, month) => {
                      const expected = plannedDatesInMonth(task, year, month);
                      if (!expected) return <td key={month} className="px-2 py-3 text-center text-text-dim/30">—</td>;
                      if (task.type === 'Hábito') {
                        const actual = history.filter(record => record.taskId === task.id && record.isCompletion && new Date(record.date).getFullYear() === year && new Date(record.date).getMonth() === month).length;
                        return <td key={month} className="p-0"><MonthlyCell actual={actual} expected={expected} /></td>;
                      }
                      const records = progressSnapshots.filter(snapshot => snapshot.taskId === task.id && snapshot.kind === 'routine-appearance' && new Date(`${snapshot.periodStart}T00:00:00`).getFullYear() === year && new Date(`${snapshot.periodStart}T00:00:00`).getMonth() === month);
                      const actual = records.filter(snapshot => snapshot.progressPercent >= (snapshot.targetPercent || 100)).length;
                      const average = records.length ? Math.round(records.reduce((sum, snapshot) => sum + snapshot.progressPercent, 0) / records.length) : 0;
                      return <td key={month} className="p-0"><MonthlyCell actual={actual} expected={expected} detail={records.length ? `${average}% prom.` : undefined} /></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type CellState = 'complete' | 'partial' | 'exceeded' | 'absent' | 'unscheduled';

function Cell({ state, title, value }: { state: CellState; title: string; value?: number }) {
  return <div title={title} className={cn('w-5 h-5 border flex items-center justify-center text-[8px] font-mono', state === 'complete' && 'bg-emerald-600 border-emerald-600 text-white', state === 'partial' && 'bg-amber-400/60 border-amber-500/50 text-text-main', state === 'exceeded' && 'bg-teal-700 border-teal-700 text-white', state === 'absent' && 'bg-red-500/10 border-red-500/30', state === 'unscheduled' && 'bg-transparent border-border-line/30')}>{value}</div>;
}

function TrackingRow({ label, days, renderCell }: { label: string; days: Date[]; renderCell: (date: Date) => React.ReactNode }) {
  return <div className="grid grid-cols-[150px_repeat(30,20px)] gap-1 items-center min-w-[800px]"><div className="text-xs truncate pr-3" title={label}>{label}</div>{days.map(date => <React.Fragment key={formatDateOnly(date)}>{renderCell(date)}</React.Fragment>)}</div>;
}

function MonthlyCell({ actual, expected, detail }: { actual: number; expected: number; detail?: string }) {
  return <div className={cn('px-2 py-3 text-center font-mono', actual >= expected ? 'text-emerald-600' : actual > 0 ? 'text-amber-600' : 'text-text-dim')}><span>{actual}/{expected}</span>{detail && <span className="block text-[8px] text-text-dim mt-0.5">{detail}</span>}</div>;
}

function Legend({ labels }: { labels: [CellState, string][] }) {
  return <div className="flex flex-wrap gap-4 mt-4">{labels.map(([state, label]) => <div key={state} className="flex items-center gap-1.5 text-[9px] font-mono uppercase text-text-dim"><Cell state={state} title={label} /><span>{label}</span></div>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-text-dim border border-dashed border-border-line px-4 py-6 text-center">{text}</p>;
}
