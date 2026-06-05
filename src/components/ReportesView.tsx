import React, { useState, useMemo } from 'react';
import { AppTask, Config, HistoryRecord } from '../types';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  Repeat, 
  Compass, 
  Copy, 
  Check, 
  Activity, 
  Flame, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Award,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';

// Helper to find parent project of any task recursively
const getProjectForTask = (taskId: string, allTasks: AppTask[]): AppTask | null => {
  let current = allTasks.find(t => t.id === taskId);
  while (current) {
    if (current.type === 'Proyecto') {
      return current;
    }
    if (!current.parentId) break;
    current = allTasks.find(t => t.id === current.parentId);
  }
  return null;
};

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history: HistoryRecord[];
}

type PeriodType = 'hoy' | 'semana' | '7dias' | 'mes' | '30dias' | 'ciclo' | 'custom';

export default function ReportesView({ config, tasks, history }: Props) {
  const [period, setPeriod] = useState<PeriodType>('7dias');
  const [areaFilter, setAreaFilter] = useState('Todas');
  const [showOccupancy, setShowOccupancy] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  // Set default customizable dates to: start = 7 days ago, end = today
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().substring(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const [copied, setCopied] = useState(false);

  // 1. Calculate matching period start and end
  const periodRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'hoy': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'semana': {
        // Current Monday
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getTime());
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case '7dias': {
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'mes': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case '30dias': {
        start.setDate(now.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'ciclo': {
        if (config?.cycleConfig?.lastCycleStartDate) {
          start = new Date(config.cycleConfig.lastCycleStartDate);
        } else {
          // fallback to last 28 days
          start.setDate(now.getDate() - 27);
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'custom': {
        if (customStart) {
          start = new Date(customStart + 'T00:00:00');
        } else {
          start.setDate(now.getDate() - 6);
          start.setHours(0, 0, 0, 0);
        }
        if (customEnd) {
          end = new Date(customEnd + 'T23:59:59.999');
        } else {
          end.setHours(23, 59, 59, 999);
        }
        break;
      }
    }
    return { start, end };
  }, [period, customStart, customEnd, config]);

  // 2. Filter history items in selected range by date
  const filteredHistoryByDate = useMemo(() => {
    const { start, end } = periodRange;
    return history.filter(h => {
      const recordDate = new Date(h.date);
      return recordDate >= start && recordDate <= end;
    });
  }, [history, periodRange]);

  // Apply Area filter instantly to active history logs
  const filteredHistory = useMemo(() => {
    if (areaFilter === 'Todas') return filteredHistoryByDate;
    return filteredHistoryByDate.filter(h => {
      const task = tasks.find(t => t.id === h.taskId);
      return task && task.category === areaFilter;
    });
  }, [filteredHistoryByDate, tasks, areaFilter]);

  // Days in range for occupancy retrospective timeline
  const daysInRange = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(periodRange.start.getTime());
    const end = new Date(periodRange.end.getTime());
    
    // Limit to max 45 days for daily resolution in retrospective
    const maxDays = 45;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    let cursor = new Date(start);
    if (diff > maxDays) {
      cursor = new Date(end.getTime() - maxDays * 24 * 60 * 60 * 1000);
    }
    
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [periodRange]);

  interface OccupancyNode {
    id: string;
    text: string;
    type: string;
    area: string;
    totalHours: number;
    logsByDay: Record<string, number>;
    children: OccupancyNode[];
  }

  // Rows of activities that logged time in the period
  const occupancyRows = useMemo(() => {
    const projectNodes: Record<string, OccupancyNode> = {};
    const standaloneNodes: Record<string, OccupancyNode> = {};

    filteredHistory.forEach(h => {
      const dayKey = new Date(h.date).toISOString().substring(0, 10);
      const originalTask = tasks.find(t => t.id === h.taskId);
      const projectTask = originalTask ? getProjectForTask(originalTask.id, tasks) : null;
      const duration = h.duration || 0;

      if (projectTask) {
        // It's part of a project! Group under project node.
        if (!projectNodes[projectTask.id]) {
          projectNodes[projectTask.id] = {
            id: projectTask.id,
            text: projectTask.text,
            type: 'Proyecto',
            area: projectTask.category || 'Sin Área',
            totalHours: 0,
            logsByDay: {},
            children: []
          };
        }

        projectNodes[projectTask.id].totalHours += duration;
        projectNodes[projectTask.id].logsByDay[dayKey] = (projectNodes[projectTask.id].logsByDay[dayKey] || 0) + duration;

        if (originalTask && originalTask.id !== projectTask.id) {
          let childNode = projectNodes[projectTask.id].children.find(c => c.id === originalTask.id);
          if (!childNode) {
            childNode = {
              id: originalTask.id,
              text: originalTask.text,
              type: originalTask.type,
              area: originalTask.category || projectTask.category || 'Sin Área',
              totalHours: 0,
              logsByDay: {},
              children: []
            };
            projectNodes[projectTask.id].children.push(childNode);
          }
          childNode.totalHours += duration;
          childNode.logsByDay[dayKey] = (childNode.logsByDay[dayKey] || 0) + duration;
        }
      } else {
        // Standalone item
        const taskId = originalTask ? originalTask.id : h.taskId;
        const text = originalTask ? originalTask.text : '(Elemento Eliminado)';
        const type = originalTask ? originalTask.type : 'Tarea';
        const area = originalTask ? (originalTask.category || 'Sin Área') : 'Sin Área';

        if (!standaloneNodes[taskId]) {
          standaloneNodes[taskId] = {
            id: taskId,
            text,
            type,
            area,
            totalHours: 0,
            logsByDay: {},
            children: []
          };
        }
        standaloneNodes[taskId].totalHours += duration;
        standaloneNodes[taskId].logsByDay[dayKey] = (standaloneNodes[taskId].logsByDay[dayKey] || 0) + duration;
      }
    });

    const sortedProjects = Object.values(projectNodes).map(p => {
      p.children.sort((a, b) => b.totalHours - a.totalHours);
      return p;
    }).sort((a, b) => b.totalHours - a.totalHours);

    const sortedStandalone = Object.values(standaloneNodes).sort((a, b) => b.totalHours - a.totalHours);

    return [...sortedProjects, ...sortedStandalone];
  }, [filteredHistory, tasks]);

  // Flatten the hierarchy to visible rows based on project expand/collapse state
  const visibleOccupancyRows = useMemo(() => {
    const rows: { node: OccupancyNode; isChild: boolean; parentId?: string }[] = [];
    occupancyRows.forEach(projNode => {
      rows.push({ node: projNode, isChild: false });
      if (projNode.type === 'Proyecto' && expandedProjects[projNode.id]) {
        projNode.children.forEach(child => {
          rows.push({ node: child, isChild: true, parentId: projNode.id });
        });
      }
    });
    return rows;
  }, [occupancyRows, expandedProjects]);

  interface StatsResult {
    totalHours: number;
    historyCount: number;
    activeDays: number;
    totalRangeDays: number;
    dailyAverage: number;
    primaryArea: string;
    topTask: string;
    maxTaskCount: number;
    areaHours: Record<string, number>;
    areaCounts: Record<string, number>;
    typeHours: Record<string, number>;
    typeCounts: Record<string, number>;
    dailySeries: { dateLabel: string; rawDate: Date; hours: number; count: number }[];
  }

  // 3. Dynamic metrics & stats calculation
  const stats = useMemo<StatsResult>(() => {
    let totalDuration = 0;
    const historyCount = filteredHistory.filter(h => {
      const originalTask = tasks.find(t => t.id === h.taskId);
      const projectTask = originalTask ? getProjectForTask(originalTask.id, tasks) : null;
      const task = projectTask || originalTask;
      return task ? (task.type === 'Tarea' || task.type === 'Proyecto') : false;
    }).length;
    
    // Group durations & counts by task and area/category
    const areaHours: Record<string, number> = {};
    const areaCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {
      'Tarea': 0,
      'Hábito': 0,
      'Rutina': 0,
      'Proyecto': 0,
      'Pulso': 0
    };
    const typeHours: Record<string, number> = {
      'Tarea': 0,
      'Hábito': 0,
      'Rutina': 0,
      'Proyecto': 0,
      'Pulso': 0
    };

    // Keep track of distinct active days inside the selected range
    const activeDaysSet = new Set<string>();

    filteredHistory.forEach(h => {
      const duration = h.duration || 0;
      totalDuration += duration;

      // Track active days
      const localDateStr = new Date(h.date).toLocaleDateString('es-ES');
      activeDaysSet.add(localDateStr);

      const originalTask = tasks.find(t => t.id === h.taskId);
      const projectTask = originalTask ? getProjectForTask(originalTask.id, tasks) : null;
      const task = projectTask || originalTask;
      const effectiveType = projectTask ? 'Proyecto' : (originalTask ? originalTask.type : 'Tarea');

      if (task) {
        // Area
        const area = task.category || 'Sin Área';
        areaHours[area] = (areaHours[area] || 0) + duration;
        areaCounts[area] = (areaCounts[area] || 0) + 1;

        // Task name
        taskCounts[task.text] = (taskCounts[task.text] || 0) + 1;

        // Type
        if (effectiveType in typeCounts) {
          typeCounts[effectiveType] += 1;
          typeHours[effectiveType] += duration;
        }
      } else {
        areaHours['Sin Área'] = (areaHours['Sin Área'] || 0) + duration;
        areaCounts['Sin Área'] = (areaCounts['Sin Área'] || 0) + 1;
        taskCounts['(Elemento Eliminado)'] = (taskCounts['(Elemento Eliminado)'] || 0) + 1;
      }
    });

    // Find top area
    let primaryArea = 'Sin Área';
    let maxAreaLevel = 0;
    Object.entries(areaHours).forEach(([area, hrs]) => {
      if (hrs > maxAreaLevel) {
        maxAreaLevel = hrs;
        primaryArea = area;
      }
    });

    // Find top task or habit
    let topTask = 'Ninguno';
    let maxTaskCount = 0;
    Object.entries(taskCounts).forEach(([text, count]) => {
      if (count > maxTaskCount) {
        maxTaskCount = count;
        topTask = text;
      }
    });

    // Calculate total layout days in the range to calculate true averages
    const diffMs = periodRange.end.getTime() - periodRange.start.getTime();
    const rangeDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Generate daily chart series (e.g. up to last 14 days, or daily keys)
    const dailySeries: { dateLabel: string; rawDate: Date; hours: number; count: number }[] = [];
    const dateCursor = new Date(periodRange.start.getTime());
    
    // We limit active chart columns to 15 to keep visuals incredibly readable, 
    // or group them if range is larger or just show the active calendar days.
    // If range is between 1 and 14 days, show each day!
    // If range is wider, we show the last 14 days of the selection or group.
    if (rangeDays <= 15) {
      while (dateCursor <= periodRange.end) {
        const cursorStr = dateCursor.toLocaleDateString('es-ES');
        const dayLabel = dateCursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        
        let dayHours = 0;
        let dayCount = 0;
        
        filteredHistory.forEach(h => {
          const recD = new Date(h.date);
          if (recD.toLocaleDateString('es-ES') === cursorStr) {
            dayHours += h.duration || 0;
            dayCount += 1;
          }
        });

        dailySeries.push({
          dateLabel: dayLabel,
          rawDate: new Date(dateCursor.getTime()),
          hours: Math.round(dayHours * 10) / 10,
          count: dayCount
        });

        dateCursor.setDate(dateCursor.getDate() + 1);
      }
    } else {
      // Show top 10 most active days, sorted chronologically, or show weekly aggregations
      // Let's build a timeline of the last 12 days in the range or show active dates directly.
      // A weekly view, or simply the last 12 chronological days that have actual logged hours!
      const mapDays: Record<string, { label: string; raw: Date; hours: number; count: number }> = {};
      
      // Initialize with active days plus some key intervals
      filteredHistory.forEach(h => {
        const recD = new Date(h.date);
        const cursorStr = recD.toLocaleDateString('es-ES');
        const dayLabel = recD.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        
        if (!mapDays[cursorStr]) {
          mapDays[cursorStr] = {
            label: dayLabel,
            raw: recD,
            hours: 0,
            count: 0
          };
        }
        mapDays[cursorStr].hours += h.duration || 0;
        mapDays[cursorStr].count += 1;
      });

      const items = Object.values(mapDays)
        .sort((a, b) => a.raw.getTime() - b.raw.getTime())
        .slice(-12); // Limit to last 12 active days for gorgeous horizontal fit
      
      items.forEach(it => {
        dailySeries.push({
          dateLabel: it.label,
          rawDate: it.raw,
          hours: Math.round(it.hours * 10) / 10,
          count: it.count
        });
      });
    }

    return {
      totalHours: Math.round(totalDuration * 100) / 100,
      historyCount,
      activeDays: activeDaysSet.size,
      totalRangeDays: rangeDays,
      dailyAverage: Math.round((totalDuration / rangeDays) * 100) / 100,
      primaryArea,
      topTask,
      maxTaskCount,
      areaHours,
      areaCounts,
      typeHours,
      typeCounts,
      dailySeries
    };
  }, [filteredHistory, tasks, periodRange]);

  // Handle Copy Raw Text Report to clipboard
  const handleCopyReport = () => {
    const rangeStr = `${periodRange.start.toLocaleDateString('es-ES')} - ${periodRange.end.toLocaleDateString('es-ES')}`;
    let text = `📊 INFORME DE RENDIMIENTO Y PRODUCTIVIDAD — CÍCLICA
Intervalo: ${rangeStr}
--------------------------------------------------
📈 MÉTRICAS CLAVE:
• Horas Totales Invertidas: ${stats.totalHours} h
• Sesiones Completadas: ${stats.historyCount} sesiones
• Promedio Diario Real: ${stats.dailyAverage} h/día
• Días con Registro Activo: ${stats.activeDays} de ${stats.totalRangeDays} días 
• Macro Área de Enfoque Principal: ${stats.primaryArea}
• Elemento más frecuente: "${stats.topTask}" (${stats.maxTaskCount} veces)

💼 DISTRIBUCIÓN DE TIEMPO POR TIPO:
• Tareas Simples: ${stats.typeHours['Tarea'] || 0}h (${stats.typeCounts['Tarea'] || 0} veces)
• Rutinas: ${stats.typeHours['Rutina'] || 0}h (${stats.typeCounts['Rutina'] || 0} veces)
• Hábitos: ${stats.typeHours['Hábito'] || 0}h (${stats.typeCounts['Hábito'] || 0} veces)
• Proyectos: ${stats.typeHours['Proyecto'] || 0}h (${stats.typeCounts['Proyecto'] || 0} veces)
• Pulsos Diarios: ${stats.typeHours['Pulso'] || 0}h (${stats.typeCounts['Pulso'] || 0} veces)

🌐 ÁREAS DE ENFOQUE (Horas Acumuladas):`;

    (Object.entries(stats.areaHours) as [string, number][]).forEach(([area, hrs]) => {
      const count = stats.areaCounts[area] || 0;
      text += `\n• ${area}: ${hrs.toFixed(1)}h (${count} ejecuciones)`;
    });

    text += `\n\nGenerado de forma local y privada en el Sistema Integral de Gestión Operativa (Obsidian-Style Vault).`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const rangeStr = `${periodRange.start.toLocaleDateString('es-ES')} - ${periodRange.end.toLocaleDateString('es-ES')}`;
    let text = `# 📊 INFORME DE RENDIMIENTO Y PRODUCTIVIDAD — CÍCLICA
> **Intervalo:** ${rangeStr}
> **Generado:** ${new Date().toLocaleString('es-ES')}

## 📈 MÉTRICAS CLAVE
- **Horas Totales Invertidas:** ${stats.totalHours} h
- **Sesiones Completadas:** ${stats.historyCount} sesiones
- **Promedio Diario Real:** ${stats.dailyAverage} h/día
- **Días con Registro Activo:** ${stats.activeDays} de ${stats.totalRangeDays} días 
- **Macro Área de Enfoque Principal:** ${stats.primaryArea}
- **Elemento más frecuente:** "${stats.topTask}" (${stats.maxTaskCount} veces)

## 💼 DISTRIBUCIÓN POR TIPO DE ELEMENTO
- **Tareas Simples:** ${stats.typeHours['Tarea'] || 0}h (${stats.typeCounts['Tarea'] || 0} veces)
- **Rutinas:** ${stats.typeHours['Rutina'] || 0}h (${stats.typeCounts['Rutina'] || 0} veces)
- **Hábitos:** ${stats.typeHours['Hábito'] || 0}h (${stats.typeCounts['Hábito'] || 0} veces)
- **Proyectos:** ${stats.typeHours['Proyecto'] || 0}h (${stats.typeCounts['Proyecto'] || 0} veces)
- **Pulsos Diarios (Cuantitativos):** ${stats.typeHours['Pulso'] || 0}h (${stats.typeCounts['Pulso'] || 0} veces)

## 🌐 ÁREAS DE ENFOQUE (Horas Acumuladas y Ejecuciones)`;

    Object.entries(stats.areaHours).forEach(([area, hrs]) => {
      const count = stats.areaCounts[area] || 0;
      text += `\n- **${area}:** ${(hrs as number).toFixed(1)}h (${count} ejecuciones)`;
    });

    text += `\n\n## 🗃️ CONSULTA DATAVIEW PARA OBSIDIAN
Copia y pega este bloque en tu nota diaria o semanal de Obsidian para ver de forma dinámica la distribución del tiempo en este intervalo:

\`\`\`dataview
TABLE duration as "Duración (h)", date as "Fecha"
FROM "Cíclica/Historial"
WHERE date >= date("${periodRange.start.toISOString().substring(0, 10)}") AND date <= date("${periodRange.end.toISOString().substring(0, 10)}")
SORT date DESC
\`\`\`

---
*Reporte generado automáticamente en local por CÍCLICA, 100% libre de telemetrías externas.*`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ciclica_reporte_${period}_${new Date().toISOString().substring(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-6 px-6 md:px-10 pt-8 pb-10" id="view-reportes">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-line/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-base-dim rounded-xl text-primary">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-title">Generador de Reportes</h2>
            <p className="text-body mt-0">Análisis de rendimiento, distribución de tiempo e intervalos de enfoque</p>
          </div>
        </div>

        <div className="flex gap-6 items-center flex-wrap font-mono text-xs uppercase tracking-wider font-bold">
          {/* COPY BUTTON */}
          <button
            onClick={handleCopyReport}
            className="text-primary hover:text-text-main hover:underline transition-colors bg-transparent border-0 outline-none flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary stroke-[3]" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar Resumen
              </>
            )}
          </button>

          {/* DOWNLOAD MD BUTTON */}
          <button
            onClick={handleDownloadReport}
            className="text-primary hover:text-text-main hover:underline transition-colors bg-transparent border-0 outline-none flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Exportar (.md)
          </button>
        </div>
      </div>

      {/* FILTER & TIME INTERVAL SELECTOR BAR */}
      <div className="bg-transparent py-4 border-b border-border-line/50 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border-line/20 pb-2.5">
          <div className="flex items-center gap-2 text-text-main font-semibold text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Seleccionar Intervalo de Tiempo</span>
          </div>
          <span className="text-[10px] font-mono text-text-dim uppercase">
            {periodRange.start.toLocaleDateString('es-ES')} - {periodRange.end.toLocaleDateString('es-ES')}
          </span>
        </div>

        {/* Quick select and Area filter */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: 'semana', label: 'Esta Semana' },
              { id: '7dias', label: 'Últimos 7 días' },
              { id: 'mes', label: 'Este Mes' },
              { id: '30dias', label: 'Últimos 30 días' },
              { id: 'ciclo', label: 'Ciclo Actual 🩸' },
              { id: 'custom', label: 'Rango Personalizado 🗓️' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PeriodType)}
                className={cn(
                  "px-3 py-2 text-xs font-mono transition-all cursor-pointer bg-transparent border-b-2 border-transparent text-text-dim hover:text-text-main",
                  period === p.id && "border-text-main text-text-main font-bold"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 flex items-center pr-6 bg-base">
            <select 
              value={areaFilter} 
              onChange={(e) => setAreaFilter(e.target.value)} 
              className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0"
            >
              <option value="Todas">Todas las áreas</option>
              {Object.keys(config?.areas || {}).map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
          </div>
        </div>

        {/* Customizable Date Selectors */}
        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-base-dim/40 p-4 rounded-lg border border-border-line/50 animate-in slide-in-from-top-1.5 duration-150">
            <div className="flex flex-col gap-1.5">
              <label className="text-label flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-text-dim/70" /> Fecha de Inicio
              </label>
              <input 
                type="date" 
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-border-line rounded-lg bg-base text-text-main outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-text-dim/70" /> Fecha de Término
              </label>
              <input 
                type="date" 
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-border-line rounded-lg bg-base text-text-main outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* METRICS GRID - STYLED WITH NON-INTERSECTING LINES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-border-line/30 mb-8">
        
        {/* Metric 1: Total Hours invested */}
        <div className="border-r border-b border-border-line/30 p-6 flex flex-col gap-1 bg-transparent">
          <span className="text-[10px] font-mono text-text-dim uppercase">Horas Invertidas</span>
          <div className="flex items-baseline gap-1 mt-1 text-text-main">
            <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight">{stats.totalHours}</span>
            <span className="text-xs text-text-dim/80 font-medium tracking-wide">horas</span>
          </div>
        </div>

        {/* Metric 2: Total Sessions complete */}
        <div className="border-r border-b border-border-line/30 p-6 flex flex-col gap-1 bg-transparent justify-between">
          <span className="text-[10px] font-mono text-text-dim uppercase">Sesiones de Foco</span>
          <div className="flex items-baseline gap-1 mt-1 text-text-main">
            <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight">{stats.historyCount}</span>
            <span className="text-xs text-text-dim/80 font-medium tracking-wide">veces</span>
          </div>
        </div>

        {/* Metric 3: Active density/rate */}
        <div className="border-r border-b border-border-line/30 p-6 flex flex-col gap-1 bg-transparent justify-between">
          <span className="text-[10px] font-mono text-text-dim uppercase">Promedio Real</span>
          <div className="flex items-baseline gap-1 mt-1 text-text-main">
            <span className="text-2xl sm:text-3xl font-light font-mono tracking-tight">{stats.dailyAverage}</span>
            <span className="text-xs text-text-dim/80 font-medium tracking-wide">h/día</span>
          </div>
        </div>

        {/* Metric 4: Primary Area focus */}
        <div className="border-r border-b border-border-line/30 p-6 flex flex-col gap-1 bg-transparent justify-between min-w-0">
          <span className="text-[10px] font-mono text-text-dim uppercase">Área Principal</span>
          <span className="text-base font-medium truncate mt-2 leading-tight block text-primary">
            {stats.primaryArea}
          </span>
        </div>
      </div>

      {/* CHARTS GRAPHICS WRAPPER */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* 1. Daily life tracker (Daily trend columns chart) */}
        <div className="bg-transparent py-6 border-b border-border-line/50 flex flex-col gap-4 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border-line/20 pb-3">
            <div>
              <h3 className="text-sm font-medium text-text-main flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Línea de Enfoque Diaria (Horas Invertidas)
              </h3>
              <p className="text-xs text-text-dim font-medium">Histórico consecutivo del tiempo trackeado</p>
            </div>
            <span className="text-xs font-mono font-medium text-text-dim uppercase bg-base-dim px-2 py-0.5 rounded border border-border-line/50">
              {stats.dailySeries.length} días
            </span>
          </div>

          {stats.dailySeries.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-40">
              <Activity className="w-8 h-8 text-text-dim mb-1" />
              <p className="text-text-dim font-medium text-xs">No hay datos de tiempo en este intervalo</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-2">
              {/* Graphic container */}
              <div className="h-44 w-full flex items-end gap-[3%] sm:gap-[5%] px-2 border-b border-border-line/30 pb-1 pt-4 overflow-x-auto no-scrollbar">
                {stats.dailySeries.map((d, idx) => {
                  const maximumHrsInSeries = Math.max(...stats.dailySeries.map(x => x.hours), 1.0);
                  const normalizedPercentage = Math.min(85, Math.max(4, (d.hours / maximumHrsInSeries) * 80));
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full min-w-[24px]">
                      {/* Bar and trigger value box */}
                      <div className="flex-1 w-full flex items-end justify-center relative group">
                        {/* Hover tag overlay details */}
                        <div className="absolute bottom-full mb-1 bg-[var(--color-text-main)] text-[var(--color-base)] rounded px-1.5 py-0.5 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap shadow-md">
                          {d.hours} h ({d.count} u)
                        </div>
                        {/* Interactive dynamic bar */}
                        <div 
                          style={{ height: `${normalizedPercentage}%` }}
                          className={cn(
                            "w-full rounded-t transition-all duration-300",
                            d.hours > 0 
                              ? "bg-[var(--color-primary)] hover:brightness-110 shadow-sm" 
                              : "bg-base-dim"
                          )}
                        />
                      </div>
                      
                      {/* Quick bottom label */}
                      <span className="text-[9px] font-mono font-medium text-text-dim whitespace-nowrap overflow-hidden text-ellipsis">
                        {d.dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend details */}
              <div className="flex items-center gap-4 text-xs text-text-dim flex-wrap justify-end font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[var(--color-primary)]" /> Tiempo Invertido (&gt;0 h)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-base-dim" /> Sin Registro Activo
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Distributions by Micro Action Type (Card) */}
        <div className="bg-transparent py-6 border-b border-border-line/50 flex flex-col gap-4">
          <div className="border-b border-border-line/20 pb-3">
            <h3 className="text-sm font-medium text-text-main flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-accent" />
              Categorías por Tipo
            </h3>
            <p className="text-xs text-text-dim font-medium">Distribución de horas según estructura</p>
          </div>

          <div className="flex flex-col gap-4 mt-1.5">
            {[
              { type: 'Tarea', color: 'bg-[var(--color-primary)]', label: '📝 Tareas Simples' },
              { type: 'Proyecto', color: 'bg-[var(--color-accent)]', label: '📁 Proyectos' },
              { type: 'Rutina', color: 'bg-[var(--color-secondary)]', label: '🔁 Rutinas' },
              { type: 'Hábito', color: 'bg-[var(--color-tertiary)]', label: '🌱 Hábitos Diarios' },
              { type: 'Evento', color: 'bg-[var(--color-text-dim)]/50', label: '📅 Eventos' }
            ].map((tObj, index) => {
              const hours = stats.typeHours[tObj.type] || 0;
              const count = stats.typeCounts[tObj.type] || 0;
              const percentage = stats.totalHours > 0 ? Math.round((hours / stats.totalHours) * 100) : 0;

              return (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-text-main font-light text-xs">
                      <span className={cn("w-2 h-2 rounded-full", tObj.color)} />
                      {tObj.label}
                    </span>
                    <span className="font-mono text-xs text-text-dim">
                      {hours.toFixed(1)}h <span className="text-[10px] text-text-dim/50">({count}x)</span>
                    </span>
                  </div>
                  
                  {/* Small nice progress row bar */}
                  <div className="w-full h-1.5 bg-base-dim rounded-full overflow-hidden relative">
                    <div 
                      style={{ width: `${percentage}%` }}
                      className={cn("h-full rounded-full transition-all duration-300", tObj.color)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CORE AREAS TIME DISTRIBUTION BAR */}
      <div className="bg-transparent py-6 border-b border-border-line/50 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border-line/20 pb-3">
          <div>
            <h3 className="text-sm font-medium text-text-main flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-accent" />
              Sinfonía de Horas por Áreas de Enfoque
            </h3>
            <p className="text-xs text-text-dim font-medium">Inversión proporcional total por área y categoría macro</p>
          </div>
          <span className="bg-base-dim border border-border-line/50 text-text-main text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded shrink-0">
            {Object.keys(stats.areaHours).length} Áreas
          </span>
        </div>

        {Object.keys(stats.areaHours).length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center opacity-40">
            <Compass className="w-8 h-8 text-text-dim mb-1" />
            <p className="text-text-dim font-medium text-xs">No hay registros clasificados por macro áreas en este intervalo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            
            {/* Visual stacked timeline bar */}
            <div className="w-full h-3 bg-base-dim rounded-full flex overflow-hidden border border-border-line/50">
              {(Object.entries(stats.areaHours) as [string, number][]).map(([area, hrs], idx) => {
                const percentage = stats.totalHours > 0 ? (hrs / stats.totalHours) * 100 : 0;
                if (percentage === 0) return null;

                const areaConfig = config?.areas?.[area];
                const cleanColorName = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
                
                const colorBgMap: Record<string, string> = {
                  'emerald': 'bg-emerald-500',
                  'green': 'bg-green-500',
                  'indigo': 'bg-indigo-500',
                  'blue': 'bg-blue-500',
                  'orange': 'bg-orange-500',
                  'amber': 'bg-amber-500',
                  'purple': 'bg-purple-500',
                  'pink': 'bg-pink-500',
                  'rose': 'bg-rose-500',
                  'violet': 'bg-violet-500',
                  'red': 'bg-red-500',
                  'slate': 'bg-slate-500'
                };
                const bgClass = colorBgMap[cleanColorName] || 'bg-slate-500';

                return (
                  <div 
                    key={area}
                    style={{ width: `${percentage}%` }}
                    className={cn("h-full hover:brightness-105 transition-all cursor-pointer relative group", bgClass)}
                    title={`${area}: ${hrs.toFixed(1)}h (${Math.round(percentage)}%)`}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-[var(--color-text-main)] text-[var(--color-base)] rounded text-xs px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold whitespace-nowrap shadow-md pointer-events-none">
                      {area}: {hrs.toFixed(1)}h ({Math.round(percentage)}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Area Grid Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
              {(Object.entries(stats.areaHours) as [string, number][]).map(([area, hrs]) => {
                const percentage = stats.totalHours > 0 ? (hrs / stats.totalHours) * 100 : 0;
                const count = stats.areaCounts[area] || 0;

                const areaConfig = config?.areas?.[area];
                const cleanColorName = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
                const borderTextColorMap: Record<string, string> = {
                  'emerald': 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5',
                  'green': 'border-green-500/30 text-green-600 bg-green-500/5',
                  'indigo': 'border-indigo-500/30 text-indigo-600 bg-indigo-500/5',
                  'blue': 'border-blue-500/30 text-blue-600 bg-blue-500/5',
                  'orange': 'border-orange-500/30 text-orange-600 bg-orange-500/5',
                  'amber': 'border-amber-500/30 text-amber-600 bg-amber-500/5',
                  'purple': 'border-purple-500/30 text-purple-600 bg-purple-500/5',
                  'pink': 'border-pink-500/30 text-pink-600 bg-pink-500/5',
                  'rose': 'border-rose-500/30 text-rose-600 bg-rose-500/5',
                  'violet': 'border-violet-500/30 text-violet-600 bg-violet-500/5',
                  'red': 'border-red-500/30 text-red-600 bg-red-500/5',
                  'slate': 'border-slate-500/30 text-slate-600 bg-slate-500/5'
                };
                const classColors = borderTextColorMap[cleanColorName] || 'border-border-line text-text-main bg-base-dim/20';

                return (
                  <div 
                    key={area}
                    className={cn("p-3.5 rounded-lg border flex flex-col justify-between transition-all duration-200 hover:scale-[1.01]", classColors)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate capitalize">{area}</span>
                      <span className="text-[10px] font-mono font-bold bg-base px-1.5 py-0.2 rounded border border-border-line/50 text-text-main">
                        {Math.round(percentage)}%
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 mt-2.5">
                      <span className="text-xl font-mono font-light leading-tight">{hrs.toFixed(1)}</span>
                      <span className="text-[9px] uppercase font-mono tracking-wider text-text-dim/70">horas</span>
                    </div>
                    
                    <span className="text-[10px] font-mono text-text-dim/70 mt-1 block">
                      💡 {count} ejecuciones
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* FREQUENT RECORDS & SESSIONS INSIGHTS FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        
        {/* Top frequent actions insights card */}
        <div className="bg-transparent py-6 border-b border-border-line/50 flex flex-col gap-4">
          <div className="border-b border-border-line/20 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-main flex items-center gap-1.5">
                <Award className="w-4 h-4 text-primary" />
                Hito de Mayor Constancia
              </h3>
              <p className="text-xs text-text-dim font-medium">Elemento con mayor frecuencia en la agenda real</p>
            </div>
          </div>

          {stats.historyCount === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center text-text-dim/70 font-light text-xs italic">
              Sin registros para calcular hitos
            </div>
          ) : (
            <div className="bg-base-dim/30 border border-border-line/55 rounded-lg p-4 sm:p-5 flex flex-col gap-3">
              <span className="text-[10px] font-mono uppercase font-medium tracking-wider text-text-dim">Elemento Estrella</span>
              <span className="text-base sm:text-lg font-medium text-text-main leading-snug">
                🏆 "{stats.topTask}"
              </span>
              <div className="flex items-center gap-3.5 text-xs text-text-dim mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-primary" />
                  Ejecutado <strong className="text-text-main font-semibold ml-0.5">{stats.maxTaskCount} veces</strong>
                </span>
                <span className="text-[var(--color-border-line)]/60">|</span>
                <span>
                  Período: <strong className="text-text-main font-semibold">{period === 'custom' ? 'Customizado' : period}</strong>
                </span>
              </div>
              <p className="text-xs text-text-dim/70 leading-relaxed mt-1 font-medium italic">
                Tip: Continúa con la excelencia en tus hábitos. La consistencia habitual crea dinámicas acumulativas de valor.
              </p>
            </div>
          )}
        </div>

        {/* Focus recommendations card based on logged data */}
        <div className="bg-transparent py-6 flex flex-col gap-4">
          <div className="border-b border-border-line/20 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-text-main flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Asesor de Enfoque Operativo
              </h3>
              <p className="text-xs text-text-dim font-medium">Observaciones de rendimiento personalizadas</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {stats.historyCount === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center text-text-dim/70 font-light text-xs italic">
                Registra actividades para habilitar las observaciones automáticas
              </div>
            ) : (
              <>
                <div className="flex gap-2.5 p-3 rounded-lg bg-base-dim/40 border border-border-line/80 text-text-main text-xs">
                  <div className="p-1.5 bg-base-dim text-primary rounded shrink-0 h-fit" title="Insight">💡</div>
                  <div>
                    <span className="font-semibold text-text-main block mb-0.5">Distribución de Actividad</span>
                    Has invertido <strong className="text-primary font-semibold">{stats.totalHours} horas</strong> a lo largo de <strong className="text-primary font-semibold">{stats.activeDays} días</strong>. Tu promedio real se posiciona en <strong className="text-primary font-semibold">{stats.dailyAverage} horas/día</strong>.
                  </div>
                </div>

                <div className="flex gap-2.5 p-3 rounded-lg bg-base-dim/40 border border-border-line/80 text-text-main text-xs">
                  <div className="p-1.5 bg-base-dim text-accent rounded shrink-0 h-fit" title="Recomendación">⚡</div>
                  <div>
                    <span className="font-semibold text-text-main block mb-0.5">Densidad de Enfoque por Macro Áreas</span>
                    Tus metas en <strong className="text-accent font-semibold">{stats.primaryArea}</strong> toman el liderazgo temporal de tu agenda. Considera si este balance responde de manera alineada al propósito estratégico definido en tus Áreas de Vida.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* HISTORIAL DE OCUPACIÓN TEMPORAL (CRONOGRAMA DE ENFOQUE) */}
      <div className="border-t border-border-line/45 pt-8 mt-6">
        <button 
          onClick={() => setShowOccupancy(!showOccupancy)} 
          className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-primary uppercase hover:text-text-main transition-colors focus:outline-none w-full text-left bg-transparent border-0 cursor-pointer mb-6"
        >
          <span className={cn("transition-transform duration-200 inline-block", showOccupancy ? "rotate-90" : "")}>
            <ChevronRight className="w-4 h-4" />
          </span>
          📊 HISTORIAL DE OCUPACIÓN TEMPORAL (CRONOGRAMA DE ENFOQUE)
        </button>

        {showOccupancy && (
          <div className="w-full flex overflow-hidden border border-border-line/40 rounded-none animate-in fade-in duration-300">
            {/* Left Column: List of logged tasks/projects */}
            <div className="w-48 sm:w-60 border-r border-border-line flex-shrink-0 bg-base-dim/10 select-none font-sans text-left">
              <div className="h-9 border-b border-border-line/40 px-3 flex items-center text-[9px] font-mono uppercase text-text-dim tracking-wider font-bold">
                ACTIVIDADES / TAREAS
              </div>
              <div className="flex flex-col">
                {visibleOccupancyRows.map(({ node: row, isChild, parentId }) => {
                  const hasChildren = row.type === 'Proyecto' && row.children.length > 0;
                  const isExpanded = !!expandedProjects[row.id];

                  return (
                    <div 
                      key={isChild ? `child-${parentId}-${row.id}` : row.id} 
                      className={cn(
                        "h-10 border-b border-border-line/20 px-3 flex items-center justify-between gap-1 hover:bg-base-dim/30 cursor-default",
                        isChild && "pl-6 bg-base-dim/5"
                      )}
                    >
                      <div className="flex flex-col justify-center gap-0.5 min-w-0 flex-1 text-left">
                        <span className="text-xs font-medium text-text-main truncate" title={row.text}>
                          {isChild ? '↳ ' : ''}
                          {row.type === 'Tarea' ? '📝 ' : row.type === 'Proyecto' ? '📁 ' : row.type === 'Rutina' ? '🔁 ' : row.type === 'Hábito' ? '🌱 ' : '💓 '}
                          {row.text}
                        </span>
                        <span className="text-[8px] font-mono uppercase text-text-dim tracking-normal">
                          {row.area} • {row.totalHours.toFixed(1)}h tot
                        </span>
                      </div>
                      
                      {hasChildren && (
                        <button
                          onClick={() => {
                            setExpandedProjects(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                          }}
                          className="p-1 hover:bg-base-dim/50 rounded text-text-dim hover:text-text-main transition-colors bg-transparent border-0 cursor-pointer flex items-center justify-center shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
                {visibleOccupancyRows.length === 0 && (
                  <div className="text-[10px] font-mono text-text-dim uppercase italic py-8 text-center">No hay registros</div>
                )}
              </div>
            </div>

            {/* Right Column: Scrollable Grid representing days */}
            <div className="flex-1 overflow-x-auto relative min-w-0" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col relative select-none" style={{ width: `${daysInRange.length * 64 + 10}px`, minWidth: '100%' }}>
                
                {/* Header row: days */}
                <div className="h-9 border-b border-border-line/40 flex w-full">
                  {daysInRange.map((date, idx) => (
                    <div 
                      key={idx}
                      className="w-[64px] flex-shrink-0 border-r border-border-line/20 last:border-r-0 flex flex-col items-center justify-center text-[9px] font-mono text-text-dim/80 py-0.5"
                    >
                      <span className="font-bold">{date.getDate()}</span>
                      <span className="scale-90 opacity-80 uppercase">{date.toLocaleDateString('es-ES', { month: 'short' }).slice(0, 3)}</span>
                    </div>
                  ))}
                </div>

                {/* Body tracks */}
                <div className="flex flex-col w-full">
                  {visibleOccupancyRows.map(({ node: row, isChild, parentId }) => (
                    <div 
                      key={isChild ? `child-track-${parentId}-${row.id}` : row.id} 
                      className={cn(
                        "h-10 border-b border-border-line/20 w-full flex relative hover:bg-base-dim/10",
                        isChild && "bg-base-dim/5"
                      )}
                    >
                      {daysInRange.map((date, idx) => {
                        const dayKey = date.toISOString().substring(0, 10);
                        const hours = row.logsByDay[dayKey] || 0;
                        
                        const areaConfig = config?.areas?.[row.area];
                        const pColor = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');
                        
                        const colorBgMap: Record<string, string> = {
                          'emerald': 'bg-emerald-500/80 border-emerald-500',
                          'green': 'bg-green-500/80 border-green-500',
                          'indigo': 'bg-indigo-500/80 border-indigo-500',
                          'blue': 'bg-blue-500/80 border-blue-500',
                          'orange': 'bg-orange-500/80 border-orange-500',
                          'amber': 'bg-amber-500/80 border-amber-500',
                          'purple': 'bg-purple-500/80 border-purple-500',
                          'pink': 'bg-pink-500/80 border-pink-500',
                          'rose': 'bg-rose-500/80 border-rose-500',
                          'violet': 'bg-violet-500/80 border-violet-500',
                          'red': 'bg-red-500/80 border-red-500',
                          'slate': 'bg-slate-500/80 border-slate-500'
                        };
                        const bgClass = colorBgMap[pColor] || 'bg-slate-400/80 border-slate-400';
                        const maxHrs = 4;
                        const widthPercent = Math.min(100, (hours / maxHrs) * 100);

                        return (
                          <div 
                            key={idx}
                            className="w-[64px] flex-shrink-0 h-full flex items-center justify-center relative border-r border-border-line/10 last:border-r-0"
                          >
                            {hours > 0 ? (
                              <div className="w-full px-1 flex justify-center">
                                <div 
                                  className={cn("h-2.5 rounded-full flex items-center justify-center text-[8px] font-mono text-white truncate shadow-sm", bgClass)}
                                  style={{ width: `${Math.max(65, widthPercent)}%` }}
                                  title={`${hours.toFixed(1)}h en esta fecha`}
                                >
                                  {hours.toFixed(1)}h
                                </div>
                              </div>
                            ) : (
                              <span className="text-[14px] text-text-dim/20 font-mono select-none">·</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
