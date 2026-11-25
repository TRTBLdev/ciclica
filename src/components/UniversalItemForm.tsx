import React, { useState } from 'react';
import { AppTask, AppearanceMode, Config, TaskType, ChecklistItem, QuotaPeriodUnit, RecurrenceUnit } from '../types';
import { Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Reorder } from 'motion/react';
import LinkedText from './ui/LinkedText';
import Select from './ui/Select';
import { formatDateOnly, getCalendarCycleRange } from '../domain/recurrenceProgress';
import { normalizePulsePolarity } from '../domain/trackingProgress';
import { canConfigureOwnAppearance, getAppearanceDate, getAppearanceMode, getDeadlineDate, getIdealHabitSpacing, getMinimumRoutineOpportunityCount } from '../domain/appearance';
import { getAllMoments } from '../domain/moments';
import { getProjectScheduleLabel } from '../domain/projectPresentation';
import { getProjectForTask } from '../domain/workTracking';
import { resolveDurationForSave } from '../domain/durationEstimate';
import DurationEstimateField from './DurationEstimateField';

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

export function getAppearanceValidationError(
  configuresOwnAppearance: boolean,
  appearanceMode: AppearanceMode | '',
  appearanceDate: string,
  appearanceWeekdays: number[],
): string {
  if (!configuresOwnAppearance) return '';
  if (appearanceMode && !appearanceDate) return 'Indica la fecha inicial de la aparición.';
  if (appearanceMode === 'weekdays' && appearanceWeekdays.length === 0) {
    return 'Selecciona al menos un día específico.';
  }
  return '';
}

