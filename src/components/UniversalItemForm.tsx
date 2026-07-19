import React, { useState, useEffect } from 'react';
import { AppTask, Config, TaskType, ChecklistItem, RecurrenceUnit } from '../types';
import { ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Reorder } from 'motion/react';
import { getCalendarCycleRange, isHabitCompatibleWithRoutine } from '../domain/recurrenceProgress';
import { normalizePulsePolarity } from '../domain/trackingProgress';

const WEEKDAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' }
];

const GripIcon = () => (
  <svg className="w-3.5 h-3.5 text-text-dim/40 shrink-0 cursor-grab active:cursor-grabbing mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

interface Props {
  initialData?: AppTask;
  defaultType?: TaskType;
  defaultText?: string;
  config: Config | null;
  allTasks: AppTask[];
  onSave: (data: Partial<AppTask>) => void;
  onCancel: () => void;
}

export default function UniversalItemForm({ initialData, defaultType = 'Tarea', defaultText = '', config, allTasks, onSave, onCancel }: Props) {
  const [text, setText] = useState(initialData?.text || defaultText);
  const [type, setType] = useState<TaskType>(initialData?.type || defaultType);
  const [priority, setPriority] = useState(initialData?.priority || 'Baja');
  const [hora, setHora] = useState(initialData?.hora || '');
  const [frecuencia, setFrecuencia] = useState(initialData?.frecuencia || 1);
  const [frecuenciaUnidad, setFrecuenciaUnidad] = useState(initialData?.frecuenciaUnidad || 'días');
  const [routineCycleFrequency, setRoutineCycleFrequency] = useState(initialData?.routineCycleFrequency || 1);
  const [routineCycleUnit, setRoutineCycleUnit] = useState<RecurrenceUnit>(initialData?.routineCycleUnit || 'meses');
  const [appearanceWeekdays, setAppearanceWeekdays] = useState<number[]>(initialData?.appearanceWeekdays || []);
  const [view, setView] = useState(initialData?.view || 'Backlog');
  const [area, setArea] = useState(initialData?.category || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [fechaPlanificada, setFechaPlanificada] = useState(initialData?.fechaPlanificada ? new Date(initialData.fechaPlanificada).toISOString().substring(0, 10) : '');
  const [duracion, setDuracion] = useState<number>(initialData?.duracion || 0);
  const [dependencyId, setDependencyId] = useState(initialData?.dependencyId || '');
  const [allocationType, setAllocationType] = useState<'fixed' | 'growth' | 'mixed'>(initialData?.allocationType || 'growth');
  
  // Specific to Pulso (Contador)
  const [targetCount, setTargetCount] = useState(initialData?.targetCount || 1);
  const [unitLabel, setUnitLabel] = useState(initialData?.unitLabel || 'veces');
  const [polaridad, setPolaridad] = useState<'Reforzar' | 'Abandonar'>(() => normalizePulsePolarity(initialData?.polaridad));

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialData?.checklist || []);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');
  const [depSearch, setDepSearch] = useState('');

  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSaveChecklistItemText = (id: string) => {
    if (editingChecklistItemText.trim()) {
      setChecklist(prev => prev.map(item => item.id === id ? { ...item, text: editingChecklistItemText.trim() } : item));
    }
    setEditingChecklistItemId(null);
  };

  const parentTaskHere = parentId ? allTasks.find(t => t.id === parentId) : null;
  const isRutinaParent = parentTaskHere && parentTaskHere.type === 'Rutina';
  const isActualSubtask = !!(parentTaskHere && parentTaskHere.type !== 'Proyecto');

  const handleSave = () => {
    if (!text.trim()) return;
    setValidationError('');

    const candidateRoutine: AppTask = {
      ...(initialData || {} as AppTask),
      id: initialData?.id || 'routine-draft',
      userId: initialData?.userId || '',
      text: text.trim(),
      type,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      routineCycleFrequency,
      routineCycleUnit
    };
    if (type === 'Rutina') {
      const incompatible = allTasks.find(task => task.parentId === initialData?.id && task.type === 'Hábito' && !isHabitCompatibleWithRoutine(candidateRoutine, task));
      if (incompatible) {
        setValidationError(`“${incompatible.text}” tiene una recurrencia más larga. Amplía el ciclo de la rutina como mínimo a ${incompatible.frecuencia || 1} ${incompatible.frecuenciaUnidad || 'días'}.`);
        return;
      }
    }
    if (type === 'Hábito' && parentId) {
      const parentRoutine = allTasks.find(task => task.id === parentId && task.type === 'Rutina');
      const candidateHabit = { ...candidateRoutine, type: 'Hábito' as const, frecuencia, frecuenciaUnidad: frecuenciaUnidad as RecurrenceUnit };
      if (parentRoutine && !isHabitCompatibleWithRoutine(parentRoutine, candidateHabit)) {
        setValidationError(`La rutina “${parentRoutine.text}” necesita un ciclo de al menos ${frecuencia} ${frecuenciaUnidad} para contener este hábito.`);
        return;
      }
    }

    const data: Partial<AppTask> = {
      text: text.trim(),
      type,
      category: area,
      subCategory,
      parentId: parentId || undefined,
      dependencyId: dependencyId || undefined,
      notes,
      checklist,
      allocationType: (type === 'Rutina' || type === 'Hábito') ? 'fixed' : allocationType,
    };

    if ((type === 'Tarea' || type === 'Rutina' || type === 'Hábito') && !isActualSubtask) {
      data.hora = hora;
    }
    if ((type === 'Tarea' || type === 'Pulso') && !isActualSubtask) {
      data.view = view;
    }

    if (type === 'Tarea' || type === 'Rutina' || type === 'Hábito') {
      data.duracion = duracion;
    }

    if (type === 'Hábito' || type === 'Rutina') {
      data.frecuencia = frecuencia;
      data.frecuenciaUnidad = frecuenciaUnidad as any;
      data.recurrenceAnchorDate = initialData?.recurrenceAnchorDate || data.fechaPlanificada || new Date().toISOString();
    }

    if (type === 'Rutina') {
      data.routineCycleFrequency = routineCycleFrequency;
      data.routineCycleUnit = routineCycleUnit;
      data.routineCycleAnchorDate = initialData?.routineCycleAnchorDate || new Date().toISOString();
      data.appearanceWeekdays = frecuenciaUnidad === 'semanas' && appearanceWeekdays.length > 0 ? appearanceWeekdays : undefined;
    }

    if (type === 'Tarea' || type === 'Proyecto' || type === 'Rutina') {
      if (fechaPlanificada) {
        const planDate = new Date(fechaPlanificada);
        if (!isNaN(planDate.getTime())) {
          data.fechaPlanificada = planDate.toISOString();
        }
      } else {
        data.fechaPlanificada = undefined;
      }
    }

    if (type === 'Rutina') {
      data.recurrenceAnchorDate = data.fechaPlanificada || initialData?.recurrenceAnchorDate || new Date().toISOString();
    }

    if (type === 'Pulso') {
      data.targetCount = targetCount;
      data.unitLabel = unitLabel;
      data.polaridad = normalizePulsePolarity(polaridad);
    }

    onSave(data);
  };

  return (
    <div className="flex flex-col gap-2 mb-1.5 mt-0.5 animate-in fade-in">
      <input 
        autoFocus
        type="text" 
        placeholder="Nombre del elemento..."
        className="w-full px-2.5 md:px-4 py-1 md:py-1.5 text-sm bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="flex flex-wrap gap-2 text-left">
        {/* Selector de Tipo (Solo visible al crear, no al editar) */}
        {!initialData && (
          <div className="flex items-center gap-1.5 bg-transparent rounded-md pl-2 pr-1 relative" title="Tipo de Elemento">
            <span className="text-xs text-text-dim uppercase font-mono">Tipo:</span>
            <select
              className="appearance-none py-1 bg-base text-text-main text-xs font-bold border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none cursor-pointer pr-6"
              value={type}
              onChange={e => {
                const newType = e.target.value as TaskType;
                setType(newType);
                if (newType === 'Proyecto' || newType === 'Rutina') {
                  setParentId('');
                } else if (newType === 'Hábito' && type === 'Tarea') {
                  setParentId('');
                } else if (newType === 'Tarea' && type === 'Hábito') {
                  setParentId('');
                }
              }}
            >
              <option value="Tarea">📝 Tarea</option>
              <option value="Proyecto">📁 Proyecto</option>
              <option value="Rutina">🔁 Rutina</option>
              <option value="Hábito">🌱 Hábito</option>
              <option value="Pulso">💓 Pulso (Contador)</option>
            </select>
            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
          </div>
        )}

        {type === 'Rutina' && (
          <div className="basis-full mt-2 pt-3 border-t border-border-line/50">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-dim">1. Aparece en Hoy</p>
          </div>
        )}
        {/* Frecuencia de aparición (Rutina) o recurrencia (Hábito) */}
        {(type === 'Hábito' || type === 'Rutina') && (
          <div className="flex items-center gap-1 bg-transparent rounded-md pl-2 pr-1 relative">
            <span className="text-xs text-text-dim font-mono">Cada</span>
            <input 
              type="number" 
              min={1} 
              className="w-10 py-1 bg-base text-text-main text-xs font-medium focus:outline-none text-center border-b border-border-line" 
              value={frecuencia} 
              onChange={e => setFrecuencia(Number(e.target.value))}
            />
            <select 
              className="appearance-none py-1 bg-base text-text-main text-xs font-medium border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none cursor-pointer pr-6" 
              value={frecuenciaUnidad} 
              onChange={e => setFrecuenciaUnidad(e.target.value)}
            >
              <option value="días">días</option>
              <option value="semanas">semanas</option>
              <option value="meses">meses</option>
            </select>
            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
          </div>
        )}

        {type === 'Rutina' && frecuenciaUnidad === 'semanas' && (
          <div className="basis-full flex flex-wrap items-center gap-1.5 px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim mr-1">Días</span>
            {WEEKDAYS.map(day => {
              const selected = appearanceWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setAppearanceWeekdays(prev => selected ? prev.filter(value => value !== day.value) : [...prev, day.value].sort())}
                  className={cn('px-2.5 py-1 rounded-full border text-[10px] cursor-pointer transition-colors', selected ? 'border-text-main bg-text-main text-base' : 'border-border-line bg-transparent text-text-dim')}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}

        {type === 'Rutina' && (
          <label className="flex flex-col gap-1 px-2 text-[10px] font-mono uppercase text-text-dim">
            Próxima aparición
            <input
              type="date"
              className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono w-[150px] outline-none"
              value={fechaPlanificada}
              onChange={event => setFechaPlanificada(event.target.value)}
            />
          </label>
        )}

        {type === 'Rutina' && (
          <>
            <div className="basis-full mt-2 pt-3 border-t border-border-line/50">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-dim">2. Ciclo de progreso</p>
            </div>
            <div className="flex items-center gap-1 pl-2 relative">
              <span className="text-xs text-text-dim font-mono">Cada</span>
              <input
                type="number"
                min={1}
                className="w-10 py-1 bg-base text-text-main text-xs font-medium focus:outline-none text-center border-b border-border-line"
                value={routineCycleFrequency}
                onChange={event => setRoutineCycleFrequency(Math.max(1, Number(event.target.value)))}
              />
              <select
                className="appearance-none bg-base text-text-main text-xs font-medium border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none cursor-pointer pr-6"
                value={routineCycleUnit}
                onChange={event => setRoutineCycleUnit(event.target.value as RecurrenceUnit)}
              >
                <option value="días">días</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
              <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
            <p className="basis-full px-2 text-[10px] text-text-dim">
              Período actual: {(() => {
                const period = getCalendarCycleRange(routineCycleFrequency, routineCycleUnit, new Date());
                return `${period.start} — ${period.end}`;
              })()}
            </p>
          </>
        )}

        {/* Pulso (Contador) */}
        {type === 'Pulso' && (
          <>
            <div className="flex items-center gap-1 bg-transparent rounded-md pl-2 pr-1 relative">
              <span className="text-xs text-text-dim font-mono">Meta:</span>
              <input 
                type="number" 
                min={1} 
                className="w-10 py-1 bg-base text-text-main text-xs font-medium focus:outline-none text-center border-b border-border-line" 
                value={targetCount} 
                onChange={e => setTargetCount(Number(e.target.value))}
              />
              <input 
                type="text"
                className="w-16 py-1 bg-base text-text-main text-xs font-medium border border-border-line px-2.5 py-1.5 rounded-full focus:outline-none placeholder:text-text-dim/50 ml-1" 
                placeholder="veces"
                value={unitLabel}
                onChange={e => setUnitLabel(e.target.value)}
              />
            </div>
            <div className="relative flex items-center bg-transparent rounded-md">
              <select 
                className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none cursor-pointer" 
                value={polaridad} 
                onChange={e => setPolaridad(e.target.value as any)}
              >
                 <option value="Reforzar">📈 Reforzar</option>
                 <option value="Abandonar">📉 Abandonar</option>
              </select>
              <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
          </>
        )}

        {/* Fecha Planificada (Tarea/Proyecto/Rutina) */}
        {(type === 'Tarea' || type === 'Proyecto') && (
          <input 
            type="date"
            className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono w-[130px] outline-none"
            value={fechaPlanificada}
            onChange={e => setFechaPlanificada(e.target.value)}
            title="Fecha Planificada / Límite (Opcional)"
          />
        )}

        {/* Hora (Tarea/Rutina/Hábito simple) */}
        {(type === 'Tarea' || type === 'Rutina' || type === 'Hábito') && !isActualSubtask && (
          <input 
            type="time" 
            className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono outline-none" 
            value={hora}
            onChange={e => setHora(e.target.value)}
            title="Hora (Opcional)"
          />
        )}

        {/* Vista (Tarea) */}
        {type === 'Tarea' && !isActualSubtask && (
          <div className="relative flex items-center bg-transparent rounded-md">
            <select 
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none cursor-pointer" 
              value={view} 
              onChange={e => setView(e.target.value)}
            >
               <option value="Hoy">☀️ Hoy</option>
               <option value="Backlog">📥 Backlog</option>
            </select>
            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
          </div>
        )}

        {/* Área / Categoría (Todos excepto Subtareas) */}
        {(!isActualSubtask || type === 'Hábito') && (
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex items-center bg-transparent rounded-md">
              <select 
                className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full max-w-[150px] truncate focus:outline-none cursor-pointer" 
                value={area} 
                onChange={e => { setArea(e.target.value); setSubCategory(''); }}
              >
                <option value="">Sin Área</option>
                {Object.keys(config?.areas || {}).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
            
            {area && typeof config?.areas?.[area] !== 'string' && (config?.areas?.[area] as any)?.categories?.length > 0 && (
              <div className="relative flex items-center bg-transparent rounded-md">
                <select 
                  className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full max-w-[150px] truncate focus:outline-none cursor-pointer" 
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                >
                  <option value="">Sin Categoría</option>
                  {((config?.areas?.[area] as any)?.categories || []).map((sc: string) => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
              </div>
            )}
          </div>
        )}

        {/* Duración (Tarea/Hábito) */}
        {(type === 'Tarea' || type === 'Hábito') && (
          <div className="flex items-center gap-1.5 bg-transparent rounded-md pl-2 pr-1 relative">
            <input 
              type="number" step="0.25" min="0" 
              className="w-12 py-1 bg-base text-text-main text-xs font-medium border-b border-border-line focus:outline-none text-center" 
              value={duracion || ''}
              onChange={e => setDuracion(Number(e.target.value))}
              placeholder="0.0"
            />
            <span className="text-xs text-text-dim uppercase font-mono mr-1">h</span>
          </div>
        )}

        {/* Asignación Energética (Tarea/Proyecto) */}
        {(type === 'Tarea' || type === 'Proyecto') && (
          <div className="relative flex items-center bg-transparent rounded-md">
            <select 
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none cursor-pointer" 
              value={allocationType} 
              onChange={e => setAllocationType(e.target.value as any)}
            >
               <option value="growth">⚡ Inversión</option>
               <option value="fixed">🛡️ Soporte Vital</option>
               <option value="mixed">☯️ Mixto</option>
            </select>
            <ChevronDown className="absolute right-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
          </div>
        )}
      </div>

      {/* Pertenece a / Asociar a Rutina o Proyecto (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && !isRutinaParent && (
        <div className="mt-2 text-left w-full flex flex-col gap-1.5">
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">
            {type === 'Hábito' ? 'Rutina asociada:' : 'Proyecto asociado:'}
          </span>
          <div className="relative max-w-sm">
            <select
              className="w-full appearance-none pl-3 pr-8 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none cursor-pointer truncate"
              value={parentId}
              onChange={e => {
                setParentId(e.target.value);
                const pTask = allTasks.find(t => t.id === e.target.value);
                if (pTask) {
                  setArea(pTask.category || '');
                  setSubCategory(pTask.subCategory || '');
                }
              }}
            >
              <option value="">(Ninguno) Raíz</option>
              {allTasks
                .filter(t => {
                  if (type === 'Hábito') {
                    return t.type === 'Rutina';
                  }
                  if (type === 'Tarea') {
                    return t.type === 'Proyecto';
                  }
                  return (t.type === 'Proyecto' || t.type === 'Rutina' || (t.type === 'Tarea' && t.id !== initialData?.id && t.parentId !== initialData?.id));
                })
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.type === 'Proyecto' ? '📁' : t.type === 'Rutina' ? '🔁' : '📝'} {t.text}
                  </option>
                ))
              }
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-text-dim pointer-events-none" />
          </div>
        </div>
      )}

      {/* Dependencias (Tarea) */}
      {type === 'Tarea' && (
        <div className="mt-2 text-left w-full flex flex-col gap-1.5">
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Depende de (Prerrequisito):</span>
          <div className="relative max-w-sm">
            <input 
              type="text"
              placeholder="Buscar tarea compañera..."
              className="w-full px-3 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={depSearch}
              onChange={e => setDepSearch(e.target.value)}
            />
            {depSearch && (
              <div className="absolute top-full mt-1 w-full bg-base border border-border-line rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                {allTasks
                  .filter(t => (t.type === 'Tarea' || t.type === 'Hábito' || t.type === 'Rutina') && t.id !== initialData?.id && t.text.toLowerCase().includes(depSearch.toLowerCase()))
                  .map(t => (
                    <div 
                      key={t.id} 
                      className="px-3 py-2 text-xs hover:bg-base-dim/40 cursor-pointer truncate border-b border-border-line/40 last:border-b-0"
                      onClick={() => {
                        setDependencyId(t.id);
                        setDepSearch('');
                      }}
                    >
                      {t.text}
                    </div>
                  ))
                }
              </div>
            )}
            {dependencyId && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-amber-500 font-medium truncate flex-1">
                  🔒 {allTasks.find(t => t.id === dependencyId)?.text || 'Tarea desconocida'}
                </span>
                <button onClick={() => setDependencyId('')} className="text-red-500 text-xs hover:underline bg-transparent border-none cursor-pointer">Quitar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notas (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && (
        <div className="mt-3 flex flex-col gap-1.5 text-left w-full">
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Notas:</span>
          <textarea 
            placeholder="Notas y contexto..."
            className="w-full min-h-[80px] p-3 text-xs bg-base text-text-main border border-border-line rounded-xl focus:outline-none focus:border-[#a2b29f] resize-y font-sans font-light"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      )}

      {/* Checklist (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && (
        <div className="flex flex-col gap-2 text-left w-full mt-3">
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Checklist (Guía Operativa):</span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {checklist.length === 0 ? (
              <span className="text-[10px] text-primary italic pl-2">Sin ítems</span>
            ) : (
              <Reorder.Group axis="y" values={checklist} onReorder={setChecklist} className="space-y-1.5">
                {checklist.map(item => {
                  const isEditing = editingChecklistItemId === item.id;
                  return (
                    <Reorder.Item 
                      key={item.id} 
                      value={item} 
                      className="flex items-center bg-base-dim/20 px-3 py-1.5 rounded-lg border border-border-line/40 select-none cursor-grab active:cursor-grabbing gap-2"
                    >
                      <GripIcon />
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            className="w-full bg-base border border-border-line rounded-md px-2 py-0.5 text-xs text-text-main focus:outline-none focus:border-[#a2b29f]"
                            value={editingChecklistItemText}
                            onChange={e => setEditingChecklistItemText(e.target.value)}
                            onBlur={() => handleSaveChecklistItemText(item.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveChecklistItemText(item.id);
                              if (e.key === 'Escape') setEditingChecklistItemId(null);
                            }}
                          />
                        ) : (
                          <span 
                            onClick={() => {
                              setEditingChecklistItemId(item.id);
                              setEditingChecklistItemText(item.text);
                            }}
                            className={cn("text-xs text-text-main cursor-text block truncate", item.done && "line-through opacity-60")}
                            title="Haz clic para editar"
                          >
                            {item.text}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                        className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer text-xs shrink-0"
                      >
                        ✕
                      </button>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder="Añadir ítem al checklist..."
              className="flex-1 px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={newChecklistItemText}
              onChange={e => setNewChecklistItemText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newChecklistItemText.trim()) {
                    const newItem: ChecklistItem = {
                      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      text: newChecklistItemText.trim(),
                      done: false
                    };
                    setChecklist([...checklist, newItem]);
                    setNewChecklistItemText('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newChecklistItemText.trim()) {
                  const newItem: ChecklistItem = {
                    id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    text: newChecklistItemText.trim(),
                    done: false
                  };
                  setChecklist([...checklist, newItem]);
                  setNewChecklistItemText('');
                }
              }}
              className="px-3 py-1.5 bg-primary text-base-dim rounded-full text-xs font-mono uppercase tracking-wider font-bold hover:opacity-90 cursor-pointer border-0 outline-none flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <p role="alert" className="text-xs text-red-500 border border-red-500/30 bg-red-500/5 rounded-xl px-3 py-2">
          {validationError}
        </p>
      )}
      <div className="flex items-center gap-6 mt-3 pt-2">
        <button onClick={handleSave} className="text-text-main text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer hover:underline border-0 bg-transparent outline-none">
          + Guardar
        </button>
        <button onClick={onCancel} className="text-text-dim text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer hover:underline border-0 bg-transparent outline-none">
          ✕ Cancelar
        </button>
      </div>
    </div>
  );
}
