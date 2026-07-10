import React, { useState } from 'react';
import { Calendar, BarChart3, CheckCircle2, BookOpen, X, Download } from 'lucide-react';
import { Config, AppTask, HistoryRecord, Intention, IntentionScale } from '../types';
import { cn } from '../lib/utils';
import CalendarioView from './CalendarioView';
import CalendarioSemanalView from './CalendarioSemanalView';
import ReportesView from './ReportesView';
import CompletadasView from './CompletadasView';
import PlanificarView from './PlanificarView';
import BalanceView from './BalanceView';
import { useToast } from './ToastProvider';
import { getCurrentPeriod, formatLocalDate } from '../domain/periodUtils';

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(dateStr);
};

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
  intentions: Intention[];
  onAddIntention: (intention: Omit<Intention, 'id'>) => void;
  onUpdateIntention: (id: string, updates: Partial<Intention>) => void;
  onDeleteIntention: (id: string) => void;
  onOpenIntentions: () => void;
  onToggleTask: (task: AppTask, overrideDuration?: number, overrideStartTime?: string, overrideEndTime?: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Partial<AppTask>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onUpdateConfig: (c: Partial<Config>) => void;
  onUpdateHistory: (id: string, updates: Partial<HistoryRecord>) => void;
  onDeleteHistory: (id: string) => void;
  onAddHistory: (record: Omit<HistoryRecord, 'id'>) => void;
}