export default function UniversalItemForm({ initialData, defaultType = 'Tarea', defaultText = '', config, allTasks, onSave, onCancel, onEditProject }: Props) {
  const [text, setText] = useState(initialData?.text || defaultText);
  const [type, setType] = useState<TaskType>(initialData?.type || defaultType);
  const [priority, setPriority] = useState(initialData?.priority || 'Baja');
  const [momentId, setMomentId] = useState(initialData?.momentId || '');
  const [hora, setHora] = useState(initialData?.hora || '');
  const [showSpecificHour, setShowSpecificHour] = useState(Boolean(initialData?.hora));
  const [idealSpacingDays, setIdealSpacingDays] = useState<string>(
    initialData?.idealSpacingDays ? String(initialData.idealSpacingDays) : '',
  );
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
  const [editedDuracion, setEditedDuracion] = useState<number | null>(null);
  const duracion = editedDuracion ?? initialData?.duracion ?? 0;
  const [dependencyId, setDependencyId] = useState(initialData?.dependencyId || '');
  const [allocationType, setAllocationType] = useState<'fixed' | 'growth' | 'mixed'>(initialData?.allocationType || 'growth');
  
  // Specific to Pulso (Contador)
  const [targetCount, setTargetCount] = useState(initialData?.targetCount || 1);
  const [unitLabel, setUnitLabel] = useState(initialData?.unitLabel || 'veces');
  const [polaridad, setPolaridad] = useState<'Reforzar' | 'Abandonar'>(() => normalizePulsePolarity(initialData?.polaridad));

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialData?.checklist || []);
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSaveChecklistItemText = (id: string) => {
    if (editingChecklistItemText.trim()) {
      setChecklist(prev => prev.map(item => item.id === id ? { ...item, text: editingChecklistItemText.trim() } : item));
    }
    setEditingChecklistItemId(null);
  };

  const parentTaskHere = parentId ? allTasks.find(t => t.id === parentId) : undefined;
  const parentRoutineHere = parentTaskHere?.type === 'Rutina' ? parentTaskHere : undefined;
  const isRutinaParent = !!parentRoutineHere;
  const inheritedProjectHere = type === 'Tarea' && parentId ? getProjectForTask(parentId, allTasks) : null;
  const inheritsProjectContext = !!inheritedProjectHere;
  const configuresOwnAppearance = canConfigureOwnAppearance(type, parentId || undefined, allTasks);
  const isActualSubtask = !!(parentTaskHere && parentTaskHere.type !== 'Proyecto');
  const parentRoutineCapacity = parentRoutineHere ? getMinimumRoutineOpportunityCount(parentRoutineHere) : undefined;
  const allMoments = getAllMoments(config?.separators);
  const parentRoutineMoment = parentRoutineHere?.momentId
    ? allMoments.find(m => m.id === parentRoutineHere.momentId)
    : undefined;

  const handleSave = () => {
    if (!text.trim()) return;
    setValidationError('');

    const appearanceError = getAppearanceValidationError(
      configuresOwnAppearance,
      appearanceMode,
      fechaAparicion,
      appearanceWeekdays,
    );
    if (appearanceError) {
      setValidationError(appearanceError);
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
      data.momentId = momentId || undefined;
      data.hora = showSpecificHour ? hora : '';
    }
    if (type === 'Hábito') {
      const parsedSpacing = parseInt(idealSpacingDays, 10);
      data.idealSpacingDays = Number.isFinite(parsedSpacing) && parsedSpacing >= 1 ? parsedSpacing : undefined;
    }
    if (type === 'Tarea' || type === 'Rutina' || type === 'Hábito') {
      data.duracion = resolveDurationForSave(initialData?.duracion, editedDuracion);
    }

    if (type === 'Rutina') {
      data.routineCycleFrequency = routineCycleFrequency;
      data.routineCycleUnit = routineCycleUnit;
      data.routineCycleAnchorDate = (initialData?.routineCycleAnchorDate || formatDateOnly(new Date())).slice(0, 10);
    }

    if (type !== 'Pulso') {
      const childHabit = type === 'Hábito' && isRutinaParent;
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
          if (e.key === 'Escape') {
            if (e.defaultPrevented || document.querySelector('[data-ciclica-select-open="true"]')) return;
            e.stopPropagation();
            onCancel();
          }
        }}
      />
      <section className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {/* Selector de Tipo (Solo visible al crear, no al editar) */}
        {!initialData && (
          <label className="flex flex-col gap-1.5" title="Tipo de elemento">
            <span className="text-[10px] text-text-dim uppercase font-mono tracking-[0.14em]">Tipo</span>
            <Select
              variant="underline"
              className="font-medium"
              ariaLabel="Tipo de elemento"
              value={type}
              onChange={val => {
                const newType = val as TaskType;
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
              options={[
                { value: 'Tarea', label: 'Tarea' },
                { value: 'Proyecto', label: 'Proyecto' },
                { value: 'Rutina', label: 'Rutina' },
                { value: 'Hábito', label: 'Hábito' },
                { value: 'Pulso', label: 'Pulso (contador)' },
              ]}
            />
          </label>
        )}

        {configuresOwnAppearance && (
          <fieldset className="contents">
            <legend className="col-span-full w-full border-t border-border-line/60 pt-4 text-[10px] font-mono uppercase tracking-[0.18em] text-text-dim">
              Aparición en Hoy
            </legend>
            <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Frecuencia
              <Select
                variant="underline"
                ariaLabel="Frecuencia"
                value={appearanceMode}
                onChange={val => setAppearanceMode(val as AppearanceMode | '')}
                options={[
                  ...((type === 'Tarea' || type === 'Proyecto') ? [{ value: '', label: 'Sin aparición' }] : []),
                  ...(type === 'Tarea' ? [{ value: 'persistent', label: 'Fija hasta completar' }] : []),
                  { value: 'interval', label: 'Cada intervalo' },
                  { value: 'weekdays', label: 'Días específicos' },
                  ...(type === 'Hábito' ? [{ value: 'quota', label: 'Cuota flexible' }] : []),
                ]}
              />
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
                <Select
                  variant="underline"
                  className="normal-case"
                  ariaLabel="Unidad de intervalo"
                  value={frecuenciaUnidad}
                  onChange={setFrecuenciaUnidad}
                  options={[
                    { value: 'días', label: 'días' },
                    { value: 'semanas', label: 'semanas' },
                    { value: 'meses', label: 'meses' },
                  ]}
                />
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
              <div className="col-span-full flex flex-wrap items-center gap-4">
                <div className="grid grid-cols-[72px_auto_1fr] items-center gap-2 text-xs text-text-dim">
                  <input type="number" min={1} className={numberClass} value={quotaTarget} onChange={event => setQuotaTarget(Math.max(1, Number(event.target.value)))} />
                  <span>veces por</span>
                  <Select
                    variant="underline"
                    ariaLabel="Período de cuota"
                    value={quotaPeriodUnit}
                    onChange={val => setQuotaPeriodUnit(val as QuotaPeriodUnit)}
                    options={[
                      { value: 'semanas', label: 'semana' },
                      { value: 'meses', label: 'mes' },
                    ]}
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
                  Espaciado ideal (días)
                  <input
                    type="number"
                    min={1}
                    className={cn(numberClass, 'w-20')}
                    placeholder={`Auto (${getIdealHabitSpacing(quotaPeriodUnit === 'meses' ? 30 : 7, Math.max(1, quotaTarget))})`}
                    value={idealSpacingDays}
                    onChange={event => setIdealSpacingDays(event.target.value)}
                  />
                </label>
              </div>
            )}
          </fieldset>
        )}

        {type === 'Hábito' && parentRoutineHere && (
          <>
            <section className="col-span-full border-l border-border-line/70 pl-4 text-left" aria-labelledby={`inherited-routine-${initialData?.id || 'new'}`}>
              <header className="mb-3">
                <p id={`inherited-routine-${initialData?.id || 'new'}`} className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-dim">
                  Programación heredada de la rutina
                </p>
              </header>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-2 text-xs">
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Rutina</dt>
                <dd className="text-text-main">{parentRoutineHere.text}</dd>
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Aparición</dt>
                <dd className="text-text-main">{getProjectScheduleLabel(parentRoutineHere)}</dd>
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Fecha inicial</dt>
                <dd className="font-mono text-text-main">{getAppearanceDate(parentRoutineHere) || 'Sin fecha configurada'}</dd>
                <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">Momento</dt>
                <dd className="font-mono text-text-main">
                  {parentRoutineMoment
                    ? `${parentRoutineMoment.text}${parentRoutineHere.hora ? ` · ${parentRoutineHere.hora}` : ` (${parentRoutineMoment.hora})`}`
                    : parentRoutineHere.hora || 'Cuando pueda'}
                </dd>
              </dl>
              <small className="mt-3 block text-[10px] text-text-dim">
                Para cambiar esta programación, edita la rutina.
              </small>
            </section>
            <fieldset className="col-span-full flex max-w-xl flex-wrap items-center gap-4 border-0 p-0">
              <legend className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
                Objetivo en el ciclo de la rutina
              </legend>
              <label className="flex items-center gap-2 normal-case tracking-normal">
                <input type="number" min={1} className={cn(numberClass, 'w-20')} value={objetivoPorCiclo} onChange={event => setObjetivoPorCiclo(Math.max(1, Number(event.target.value)))} />
                <small className="text-xs">veces</small>
                {parentRoutineCapacity !== undefined && <small className="text-[10px] font-mono text-text-dim">Máximo seguro: {parentRoutineCapacity}</small>}
              </label>
              {parentRoutineCapacity !== undefined && objetivoPorCiclo < parentRoutineCapacity && (
                <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
                  Espaciado ideal
                  <input
                    type="number"
                    min={1}
                    className={cn(numberClass, 'w-20')}
                    placeholder={`Auto (${getIdealHabitSpacing(parentRoutineCapacity, Math.max(1, objetivoPorCiclo))})`}
                    value={idealSpacingDays}
                    onChange={event => setIdealSpacingDays(event.target.value)}
                  />
                </label>
              )}
            </fieldset>
          </>
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
              <Select
                variant="underline"
                className="font-medium normal-case"
                ariaLabel="Unidad de ciclo de rutina"
                value={routineCycleUnit}
                onChange={val => setRoutineCycleUnit(val as RecurrenceUnit)}
                options={[
                  { value: 'días', label: 'días' },
                  { value: 'semanas', label: 'semanas' },
                  { value: 'meses', label: 'meses' },
                ]}
              />
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
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Dirección</span>
              <Select
                variant="underline"
                ariaLabel="Dirección"
                value={polaridad}
                onChange={val => setPolaridad(val as 'Reforzar' | 'Abandonar')}
                options={[
                  { value: 'Reforzar', label: 'Reforzar' },
                  { value: 'Abandonar', label: 'Abandonar' },
                ]}
              />
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

        {/* Momento del día principal (con Hora específica plegada) */}
        {(
          (type === 'Proyecto' && !!appearanceMode)
          || ((type === 'Tarea' || type === 'Rutina' || type === 'Hábito') && !isActualSubtask && !inheritsProjectContext)
        ) && (
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Momento del día
              <Select
                variant="underline"
                ariaLabel="Momento del día"
                value={momentId}
                onChange={setMomentId}
                options={[
                  { value: '', label: 'Cuando pueda (sin momento)' },
                  ...allMoments.map(m => ({
                    value: m.id,
                    label: m.kind === 'trigger' ? `⚓ ${m.text} (~${m.hora})` : `${m.hora} · ${m.text}`,
                  })),
                ]}
              />
            </label>
            {!showSpecificHour ? (
              <button
                type="button"
                onClick={() => setShowSpecificHour(true)}
                className="self-start border-0 bg-transparent p-0 font-mono text-[9px] uppercase tracking-wider text-text-dim hover:text-text-main cursor-pointer"
              >
                + Hora específica (opcional)
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label="Hora específica opcional"
                  className={cn(fieldClass, 'font-mono h-8')}
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setHora('');
                    setShowSpecificHour(false);
                  }}
                  className="border-0 bg-transparent px-1 text-[10px] font-mono text-text-dim hover:text-red-500 cursor-pointer"
                  title="Quitar hora específica"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Área / Categoría (Todos excepto Subtareas) */}
        {(!isActualSubtask || type === 'Hábito') && !inheritsProjectContext && (
          <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Área</span>
              <Select
                variant="underline"
                searchable={true}
                ariaLabel="Área"
                value={area}
                onChange={val => {
                  setArea(val);
                  setSubCategory('');
                }}
                options={[
                  { value: '', label: 'Sin Área' },
                  ...Object.keys(config?.areas || {}).map(a => ({ value: a, label: a })),
                ]}
              />
            </label>
            
            {area && typeof config?.areas?.[area] !== 'string' && (config?.areas?.[area] as any)?.categories?.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Categoría</span>
                <Select
                  variant="underline"
                  searchable={true}
                  ariaLabel="Categoría"
                  value={subCategory}
                  onChange={setSubCategory}
                  options={[
                    { value: '', label: 'Sin Categoría' },
                    ...((config?.areas?.[area] as any)?.categories || []).map((sc: string) => ({
                      value: sc,
                      label: sc,
                    })),
                  ]}
                />
              </label>
            )}
          </div>
        )}

        {/* Duración (Tarea/Hábito) */}
        {(type === 'Tarea' || type === 'Hábito') && (
          <DurationEstimateField
            idPrefix={`duration-${initialData?.id || 'new'}`}
            value={duracion}
            onChange={setEditedDuracion}
          />
        )}

        {/* Asignación Energética (Tarea/Proyecto) */}
        {type === 'Tarea' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-dim">Asignación</span>
            <Select
              variant="underline"
              ariaLabel="Asignación"
              value={allocationType}
              onChange={val => setAllocationType(val as 'fixed' | 'growth' | 'mixed')}
              options={[
                { value: 'growth', label: 'Inversión' },
                { value: 'fixed', label: 'Soporte vital' },
                { value: 'mixed', label: 'Mixto' },
              ]}
            />
          </label>
        )}
      </section>

      {/* Pertenece a / Asociar a Rutina o Proyecto (Tarea/Hábito) */}
      {(type === 'Tarea' || type === 'Hábito') && (
        <section className="flex w-full flex-col gap-1.5 border-t border-border-line/60 pt-4 text-left">
          <label htmlFor={`parent-${initialData?.id || 'new'}`} className="text-[10px] font-mono uppercase tracking-wider text-text-dim">
            {type === 'Hábito' ? 'Rutina asociada:' : 'Proyecto asociado:'}
          </label>
          <div className="max-w-md">
            <Select
              id={`parent-${initialData?.id || 'new'}`}
              variant="underline"
              searchable={true}
              value={parentId}
              onChange={setParentId}
              options={[
                { value: '', label: '(Ninguno) Raíz' },
                ...allTasks
                  .filter(t => {
                    if (type === 'Hábito') {
                      return t.type === 'Rutina';
                    }
                    if (type === 'Tarea') {
                      return t.type === 'Proyecto';
                    }
                    return (t.type === 'Proyecto' || t.type === 'Rutina' || (t.type === 'Tarea' && t.id !== initialData?.id && t.parentId !== initialData?.id));
                  })
                  .map(t => ({ value: t.id, label: t.text })),
              ]}
            />
          </div>
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
          <div className="max-w-sm">
            <Select
              id={`dependency-${initialData?.id || 'new'}`}
              variant="underline"
              searchable={true}
              placeholder="(Ninguno)"
              value={dependencyId}
              onChange={setDependencyId}
              options={[
                { value: '', label: '(Ninguno)' },
                ...allTasks
                  .filter(t => (t.type === 'Tarea' || t.type === 'Hábito' || t.type === 'Rutina') && t.id !== initialData?.id)
                  .map(t => ({ value: t.id, label: t.text })),
              ]}
            />
          </div>
        </section>
      )}

      {/* Notas (Tarea/Hábito/Proyecto/Rutina) */}
      {(type === 'Tarea' || type === 'Hábito' || type === 'Proyecto' || type === 'Rutina') && (
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
          <span className="text-[10px] text-text-dim font-mono uppercase tracking-wider font-bold">Checklist (Guía Operativa):</span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {checklist.length === 0 ? (
              <span className="text-[10px] text-text-dim italic pl-1 font-light">Sin ítems en el checklist</span>
            ) : (
              <Reorder.Group axis="y" values={checklist} onReorder={setChecklist} className="space-y-1.5">
                {checklist.map(item => {
                  const isEditing = editingChecklistItemId === item.id;
                  return (
                    <Reorder.Item 
                      key={item.id} 
                      value={item} 
                      className="flex items-center justify-between gap-2 py-1 px-1 rounded hover:bg-base-dim/20 group/chk cursor-grab active:cursor-grabbing border-b border-border-line/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <GripIcon />
                        <button
                          type="button"
                          onClick={() => {
                            setChecklist(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
                          }}
                          className="focus:outline-none bg-transparent border-0 p-0 text-text-dim hover:text-accent cursor-pointer flex items-center justify-center shrink-0"
                          title={item.done ? "Marcar como pendiente" : "Marcar como completado"}
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 stroke-[2.25]" />
                          ) : (
                            <Circle className="w-4 h-4 text-text-dim/60 stroke-[2.25]" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-full bg-base border border-border-line rounded px-1.5 py-0.5 text-xs text-text-main focus:outline-none focus:border-[#a2b29f]"
                              value={editingChecklistItemText}
                              onChange={e => setEditingChecklistItemText(e.target.value)}
                              onBlur={() => handleSaveChecklistItemText(item.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveChecklistItemText(item.id);
                                }
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  setEditingChecklistItemId(null);
                                }
                              }}
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingChecklistItemId(item.id);
                                setEditingChecklistItemText(item.text);
                              }}
                              className={cn("text-xs text-text-main cursor-text block truncate font-light", item.done && "line-through opacity-50")}
                              title="Haz clic para editar"
                            >
                              <LinkedText text={item.text} />
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                        className="text-text-dim/60 hover:text-red-500 active:text-red-600 bg-transparent border-0 cursor-pointer shrink-0 p-1 rounded hover:bg-base-dim/40 transition-colors flex items-center justify-center"
                        title="Eliminar ítem"
                        aria-label="Eliminar ítem"
                      >
                        <X className="w-3.5 h-3.5" />
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
      <footer className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-border-line/60 bg-base/95 backdrop-blur-sm py-3">
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
