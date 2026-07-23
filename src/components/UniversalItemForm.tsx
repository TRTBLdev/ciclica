import React, { useState, useEffect } from 'react';
import { AppTask, AppearanceMode, Config, TaskType, ChecklistItem, QuotaPeriodUnit, RecurrenceUnit } from '../types';
import { ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Reorder } from 'motion/react';
import LinkedText from './ui/LinkedText';
import { formatDateOnly, getCalendarCycleRange } from '../domain/recurrenceProgress';
import { normalizePulsePolarity } from '../domain/trackingProgress';
import { getAppearanceDate, getAppearanceMode, getDeadlineDate, getMinimumRoutineOpportunityCount } from '../domain/appearance';
import { getProjectScheduleLabel } from '../domain/projectPresentation';
import { getProjectForTask } from '../domain/workTracking';

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
  onEditProject?: (projectId: string) => void;
}

export default function UniversalItemForm({ initialData, defaultType = 'Tarea', defaultText = '', config, allTasks, onSave, onCancel, onEditProject }: Props) {
  const [text, setText] = useState(initialData?.text || defaultText);
  const [type, setType] = useState<TaskType>(initialData?.type || defaultType);
  const [priority, setPriority] = useState(initialData?.priority || 'Baja');
  const [hora, setHora] = useState(initialData?.hora || '');
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode | ''>(() => getAppearanceMode(initialData || ({ type: defaultType } as AppTask)) || (defaultType === 'Hábito' || defaultType === 'Rutina' ? 'interval' : ''));
  const [frecuencia, setFrecuencia] = useState(initialData?.appearanceFrequency || initialData?.frecuencia || 1);
  const [frecuenciaUnidad, setFrecuenciaUnidad] = useState(initialData?.appearanceFrequencyUnit || initialData?.frecuenciaUnidad || 'días');
  const [routineCycleFrequency, setRoutineCycleFrequency] = useState(initialData?.routineCycleFrequency || 1);
  const [routineCycleUnit, setRoutineCycleUnit] = useState<RecurrenceUnit>(initialData?.routineCycleUnit || 'meses');
  const [appearanceWeekdays, setAppearanceWeekdays] = useState<number[]>(initialData?.appearanceWeekdays || []);
  const [area, setArea] = useState(initialData?.category || '');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [fechaAparicion, setFechaAparicion] = useState(getAppearanceDate(initialData || ({} as AppTask)) || ((defaultType === 'Hábito' || defaultType === 'Rutina') ? formatDateOnly(new Date()) : ''));
  const [fechaLimite, setFechaLimite] = useState(getDeadlineDate(initialData || ({} as AppTask)) || '');
  const [quotaTarget, setQuotaTarget] = useState(initialData?.quotaTarget || 3);
  const [quotaPeriodUnit, setQuotaPeriodUnit] = useState<QuotaPeriodUnit>(initialData?.quotaPeriodUnit || 'semanas');
  const [objetivoPorCiclo, setObjetivoPorCiclo] = useState(initialData?.objetivoPorCiclo || 1);
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
  const inheritedProjectHere = type === 'Tarea' && parentId ? getProjectForTask(parentId, allTasks) : null;
  const inheritsProjectContext = !!inheritedProjectHere;
  const isActualSubtask = !!(parentTaskHere && parentTaskHere.type !== 'Proyecto');
  const parentRoutineCapacity = isRutinaParent ? getMinimumRoutineOpportunityCount(parentTaskHere) : undefined;

  const handleSave = () => {
    if (!text.trim()) return;
    setValidationError('');

    if (appearanceMode && !fechaAparicion) {
      setValidationError('Indica la fecha inicial de la aparición.');
      return;
    }
    if (appearanceMode === 'weekdays' && appearanceWeekdays.length === 0) {
      setValidationError('Selecciona al menos un día específico.');
      return;
    }

    if (type === 'Hábito' && parentId) {
      const parentRoutine = allTasks.find(task => task.id === parentId && task.type === 'Rutina');
      const capacity = parentRoutine ? getMinimumRoutineOpportunityCount(parentRoutine) : 0;
      if (parentRoutine && objetivoPorCiclo > capacity) {
        setValidationError(`La rutina “${parentRoutine.text}” ofrece como mínimo ${capacity} apariciones por ciclo próximo. Reduce la cuota o aumenta sus apariciones.`);
        return;
      }
    }

    const data: Partial<AppTask> = {
      text: text.trim(),
      type,
      parentId: parentId || undefined,
      dependencyId: dependencyId || undefined,
      notes,
      checklist,
    };

    if (!inheritsProjectContext) {
      data.category = area;
      data.subCategory = subCategory;
    }
    if (type !== 'Proyecto') {
      data.allocationType = (type === 'Rutina' || type === 'Hábito') ? 'fixed' : allocationType;
    }

    if (
      type === 'Proyecto'
      || ((type === 'Tarea' || type === 'Rutina' || type === 'Hábito') && !isActualSubtask && !inheritsProjectContext)
    ) {
      data.hora = hora;
    }
    if (type === 'Tarea' || type === 'Rutina' || type === 'Hábito') {
      data.duracion = duracion;
    }

    if (type === 'Rutina') {
      data.routineCycleFrequency = routineCycleFrequency;
      data.routineCycleUnit = routineCycleUnit;
      data.routineCycleAnchorDate = (initialData?.routineCycleAnchorDate || formatDateOnly(new Date())).slice(0, 10);
    }

    if (type !== 'Pulso') {
      const childHabit = type === 'Hábito' && !!parentId;
      if (childHabit) {
        data.objetivoPorCiclo = Math.max(1, objetivoPorCiclo);
        data.appearanceMode = undefined;
        data.fechaAparicion = undefined;
      } else if (inheritsProjectContext) {
        // La programación propia permanece inactiva mientras la tarea pertenezca a un proyecto.
      } else if (appearanceMode) {
        const start = fechaAparicion || formatDateOnly(new Date());
        data.appearanceMode = appearanceMode;
        data.fechaAparicion = start;
        data.recurrenceAnchorDate = initialData?.recurrenceAnchorDate?.slice(0, 10) || start;
        data.appearanceFrequency = appearanceMode === 'weekdays' ? 1 : Math.max(1, frecuencia);
        data.appearanceFrequencyUnit = appearanceMode === 'weekdays' ? 'semanas' : frecuenciaUnidad as RecurrenceUnit;
        data.appearanceWeekdays = appearanceMode === 'weekdays' ? appearanceWeekdays : undefined;
        if (appearanceMode === 'quota') {
          data.quotaTarget = Math.max(1, quotaTarget);
          data.quotaPeriodUnit = quotaPeriodUnit;
        } else {
          data.quotaTarget = undefined;
          data.quotaPeriodUnit = undefined;
        }
      } else {
        data.appearanceMode = undefined;
        data.fechaAparicion = undefined;
      }
      data.fechaLimite = (type === 'Tarea' || type === 'Proyecto') ? fechaLimite || undefined : undefined;
    }

    if (type === 'Pulso') {
      data.targetCount = targetCount;
      data.unitLabel = unitLabel;
      data.polaridad = normalizePulsePolarity(polaridad);
    }

    onSave(data);
  };

  const fieldClass = 'h-10 w-full border-0 border-b border-border-line bg-transparent px-0 text-xs text-text-main outline-none transition-colors placeholder:text-text-dim/50 focus:border-text-main';
  const selectClass = `${fieldClass} appearance-none pr-7`;
  const numberClass = `${fieldClass} text-center`;

  return (
    <form
      className="my-1 flex max-w-4xl animate-in flex-col gap-5 fade-in"
      onSubmit={event => {
        event.preventDefault();
        handleSave();
      }}
    >
      <input 
        autoFocus
        type="text" 
        placeholder="Nombre del elemento..."
        className="h-11 w-full border-0 border-b-2 border-border-line bg-transparent px-0 text-base text-text-main outline-none transition-colors placeholder:text-text-dim/60 focus:border-text-main"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') onCancel();
        }}
      />
      <section className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {/* Selector de Tipo (Solo visible al crear, no al editar) */}
        {!initialData && (
          <label className="flex flex-col gap-1.5" title="Tipo de elemento">
            <span className="text-[10px] text-text-dim uppercase font-mono tracking-[0.14em]">Tipo</span>
            <div className="relative">
            <select
              className={cn(selectClass, 'font-medium')}
              value={type}
              onChange={e => {
                const newType = e.target.value as TaskType;
                setType(newType);
                if (newType === 'Hábito' || newType === 'Rutina') {
                  setAppearanceMode('interval');
                  setFechaAparicion(value => value || formatDateOnly(new Date()));
                } else if (newType === 'Proyecto' || newType === 'Pulso') {
                  setAppearanceMode('');
                }
                if (newType === 'Proyecto' || newType === 'Rutina') {
                  setParentId('');
                } else if (newType === 'Hábito' && type === 'Tarea') {
                  setParentId('');
                } else if (newType === 'Tarea' && type === 'Hábito') {
                  setParentId('');
                }
              }}
            >
              <option value="Tarea">Tarea</option>
              <option value="Proyecto">Proyecto</option>
              <option value="Rutina">Rutina</option>
              <option value="Hábito">Hábito</option>
              <option value="Pulso">Pulso (contador)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
            </div>
          </label>
        )}

        {((type === 'Tarea' && !inheritsProjectContext) || type === 'Proyecto' || type === 'Rutina' || (type === 'Hábito' && !isRutinaParent)) && (
          <fieldset className="contents">
            <legend className="col-span-full w-full border-t border-border-line/60 pt-4 text-[10px] font-mono uppercase tracking-[0.18em] text-text-dim">
              Aparición en Hoy
            </legend>
            <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Frecuencia
              <select
                className={selectClass}
                value={appearanceMode}
                onChange={event => setAppearanceMode(event.target.value as AppearanceMode | '')}
              >
                {(type === 'Tarea' || type === 'Proyecto') && <option value="">Sin aparición</option>}
                {type === 'Tarea' && <option value="persistent">Fija hasta completar</option>}
                <option value="interval">Cada intervalo</option>
                <option value="weekdays">Días específicos</option>
                {type === 'Hábito' && <option value="quota">Cuota flexible</option>}
              </select>
            </label>
            {appearanceMode && (
              <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
                {appearanceMode === 'persistent' ? 'Mostrar desde' : appearanceMode === 'quota' ? 'Cuota desde' : 'Calendario desde'}
                <input
                  type="date"
                  required
                  className={cn(fieldClass, 'font-mono')}
                  value={fechaAparicion}
                  onChange={event => setFechaAparicion(event.target.value)}
                />
              </label>
            )}
            {appearanceMode === 'interval' && (
              <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
                Intervalo
                <div className="grid grid-cols-[72px_1fr] gap-2">
                <input type="number" min={1} className={numberClass} value={frecuencia} onChange={e => setFrecuencia(Math.max(1, Number(e.target.value)))} />
                <select className={cn(selectClass, 'normal-case')} value={frecuenciaUnidad} onChange={e => setFrecuenciaUnidad(e.target.value)}>
                  <option value="días">días</option><option value="semanas">semanas</option><option value="meses">meses</option>
                </select>
                </div>
              </label>
            )}
            {appearanceMode === 'weekdays' && (
              <fieldset className="col-span-full flex flex-col gap-2">
                <legend className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-dim">Días</legend>
                <menu className="m-0 flex list-none flex-wrap gap-2 p-0">
                {WEEKDAYS.map(day => {
                  const selected = appearanceWeekdays.includes(day.value);
                  return <button key={day.value} type="button" onClick={() => setAppearanceWeekdays(prev => selected ? prev.filter(value => value !== day.value) : [...prev, day.value].sort())} className={cn('h-9 min-w-10 border-0 border-b-2 bg-transparent px-2 text-[10px] transition-colors cursor-pointer', selected ? 'border-text-main font-medium text-text-main' : 'border-transparent text-text-dim hover:border-border-line hover:text-text-main')}>{day.label}</button>;
                })}
                </menu>
              </fieldset>
            )}
            {appearanceMode === 'quota' && (
              <div className="grid grid-cols-[72px_auto_1fr] items-center gap-2 text-xs text-text-dim">
                <input type="number" min={1} className={numberClass} value={quotaTarget} onChange={event => setQuotaTarget(Math.max(1, Number(event.target.value)))} />
                <span>veces por</span>
                <select className={selectClass} value={quotaPeriodUnit} onChange={event => setQuotaPeriodUnit(event.target.value as QuotaPeriodUnit)}>
                  <option value="semanas">semana</option><option value="meses">mes</option>
                </select>
              </div>
            )}
          </fieldset>
        )}

        {type === 'Hábito' && isRutinaParent && (
          <label className="col-span-full flex max-w-md flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
            Objetivo en el ciclo de la rutina
            <div className="flex items-center gap-2 normal-case tracking-normal">
              <input type="number" min={1} className={cn(numberClass, 'w-20')} value={objetivoPorCiclo} onChange={event => setObjetivoPorCiclo(Math.max(1, Number(event.target.value)))} />
              <span className="text-xs">veces</span>
              {parentRoutineCapacity !== undefined && <span className="text-[10px] font-mono text-text-dim">Máximo seguro: {parentRoutineCapacity}</span>}
            </div>
          </label>
        )}

        {type === 'Rutina' && (
          <>
            <div className="col-span-full border-t border-border-line/60 pt-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-dim">Ciclo de progreso</p>
            </div>
            <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Duración del ciclo
              <div className="grid grid-cols-[72px_1fr] gap-2">
              <input
                type="number"
                min={1}
                className={numberClass}
                value={routineCycleFrequency}
                onChange={event => setRoutineCycleFrequency(Math.max(1, Number(event.target.value)))}
              />
              <select
                className={cn(selectClass, 'font-medium normal-case')}
                value={routineCycleUnit}
                onChange={event => setRoutineCycleUnit(event.target.value as RecurrenceUnit)}
              >
                <option value="días">días</option>
                <option value="semanas">semanas</option>
                <option value="meses">meses</option>
              </select>
              </div>
            </label>
            <p className="self-end pb-2 text-[10px] font-mono text-text-dim sm:col-span-1 lg:col-span-2">
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
            <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Meta
              <div className="grid grid-cols-[72px_1fr] gap-2">
              <input 
                type="number" 
                min={1} 
                className={numberClass}
                value={targetCount} 
                onChange={e => setTargetCount(Number(e.target.value))}
              />
              <input 
                type="text"
                className={cn(fieldClass, 'font-medium')}
                placeholder="veces"
                value={unitLabel}
                onChange={e => setUnitLabel(e.target.value)}
              />
              </div>
            </label>
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Dirección</span>
              <select 
                className={selectClass}
                value={polaridad} 
                onChange={e => setPolaridad(e.target.value as any)}
              >
                 <option value="Reforzar">Reforzar</option>
                 <option value="Abandonar">Abandonar</option>
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-text-dim" />
            </div>
          </>
        )}

        {(type === 'Tarea' || type === 'Proyecto') && (
          <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
            Fecha límite
            <input
              type="date"
              className={cn(fieldClass, 'font-mono')}
              value={fechaLimite}
              onChange={e => setFechaLimite(e.target.value)}
            />
          </label>
        )}

        {/* Hora (Tarea/Rutina/Hábito simple) */}
        {(
          (type === 'Proyecto' && !!appearanceMode)
          || ((type === 'Tarea' || type === 'Rutina' || type === 'Hábito') && !isActualSubtask && !inheritsProjectContext)
        ) && (
          <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
            Hora opcional
            <input
              type="time"
              className={cn(fieldClass, 'font-mono')}
              value={hora}
              onChange={e => setHora(e.target.value)}
            />
          </label>
        )}

        {/* Área / Categoría (Todos excepto Subtareas) */}
        {(!isActualSubtask || type === 'Hábito') && !inheritsProjectContext && (
          <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Área</span>
              <select 
                className={selectClass}
                value={area} 
                onChange={e => { setArea(e.target.value); setSubCategory(''); }}
              >
                <option value="">Sin Área</option>
                {Object.keys(config?.areas || {}).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-text-dim" />
            </label>
            
            {area && typeof config?.areas?.[area] !== 'string' && (config?.areas?.[area] as any)?.categories?.length > 0 && (
              <label className="relative flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Categoría</span>
                <select 
                  className={selectClass}
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                >
                  <option value="">Sin Categoría</option>
                  {((config?.areas?.[area] as any)?.categories || []).map((sc: string) => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-text-dim" />
              </label>
            )}
          </div>
        )}

        {/* Duración (Tarea/Hábito) */}
        {(type === 'Tarea' || type === 'Hábito') && (
          <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
            Duración estimada
            <div className="relative">
            <input 
              type="number" step="0.25" min="0" 
              className={cn(fieldClass, 'pr-8 font-medium')}
              value={duracion || ''}
              onChange={e => setDuracion(Number(e.target.value))}
              placeholder="0.0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-dim">h</span>
            </div>
          </label>
        )}

        {/* Asignación Energética (Tarea/Proyecto) */}
        {type === 'Tarea' && (
          <label className="relative flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Asignación</span>
            <select 
              className={selectClass}
              value={allocationType} 
              onChange={e => setAllocationType(e.target.value as any)}
            >
               <option value="growth">Inversión</option>
               <option value="fixed">Soporte vital</option>
               <option value="mixed">Mixto</option>
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-text-dim" />
          </label>
        )}
      </section>

      {/* Pertenece a / Asociar a Rutina o Proyecto (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && !isRutinaParent && (
        <section className="flex w-full flex-col gap-1.5 border-t border-border-line/60 pt-4 text-left">
          <label htmlFor={`parent-${initialData?.id || 'new'}`} className="text-[10px] font-mono uppercase tracking-wider text-text-dim">
            {type === 'Hábito' ? 'Rutina asociada:' : 'Proyecto asociado:'}
          </label>
          <section className="relative max-w-md">
            <select
              id={`parent-${initialData?.id || 'new'}`}
              className={selectClass}
              value={parentId}
              onChange={e => {
                setParentId(e.target.value);
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
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))
              }
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
          </section>
        </section>
      )}

      {inheritsProjectContext && inheritedProjectHere && (
        <section className="border-t border-border-line/60 pt-4 text-left" aria-labelledby={`inherited-project-${initialData?.id || 'new'}`}>
          <header className="mb-3 flex items-center justify-between gap-4">
            <p id={`inherited-project-${initialData?.id || 'new'}`} className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-dim">
              Contexto heredado del proyecto
            </p>
            {onEditProject && (
              <button
                type="button"
                onClick={() => onEditProject(inheritedProjectHere.id)}
                className="border-0 bg-transparent p-0 text-[10px] font-mono uppercase tracking-[0.12em] text-primary hover:text-text-main"
              >
                Editar proyecto
              </button>
            )}
          </header>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-2 border-l border-border-line/70 pl-4 text-xs">
            <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Proyecto</dt>
            <dd className="text-text-main">{inheritedProjectHere.text}</dd>
            <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Aparición</dt>
            <dd className="text-text-main">{getProjectScheduleLabel(inheritedProjectHere)}{inheritedProjectHere.hora ? ` · ${inheritedProjectHere.hora}` : ''}</dd>
            <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Área</dt>
            <dd className="text-text-main">{inheritedProjectHere.category || 'Sin área'}</dd>
            <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Categoría</dt>
            <dd className="text-text-main">{inheritedProjectHere.subCategory || 'Sin categoría'}</dd>
          </dl>
        </section>
      )}

      {/* Dependencias (Tarea) */}
      {type === 'Tarea' && (
        <section className="flex w-full flex-col gap-1.5 border-t border-border-line/60 pt-4 text-left">
          <label htmlFor={`dependency-${initialData?.id || 'new'}`} className="text-[10px] font-mono uppercase tracking-wider text-text-dim">Depende de (prerrequisito)</label>
          <section className="relative max-w-sm">
            <input 
              id={`dependency-${initialData?.id || 'new'}`}
              type="text"
              placeholder="Buscar tarea compañera..."
              className={fieldClass}
              value={depSearch}
              onChange={e => setDepSearch(e.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') event.preventDefault();
              }}
            />
            {depSearch && (
              <ul className="absolute top-full z-10 m-0 mt-1 max-h-40 w-full list-none overflow-y-auto border border-border-line bg-base p-0">
                {allTasks
                  .filter(t => (t.type === 'Tarea' || t.type === 'Hábito' || t.type === 'Rutina') && t.id !== initialData?.id && t.text.toLowerCase().includes(depSearch.toLowerCase()))
                  .map(t => (
                    <li key={t.id} className="border-b border-border-line/40 last:border-b-0">
                      <button
                        type="button"
                        className="w-full truncate border-0 bg-transparent px-3 py-2 text-left text-xs hover:bg-base-dim/40"
                        onClick={() => {
                          setDependencyId(t.id);
                          setDepSearch('');
                        }}
                      >
                        {t.text}
                      </button>
                    </li>
                  ))
                }
              </ul>
            )}
            {dependencyId && (
              <p className="mt-1 flex items-center gap-2">
                <output className="flex-1 truncate text-xs font-medium text-amber-600">
                  {allTasks.find(t => t.id === dependencyId)?.text || 'Tarea desconocida'}
                </output>
                <button type="button" onClick={() => setDependencyId('')} className="cursor-pointer border-0 bg-transparent text-xs text-red-500 hover:underline">Quitar</button>
              </p>
            )}
          </section>
        </section>
      )}

      {/* Notas (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && (
        <div className="flex w-full flex-col gap-1.5 border-t border-border-line/60 pt-4 text-left">
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider">Notas:</span>
          <textarea 
            placeholder="Notas y contexto..."
            className="min-h-[96px] w-full resize-y border-0 border-b border-border-line bg-transparent px-0 py-2 text-xs font-sans font-light leading-relaxed text-text-main outline-none placeholder:text-text-dim/50 focus:border-text-main"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      )}

      {/* Checklist (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && (
        <div className="flex w-full flex-col gap-2 border-t border-border-line/60 pt-4 text-left">
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
                      className="flex min-h-10 items-center gap-2 border-b border-border-line/60 bg-transparent px-0 py-2 select-none cursor-grab active:cursor-grabbing"
                    >
                      <GripIcon />
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            className="w-full border-0 border-b border-text-main bg-transparent px-0 py-0.5 text-xs text-text-main outline-none"
                            value={editingChecklistItemText}
                            onChange={e => setEditingChecklistItemText(e.target.value)}
                            onBlur={() => handleSaveChecklistItemText(item.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveChecklistItemText(item.id);
                              }
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
                            <LinkedText text={item.text} />
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
              className={cn(fieldClass, 'flex-1')}
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
              className="flex h-10 w-10 items-center justify-center border-0 bg-text-main text-base outline-none transition-colors hover:bg-text-main/85 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {validationError && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-500">
          {validationError}
        </p>
      )}
      <footer className="flex items-center gap-3 border-t border-border-line/60 pt-4">
        <button type="submit" className="h-10 border-0 bg-text-main px-4 text-xs font-bold uppercase tracking-[0.16em] text-base outline-none transition-colors hover:bg-text-main/85 active:scale-[0.98] cursor-pointer">
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="h-10 border-0 bg-transparent px-2 text-xs font-mono uppercase tracking-[0.12em] text-text-dim outline-none transition-colors hover:text-text-main cursor-pointer">
          Cancelar
        </button>
      </footer>
    </form>
  );
}