export default function BitacoraView({
  config,
  tasks,
  history,
  intentions,
  onAddIntention,
  onUpdateIntention,
  onDeleteIntention,
  onOpenIntentions,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onUpdateTask,
  onUpdateConfig,
  onUpdateHistory,
  onDeleteHistory,
  onAddHistory,
}: Props) {
  const { showToast } = useToast();
  // Tabs: 'calendario' | 'planificar' | 'balance' | 'historial' | 'archivo'
  const [activeTab, setActiveTab] = useState<'calendario' | 'planificar' | 'balance' | 'historial' | 'archivo'>('calendario');
  const [activeScale, setActiveScale] = useState<IntentionScale | 'free'>('phase');
  const [cursorDate, setCursorDate] = useState<Date>(new Date());

  // Cycles archive states
  const [showAddHist, setShowAddHist] = useState(false);
  const [histStart, setHistStart] = useState('');
  const [histEnd, setHistEnd] = useState('');
  const [histIntensity, setHistIntensity] = useState<number>(2);

  const getCycleStats = () => {
    const flowLogs = config?.cycleConfig?.flowLogs || {};
    const allEntries = Object.entries(flowLogs)
      .filter(([dateStr]) => !isNaN(new Date(dateStr).getTime()))
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    const flowEntries = allEntries.filter(([_, intensity]) => intensity > 0)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
    if (flowEntries.length === 0) return null;
    
    // Group consecutive flow days into periods (gap >= 10 days = new cycle)
    interface PeriodGroup {
      startDate: string;
      endDate: string;
      days: { date: string; intensity: number }[];
    }
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

    interface CycleRecord {
      dateGroup: string;       // Start date YY-M.DD
      startDate: string;       // ISO YYYY-MM-DD
      periodLength: number;    // # of flow days
      lastFlowDay: string;     // Last day of flow
      cycleLength: number | null; // Days until next period start
      flowIntensities: number[]; // Daily intensity array for bar chart
      startDayOfWeek: string;
      lastDayOfWeek: string;
    }

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const cycles: CycleRecord[] = [];

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const startD = parseLocalDate(p.startDate);
      const endD = parseLocalDate(p.endDate);
      
      const periodLength = p.days.length;
      
      const intensities: number[] = [];
      const cursor = new Date(startD);
      while (cursor <= endD) {
        const yr = cursor.getFullYear();
        const mo = String(cursor.getMonth() + 1).padStart(2, '0');
        const dy = String(cursor.getDate()).padStart(2, '0');
        const curStr = `${yr}-${mo}-${dy}`;
        const entry = p.days.find(d => d.date === curStr);
        intensities.push(entry ? entry.intensity : 0);
        cursor.setDate(cursor.getDate() + 1);
      }

      let cycleLength: number | null = null;
      if (i < periods.length - 1) {
        const nextStart = parseLocalDate(periods[i + 1].startDate);
        cycleLength = Math.floor((nextStart.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
      }

      const yr = String(startD.getFullYear()).slice(2);
      const mo = startD.getMonth() + 1;
      const day = startD.getDate();

      cycles.push({
        dateGroup: `${yr}-${mo}.${day}`,
        startDate: p.startDate,
        periodLength,
        lastFlowDay: p.endDate,
        cycleLength,
        flowIntensities: intensities,
        startDayOfWeek: dayNames[startD.getDay()],
        lastDayOfWeek: dayNames[endD.getDay()]
      });
    }

    const periodLengths = cycles.map(c => c.periodLength);
    const completedCycleLengths = cycles.filter(c => c.cycleLength !== null).map(c => c.cycleLength!);

    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const mean = (arr: number[]) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      cycles: cycles.reverse(), // newest first
      stats: {
        medianPeriodLength: median(periodLengths),
        meanPeriodLength: mean(periodLengths),
        medianCycleLength: median(completedCycleLengths),
        meanCycleLength: mean(completedCycleLengths),
      },
      totalCycles: periods.length,
    };
  };

  const cycleStats = getCycleStats();

  const handleAddHistoricalCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!histStart || !histEnd) return;
    const start = parseLocalDate(histStart);
    const end = parseLocalDate(histEnd);
    if (start > end) {
      showToast("La fecha de inicio debe ser anterior o igual a la fecha de fin.", "warning");
      return;
    }

    const newFlowLogs = { ...(config?.cycleConfig?.flowLogs || {}) };
    const cursor = new Date(start);
    while (cursor <= end) {
      const yr = cursor.getFullYear();
      const mo = String(cursor.getMonth() + 1).padStart(2, '0');
      const dy = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${yr}-${mo}-${dy}`;
      newFlowLogs[dateStr] = histIntensity;
      cursor.setDate(cursor.getDate() + 1);
    }

    onUpdateConfig({
      cycleConfig: {
        ...config?.cycleConfig,
        flowLogs: newFlowLogs
      }
    });

    showToast("Ciclo histórico registrado correctamente.", "success");
    setHistStart('');
    setHistEnd('');
    setShowAddHist(false);
  };

  const handleDeleteCycleGroup = (startDate: string, endDate: string) => {
    if (window.confirm(`¿Estás segura de que deseas eliminar este ciclo registrado (${startDate} al ${endDate}) del historial?`)) {
      const newFlowLogs = { ...(config?.cycleConfig?.flowLogs || {}) };
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        const yr = cursor.getFullYear();
        const mo = String(cursor.getMonth() + 1).padStart(2, '0');
        const dy = String(cursor.getDate()).padStart(2, '0');
        const dateStr = `${yr}-${mo}-${dy}`;
        delete newFlowLogs[dateStr];
        cursor.setDate(cursor.getDate() + 1);
      }

      onUpdateConfig({
        cycleConfig: {
          ...config?.cycleConfig,
          flowLogs: newFlowLogs
        }
      });
      showToast("Ciclo eliminado del historial.", "info");
    }
  };

  const handleDownloadCSV = () => {
    const flowLogs = config?.cycleConfig?.flowLogs || {};
    const allEntries = Object.entries(flowLogs)
      .filter(([dateStr]) => !isNaN(new Date(dateStr).getTime()))
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    const flowEntries = allEntries.filter(([_, intensity]) => intensity > 0)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
    if (flowEntries.length === 0) {
      showToast("No hay registros de ciclo para exportar.", "warning");
      return;
    }

    interface PeriodGroup {
      startDate: string;
      endDate: string;
      intensities: number[];
    }
    const periods: PeriodGroup[] = [];
    let currentGroup: PeriodGroup | null = null;
    
    flowEntries.forEach(([dateStr, intensity]) => {
      if (!currentGroup) {
        currentGroup = { startDate: dateStr, endDate: dateStr, intensities: [intensity] };
      } else {
        const lastDay = parseLocalDate(currentGroup.endDate);
        const thisDay = parseLocalDate(dateStr);
        const diffDays = Math.floor((thisDay.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 10) {
          periods.push(currentGroup);
          currentGroup = { startDate: dateStr, endDate: dateStr, intensities: [intensity] };
        } else {
          currentGroup.endDate = dateStr;
          currentGroup.intensities.push(intensity);
        }
      }
    });
    if (currentGroup) periods.push(currentGroup);

    // Build CSV content
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Spanish compatibility
    csvContent += "Registro #,Fecha Inicio,Fecha Fin,Días de Sangrado,Intervalo Ciclo (días),Intensidad Flujo Promedio\n";
    
    const intensityNames = ["N/A", "Ligero", "Moderado", "Abundante"];

    periods.forEach((p, idx) => {
      const startD = parseLocalDate(p.startDate);
      const periodLength = p.intensities.length;
      
      let cycleLengthStr = "—";
      if (idx < periods.length - 1) {
        const nextStart = parseLocalDate(periods[idx + 1].startDate);
        const cycleLength = Math.floor((nextStart.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
        cycleLengthStr = `${cycleLength}`;
      }

      const avgIntensityVal = Math.round(p.intensities.reduce((a, b) => a + b, 0) / p.intensities.length);
      const intensityStr = intensityNames[avgIntensityVal] || "Moderado";
      
      const rowNum = idx + 1;
      csvContent += `${rowNum},${p.startDate},${p.endDate},${periodLength},${cycleLengthStr},${intensityStr}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_ciclos_ciclica_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPrevPeriodInPast = () => {
    if (activeScale === 'free') return false;
    const currentPeriod = getCurrentPeriod(activeScale, config, cursorDate);
    const startObj = parseLocalDate(currentPeriod.start);
    startObj.setDate(startObj.getDate() - 1);
    const prevPeriod = getCurrentPeriod(activeScale, config, startObj);
    const prevEnd = parseLocalDate(prevPeriod.end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prevEnd < today;
  };

  const handlePrevPeriod = () => {
    if (activeScale === 'free') return; // Rango libre no tiene prev/next definido aún
    if (activeTab === 'planificar' && isPrevPeriodInPast()) {
      return; // Bloqueado
    }
    const currentPeriod = getCurrentPeriod(activeScale, config, cursorDate);
    const startObj = parseLocalDate(currentPeriod.start);
    startObj.setDate(startObj.getDate() - 1);
    setCursorDate(startObj);
  };

  const handleNextPeriod = () => {
    if (activeScale === 'free') return;
    const currentPeriod = getCurrentPeriod(activeScale, config, cursorDate);
    const endObj = parseLocalDate(currentPeriod.end);
    endObj.setDate(endObj.getDate() + 1);
    setCursorDate(endObj);
  };

  const currentPeriod = activeScale === 'free' 
    ? { start: '', end: '', label: 'Todo el tiempo' } // TODO: Implementar rango libre real
    : getCurrentPeriod(activeScale, config, cursorDate);

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base text-left">
      {/* Upper Navigation Tabs Bar */}
      <div className="p-6 md:p-10 relative">
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 mb-6">
          <h1 className="text-title leading-none flex items-center gap-3 shrink-0">
            <BookOpen className="w-6 h-6 text-text-main" /> Bitácora
          </h1>
          <p className="text-sm text-text-dim md:text-right leading-relaxed max-w-xl">
            Planifica tus intenciones, evalúa tu balance y consulta tu historial de ciclos, hábitos y tareas.
          </p>
        </div>

        {/* Top Tabs */}
        <div className="flex flex-wrap gap-6 font-sans text-xs uppercase tracking-widest font-light bg-transparent">
          {[
            { id: 'planificar', label: 'Planificar', icon: <Calendar className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
            { id: 'balance', label: 'Balance', icon: <BarChart3 className="w-3.5 h-3.5 silhouette-icon text-text-main" /> },
            { id: 'historial', label: 'Historial', icon: <BookOpen className="w-3.5 h-3.5 silhouette-icon text-text-main" /> }
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  if (t.id === 'planificar' && activeScale === 'free') {
                    setActiveScale('phase');
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer bg-transparent border-0 outline-none transition-colors pb-1",
                  isActive 
                    ? "text-primary border-b border-primary" 
                    : "text-text-dim hover:text-text-main"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

        {/* Sub-Header: Scale Selector & Period Navigator */}
        {(activeTab === 'planificar' || activeTab === 'balance') && (
          <div className="flex flex-col items-center gap-4 py-6 border-b border-border-line/20 px-6 md:px-10">
            {/* Unified Scale Selector as separate pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {(['phase', 'cycle', 'quarter', 'year', 'free'] as const).map(s => {
                if (s === 'free' && activeTab === 'planificar') return null;
                const labels: Record<string, string> = { phase: 'Fase', cycle: 'Ciclo', quarter: 'Cuarto', year: 'Año', free: 'Libre' };
                const isActive = activeScale === s;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveScale(s)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-sans uppercase tracking-widest rounded-full transition-all border cursor-pointer",
                      isActive
                        ? "bg-text-main text-[var(--base-bg)] border-text-main font-light"
                        : "bg-base border-border-line text-text-dim hover:text-text-main"
                    )}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            {/* Centered Date Selector styled like the period label indicator */}
            {activeScale !== 'free' && (
              <div className="flex items-center justify-center gap-4 w-full max-w-lg">
                <button 
                  onClick={handlePrevPeriod} 
                  disabled={activeTab === 'planificar' && isPrevPeriodInPast()}
                  className="p-2 hover:text-text-main text-text-dim transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-0 bg-transparent"
                >
                  ◀
                </button>
                
                <div className="flex-1 text-center font-sans text-xs uppercase tracking-widest text-text-main font-light relative group py-2.5 border-y border-border-line/30" title="Haz click para seleccionar una fecha específica">
                  {currentPeriod.label}
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    value={formatLocalDate(cursorDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                         const newDate = parseLocalDate(e.target.value);
                         if (activeTab === 'planificar') {
                           const today = new Date();
                           today.setHours(0, 0, 0, 0);
                           const newPeriod = getCurrentPeriod(activeScale, config, newDate);
                           if (parseLocalDate(newPeriod.end) < today) {
                             showToast("No puedes planificar períodos pasados.", 'error');
                             return;
                           }
                         }
                         setCursorDate(newDate);
                      }
                    }}
                  />
                </div>
                
                <button onClick={handleNextPeriod} className="p-2 hover:text-text-main text-text-dim transition-colors cursor-pointer border-0 bg-transparent">▶</button>
                <button onClick={() => setCursorDate(new Date())} className="text-[10px] font-sans uppercase tracking-widest text-text-dim hover:text-text-main transition-colors cursor-pointer border-0 bg-transparent pl-2">Hoy</button>
              </div>
            )}
          </div>
        )}

      {/* Render Active Sub-View */}
      <div className="flex-grow w-full">
        {activeTab === 'calendario' && (
          <div className="animate-in fade-in duration-200 h-full p-6 md:p-10 w-full flex flex-col">
            <CalendarioSemanalView
              config={config}
              tasks={tasks}
              onUpdateTask={onUpdateTask}
            />
          </div>
        )}

        {activeTab === 'planificar' && activeScale !== 'free' && (
          <div className="animate-in fade-in duration-200 p-6 md:p-10 max-w-4xl mx-auto text-left">
            <PlanificarView
              scale={activeScale}
              intentions={intentions}
              tasks={tasks}
              history={history}
              config={config}
              periodStart={currentPeriod.start}
              periodEnd={currentPeriod.end}
              periodLabel={currentPeriod.label}
              onAddIntention={onAddIntention}
              onUpdateIntention={onUpdateIntention}
              onDeleteIntention={onDeleteIntention}
              onUpdateTask={onUpdateTask}
            />
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="animate-in fade-in duration-200">
            <BalanceView
              scale={activeScale}
              intentions={intentions}
              tasks={tasks}
              history={history}
              config={config}
              periodStart={currentPeriod.start}
              periodEnd={currentPeriod.end}
            />
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="animate-in fade-in duration-200 p-6 md:p-10 max-w-4xl mx-auto">
            {/* Temporarily rendering CompletadasView inline until HistorialView is done */}
            <div className="mb-8">
              <h2 className="text-title mb-4 border-b border-border-line pb-2">Completadas</h2>
              <CompletadasView
                config={config}
                tasks={tasks}
                history={history}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
                onUpdateTask={onUpdateTask}
                onAddTask={onAddTask}
                onUpdateHistory={onUpdateHistory}
                onDeleteHistory={onDeleteHistory}
                onAddHistory={onAddHistory}
              />
            </div>
            
            <div className="mb-8">
              <h2 className="text-title mb-4 border-b border-border-line pb-2">Heatmap (Calendario Histórico)</h2>
              <CalendarioView
                config={config}
                tasks={tasks}
                history={history}
              />
            </div>
          </div>
        )}

        {activeTab === 'archivo' && config?.cycleConfig?.menstruates !== false && (
          <div className="animate-in fade-in duration-200 p-6 md:p-10 max-w-4xl mx-auto w-full text-left space-y-6">
            
            {/* Header + Stats of historical cycles */}
            {cycleStats ? (
              <div className="space-y-6">
                {/* Download CSV & Stats Title bar */}
                <div className="flex justify-between items-center border-b border-border-line pb-4">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                    📜 ARCHIVO DE REGISTROS MENSTRUALES PREVIOS
                  </h3>
                  
                  <button
                    onClick={handleDownloadCSV}
                    className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-text-main hover:underline cursor-pointer bg-transparent border border-primary px-3 py-1 rounded-none flex items-center gap-1.5"
                    title="Exportar base de datos a Excel/CSV"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar Reporte CSV
                  </button>
                </div>

                {/* Two-column layout: Prediction State (Left) and Summary Stats (Right) */}
                {(() => {
                  const lastCycle = cycleStats.cycles[0];
                  const cycleLength = cycleStats.stats.medianCycleLength || config?.cycleConfig?.cycleLengthDays || 28;
                  const periodLength = cycleStats.stats.medianPeriodLength || config?.cycleConfig?.periodLengthDays || 5;

                  let currentCycleDay = 1;
                  let daysUntilPeriod = 0;
                  let expectedPeriodStartDate = new Date();
                  let expectedPeriodEndDate = new Date();
                  let expectedFertileStartDate = new Date();
                  let expectedFertileEndDate = new Date();
                  let daysUntilFertile = 0;

                  const formatDateBrief = (d: Date) => {
                    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                    return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
                  };

                  if (lastCycle) {
                    const lastStart = parseLocalDate(lastCycle.startDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    lastStart.setHours(0, 0, 0, 0);

                    const diffDays = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
                    currentCycleDay = diffDays + 1;

                    // Expected next period starts cycleLength days after lastStart
                    expectedPeriodStartDate = new Date(lastStart.getTime());
                    expectedPeriodStartDate.setDate(lastStart.getDate() + cycleLength);

                    expectedPeriodEndDate = new Date(expectedPeriodStartDate.getTime());
                    expectedPeriodEndDate.setDate(expectedPeriodStartDate.getDate() + periodLength - 1);

                    const diffPeriodMs = expectedPeriodStartDate.getTime() - today.getTime();
                    daysUntilPeriod = Math.ceil(diffPeriodMs / (1000 * 60 * 60 * 24));

                    // Fertile window typically starts cycleLength - 19 days after lastStart
                    expectedFertileStartDate = new Date(lastStart.getTime());
                    expectedFertileStartDate.setDate(lastStart.getDate() + cycleLength - 19);

                    expectedFertileEndDate = new Date(lastStart.getTime());
                    expectedFertileEndDate.setDate(lastStart.getDate() + cycleLength - 14);

                    const diffFertileMs = expectedFertileStartDate.getTime() - today.getTime();
                    daysUntilFertile = Math.ceil(diffFertileMs / (1000 * 60 * 60 * 24));
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Estado del Ciclo Activo */}
                      <div className="border border-border-line rounded-none p-5 flex flex-col justify-between bg-transparent space-y-4 text-left">
                        <div className="border-b border-border-line/60 pb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim block">Estado del Ciclo Activo</span>
                          <h4 className="text-sm font-light text-text-main font-sans mt-1">
                            Hoy es el <span className="text-primary font-mono font-bold">Día {currentCycleDay}</span> de tu ciclo
                          </h4>
                          <p className="text-[11px] text-text-dim mt-1 font-mono">
                            {daysUntilPeriod < 0 ? (
                              `⚠️ El periodo se esperaba hace ${Math.abs(daysUntilPeriod)} días`
                            ) : (
                              `El periodo se espera en ${daysUntilPeriod} días`
                            )}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* Next Period Row */}
                          <div className="bg-[#e07a5f]/5 border border-[#e07a5f]/20 p-3 rounded-none flex items-center justify-between text-xs">
                            <div className="flex flex-col text-left">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#e07a5f] font-bold">Próximo Periodo</span>
                              <span className="text-text-main font-bold mt-1 text-[11px] font-mono">
                                {formatDateBrief(expectedPeriodStartDate)} — {formatDateBrief(expectedPeriodEndDate)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-[#e07a5f] block text-[11px]">
                                {daysUntilPeriod < 0 ? `${daysUntilPeriod} días` : `En ${daysUntilPeriod} días`}
                              </span>
                              <span className="text-[9px] font-mono text-text-dim block uppercase">Ciclo #{cycleStats.totalCycles + 1}</span>
                            </div>
                          </div>

                          {/* Next Fertile Row */}
                          {daysUntilFertile < 0 ? (
                            <div className="bg-base-dim/10 border border-border-line/30 p-3 rounded-none flex items-center justify-between text-xs opacity-75">
                              <div className="flex flex-col text-left">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-text-dim font-bold">Próxima Ventana Fértil</span>
                                <span className="text-text-dim font-bold mt-1 text-[11px] font-mono">
                                  Pendiente de nuevo periodo
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-text-dim block text-[11px]">
                                  —
                                </span>
                                <span className="text-[9px] font-mono text-text-dim block uppercase">Inactiva</span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#81b29a]/5 border border-[#81b29a]/20 p-3 rounded-none flex items-center justify-between text-xs">
                              <div className="flex flex-col text-left">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-[#81b29a] font-bold">Próxima Ventana Fértil</span>
                                <span className="text-text-main font-bold mt-1 text-[11px] font-mono">
                                  {formatDateBrief(expectedFertileStartDate)} — {formatDateBrief(expectedFertileEndDate)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-[#81b29a] block text-[11px]">
                                  En {daysUntilFertile} días
                                </span>
                                <span className="text-[9px] font-mono text-text-dim block uppercase">Estimada</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Summary Stats */}
                      <div className="border border-border-line rounded-none p-5 bg-transparent flex flex-col justify-between space-y-4 text-left">
                        <div className="border-b border-border-line/60 pb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim block">Estadísticas de Resumen</span>
                          <h4 className="text-sm font-light text-text-main font-sans mt-1">
                            Métricas de calibración histórica
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: 'Mediana Periodo', value: cycleStats.stats.medianPeriodLength, unit: 'días' },
                            { label: 'Media Periodo', value: cycleStats.stats.meanPeriodLength, unit: 'días' },
                            { label: 'Mediana Ciclo', value: cycleStats.stats.medianCycleLength, unit: 'días' },
                            { label: 'Media Ciclo', value: cycleStats.stats.meanCycleLength, unit: 'días' },
                          ].map((s, i) => (
                            <div key={i} className="p-3 border border-border-line/40 flex flex-col gap-1 text-left bg-base-dim/5">
                              <span className="text-[9px] font-mono uppercase tracking-widest text-text-dim leading-tight">{s.label}</span>
                              <span className="text-xl font-light text-text-main font-mono leading-none mt-1">
                                {s.value !== null ? (Number.isInteger(s.value) ? s.value : s.value.toFixed(1)) : '—'}
                                {s.value !== null && <span className="text-[10px] text-text-dim font-normal ml-0.5">{s.unit}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Trigger and Log Form */}
                <div className="pt-2">
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={() => setShowAddHist(!showAddHist)}
                      className="text-[10px] font-mono uppercase tracking-wider text-primary hover:text-text-main hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
                    >
                      {showAddHist ? '✕ Cancelar Registro' : '＋ Registrar Ciclo Pasado'}
                    </button>
                  </div>

                  {showAddHist && (
                    <form onSubmit={handleAddHistoricalCycle} className="mb-6 border border-border-line p-6 rounded-none animate-in slide-in-from-top-2 duration-300 flex flex-col gap-4 text-left">
                      <h4 className="text-[10px] font-mono tracking-widest text-text-main font-bold uppercase">Registrar Periodo Histórico Pasado</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Fecha de Inicio (Día 1 / Sangrado)</label>
                          <input
                            type="date"
                            className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono"
                            value={histStart}
                            onChange={e => setHistStart(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Fecha de Fin (Último Día)</label>
                          <input
                            type="date"
                            className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono"
                            value={histEnd}
                            onChange={e => setHistEnd(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Flujo Promedio</label>
                          <select
                            className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono cursor-pointer"
                            value={histIntensity}
                            onChange={e => setHistIntensity(Number(e.target.value))}
                          >
                            <option value={1}>🩸 Ligero</option>
                            <option value={2}>🩸🩸 Moderado</option>
                            <option value={3}>🩸🩸🩸 Abundante</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <button type="submit" className="text-[10px] font-mono uppercase tracking-wider font-bold text-text-main hover:underline cursor-pointer bg-transparent border-0 outline-none">
                          Guardar Ciclo Histórico ➔
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Previous Cycles Table - Responsive with standard scrolling container */}
                  <div className="border border-border-line rounded-none overflow-hidden mb-8">
                    <div className="w-full overflow-x-auto scrollbar-thin">
                      <table className="w-full text-xs font-mono border-collapse text-left min-w-[600px]">
                        <thead>
                          <tr className="bg-transparent border-b border-border-line">
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold w-12">#</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold">Inicio</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-center w-20">Días</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold">Fin</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-center w-20">Ciclo</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold min-w-[80px]">Flujo</th>
                            <th className="py-3 px-4 text-text-dim uppercase tracking-widest font-bold text-center w-12">✕</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cycleStats.cycles.map((c, i) => {
                            const rowNum = cycleStats.cycles.length - i;
                            const fmtDate = (iso: string) => {
                              const parts = iso.split('-');
                              if (parts.length === 3) {
                                const yr = parts[0].slice(2);
                                const mo = parseInt(parts[1], 10);
                                const dy = parseInt(parts[2], 10);
                                return `${dy}/${mo}/${yr}`;
                              }
                              return iso;
                            };
                            return (
                              <tr key={i} className="border-b border-border-line/30 last:border-0 hover:bg-base-dim/5 transition-colors">
                                <td className="py-3 px-4 text-text-dim">{rowNum}</td>
                                <td className="py-3 px-4 text-text-main font-bold">
                                  <span>{fmtDate(c.startDate)}</span>
                                  <span className="text-text-dim font-normal ml-2 text-[10px]">{c.startDayOfWeek}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={cn(
                                    "inline-block font-bold text-[11px]",
                                    c.periodLength <= 3 ? "text-[#81b29a]" :
                                    c.periodLength <= 5 ? "text-[#73c2b8]" :
                                    c.periodLength <= 7 ? "text-[#e07a5f]" : "text-[#d4af37]"
                                  )}>
                                    {c.periodLength}d
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-text-main">
                                  <span>{fmtDate(c.lastFlowDay)}</span>
                                  <span className="text-text-dim ml-2 text-[10px]">{c.lastDayOfWeek}</span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-text-main">
                                  {c.cycleLength !== null ? `${c.cycleLength}d` : <span className="text-text-dim font-normal">···</span>}
                                </td>
                                <td className="py-3 px-4">
                                  <svg 
                                    width={Math.max(c.flowIntensities.length * 9, 24)} 
                                    height="18" 
                                    viewBox={`0 0 ${Math.max(c.flowIntensities.length * 9, 24)} 18`}
                                    className="block"
                                  >
                                    {c.flowIntensities.map((intensity, idx) => {
                                      const barHeight = intensity === 0 ? 2 : (intensity / 3) * 16;
                                      const colors = ['#d1d5db', '#81b29a', '#e07a5f', '#d4af37'];
                                      return (
                                        <rect
                                          key={idx}
                                          x={idx * 9}
                                          y={18 - barHeight}
                                          width={6}
                                          height={barHeight}
                                          rx={0}
                                          fill={colors[intensity] || colors[0]}
                                          opacity={intensity === 0 ? 0.2 : 0.85}
                                        />
                                      );
                                    })}
                                  </svg>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => handleDeleteCycleGroup(c.startDate, c.lastFlowDay)}
                                    className="text-text-dim hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0 outline-none p-1"
                                    title="Eliminar este ciclo del historial"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Archivo state empty form */
              <div className="text-center p-8 border border-border-line rounded-none bg-transparent animate-in fade-in duration-300 flex flex-col gap-6 items-center">
                <div className="space-y-2">
                  <span className="text-4xl block">🩸</span>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-main font-bold">Sin Historial de Ciclos</h3>
                  <p className="text-xs text-text-dim max-w-md mx-auto leading-relaxed">
                    Aún no has registrado flujo o ciclos en este navegador. Agrega tu primer ciclo histórico para inicializar las predicciones y calibrar automáticamente tus duraciones.
                  </p>
                </div>
                
                <form onSubmit={handleAddHistoricalCycle} className="w-full max-w-2xl border border-border-line p-6 rounded-none flex flex-col gap-4 text-left bg-transparent">
                  <h4 className="text-[10px] font-mono tracking-widest text-text-main font-bold uppercase">Registrar Primer Ciclo Histórico</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Fecha de Inicio (Día 1 / Sangrado)</label>
                      <input
                        type="date"
                        className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono"
                        value={histStart}
                        onChange={e => setHistStart(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Fecha de Fin (Último Día)</label>
                      <input
                        type="date"
                        className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono"
                        value={histEnd}
                        onChange={e => setHistEnd(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-text-dim h-12 flex items-end mb-1">Flujo Promedio</label>
                      <select
                        className="h-9 w-full bg-transparent border-b border-border-line focus:border-[var(--color-text-main)] py-2 text-xs outline-none text-text-main font-mono cursor-pointer"
                        value={histIntensity}
                        onChange={e => setHistIntensity(Number(e.target.value))}
                      >
                        <option value={1}>🩸 Ligero</option>
                        <option value={2}>🩸🩸 Moderado</option>
                        <option value={3}>🩸🩸🩸 Abundante</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="submit" className="text-[10px] font-mono uppercase tracking-wider font-bold text-text-main hover:underline cursor-pointer bg-transparent border-0 outline-none">
                      Guardar y Activar Predictivo ➔
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
