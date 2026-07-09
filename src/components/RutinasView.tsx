import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType } from '../types';
import TaskItem from './TaskItem';
import SectionList from './ui/SectionList';
import ViewHeader from './ui/ViewHeader';
import { RotateCw, Plus, ChevronDown, ChevronUp, ChevronRight, Edit2, Trash2, Save, Repeat, Activity, Sliders, X, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, getAreaColorClasses, isSameDay, isFutureDate } from '../lib/utils';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history?: HistoryRecord[];
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  focusTaskId?: string | null;
}

export default function RutinasView({ config, tasks, history, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, focusTaskId }: Props) {
  // Collapsible Add Forms state
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddPulso, setShowAddPulso] = useState(false);

  // Accordion states
  const [isRoutinesOpen, setIsRoutinesOpen] = useState(true);
  const [isHabitsOpen, setIsHabitsOpen] = useState(true);
  const [isPulsosOpen, setIsPulsosOpen] = useState(true);

  // Creation form states
  const [newRoutineText, setNewRoutineText] = useState('');
  const [routineArea, setRoutineArea] = useState('');
  const [routineSubCat, setRoutineSubCat] = useState('');

  const [newHabitText, setNewHabitText] = useState('');
  const [habitArea, setHabitArea] = useState('');
  const [habitSubCat, setHabitSubCat] = useState('');
  const [habitFreq, setHabitFreq] = useState(1);
  const [habitFreqUnit, setHabitFreqUnit] = useState<'días' | 'semanas' | 'meses'>('días');

  const [newPulsoText, setNewPulsoText] = useState('');
  const [pulsoArea, setPulsoArea] = useState('');
  const [pulsoSubCat, setPulsoSubCat] = useState('');
  const [pulsoTarget, setPulsoTarget] = useState(8);
  const [pulsoUnit, setPulsoUnit] = useState('veces');
  const [pulsoPolaridad, setPulsoPolaridad] = useState<'Reforzar' | 'Abandonar'>('Reforzar');

  // Expanded routines state
  const [expandedRoutines, setExpandedRoutines] = useState<string[]>([]);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editRoutineForm, setEditRoutineForm] = useState({ text: '', hora: '', category: '', subCategory: '', fechaPlanificada: '', view: 'Hoy', frecuencia: 1, frecuenciaUnidad: 'días' });

  // Editing pulso state
  const [editingPulsoId, setEditingPulsoId] = useState<string | null>(null);
  const [editPulsoForm, setEditPulsoForm] = useState({ text: '', targetCount: 1, unitLabel: 'veces', polaridad: 'Reforzar', category: '', subCategory: '' });
  const [openMenuPulsoId, setOpenMenuPulsoId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'name'>('manual');
  const [openMenuRoutineId, setOpenMenuRoutineId] = useState<string | null>(null);
  const [menuRoutineUpwards, setMenuRoutineUpwards] = useState(false);

  const sortTasks = (taskList: AppTask[], criterion: string) => {
    const isCompletedVisual = (t: AppTask) => t.type === 'Hábito' ? isFutureDate(t.fechaPlanificada) : t.completed;

    const pending = taskList.filter(t => !isCompletedVisual(t));
    const completed = taskList.filter(t => isCompletedVisual(t));

    let sortedPending = [...pending];
    if (criterion === 'manual') {
      const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const withOrders = baseline.map((t, idx) => ({
        ...t,
        order: t.order !== undefined ? t.order : (idx + 1) * 1000
      }));
      sortedPending = withOrders.sort((a, b) => a.order - b.order);
    } else if (criterion === 'priority') {
      const pVal = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      sortedPending.sort((a, b) => {
        const aVal = pVal[a.priority || 'Baja'] || 1;
        const bVal = pVal[b.priority || 'Baja'] || 1;
        return bVal - aVal;
      });
    } else if (criterion === 'name') {
      sortedPending.sort((a, b) => a.text.localeCompare(b.text));
    } else if (criterion === 'date') {
      sortedPending.sort((a, b) => {
        const aTime = a.fechaPlanificada ? new Date(a.fechaPlanificada).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.fechaPlanificada ? new Date(b.fechaPlanificada).getTime() : new Date(b.createdAt).getTime();
        return aTime - bTime;
      });
    }

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };



  React.useEffect(() => {
    if (focusTaskId) {
      const foundTask = tasks.find(t => t.id === focusTaskId);
      if (foundTask) {
        let routineToExpand = '';
        if (foundTask.type === 'Rutina') {
          routineToExpand = foundTask.id;
        } else if (foundTask.parentId) {
          const parent = tasks.find(t => t.id === foundTask.parentId);
          if (parent && parent.type === 'Rutina') {
            routineToExpand = parent.id;
          }
        }
        
        if (routineToExpand) {
          setExpandedRoutines(prev => prev.includes(routineToExpand) ? prev : [...prev, routineToExpand]);
        }
        
        // Scroll and highlight
        setTimeout(() => {
          const el = document.getElementById(`task-item-${focusTaskId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-[var(--color-border-line)]/40', 'transition-all', 'duration-500');
            setTimeout(() => {
              el.classList.remove('bg-[var(--color-border-line)]/40');
            }, 2000);
          }
        }, 150);
      }
    }
  }, [focusTaskId, tasks]);

  const routines = sortTasks(tasks.filter(t => t.type === 'Rutina' && !t.completed), sortBy);
  const standaloneHabits = sortTasks(tasks.filter(t => t.type === 'Hábito' && (!t.parentId || !tasks.some(p => p.id === t.parentId))), sortBy);
  const pulsos = tasks.filter(t => t.type === 'Pulso');

  const startEdit = (routine: AppTask) => {
    setEditRoutineForm({ 
      text: routine.text, 
      hora: routine.hora || '', 
      category: routine.category || '', 
      subCategory: routine.subCategory || '',
      fechaPlanificada: routine.fechaPlanificada ? new Date(routine.fechaPlanificada).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      view: routine.view || 'Hoy',
      frecuencia: routine.frecuencia || 1,
      frecuenciaUnidad: routine.frecuenciaUnidad || 'días'
    });
    setEditingRoutineId(routine.id);
  };

  const getRoutineSiblings = (routine: AppTask) => {
    const siblingsList = tasks.filter(t => t.type === 'Rutina');
    const pending = siblingsList.filter(t => !t.completed);
    const completed = siblingsList.filter(t => t.completed);

    const baseline = [...pending].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const withOrders = baseline.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : (idx + 1) * 1000
    }));
    const sortedPending = withOrders.sort((a, b) => a.order - b.order);

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };

  const handleMoveRoutineUp = (routine: AppTask) => {
    const siblings = getRoutineSiblings(routine);
    const idx = siblings.findIndex(s => s.id === routine.id);
    if (idx <= 0) return;

    const targetIdx = idx - 1;
    let newOrder = 1000;
    if (targetIdx === 0) {
      newOrder = siblings[0].order - 1000;
    } else {
      const prevOrder = siblings[targetIdx - 1].order;
      const nextOrder = siblings[targetIdx].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }
    onUpdateTask(routine.id, { order: newOrder });
  };

  const handleMoveRoutineDown = (routine: AppTask) => {
    const siblings = getRoutineSiblings(routine);
    const idx = siblings.findIndex(s => s.id === routine.id);
    if (idx === -1 || idx === siblings.length - 1) return;

    const targetIdx = idx + 1;
    let newOrder = 1000;
    if (targetIdx === siblings.length - 1) {
      newOrder = siblings[siblings.length - 1].order + 1000;
    } else {
      const prevOrder = siblings[targetIdx].order;
      const nextOrder = siblings[targetIdx + 1].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }
    onUpdateTask(routine.id, { order: newOrder });
  };

  const handleSaveEdit = () => {
    if (!editRoutineForm.text.trim() || !editingRoutineId) return;
    
    const updates: Partial<AppTask> = {
      text: editRoutineForm.text.trim(),
      hora: editRoutineForm.hora,
      category: editRoutineForm.category,
      subCategory: editRoutineForm.subCategory,
      view: editRoutineForm.view,
      frecuencia: Number(editRoutineForm.frecuencia),
      frecuenciaUnidad: editRoutineForm.frecuenciaUnidad as any
    };
    
    if (editRoutineForm.fechaPlanificada) {
      const planDate = new Date(editRoutineForm.fechaPlanificada);
      if (!isNaN(planDate.getTime())) {
         updates.fechaPlanificada = planDate.toISOString();
      }
    }
    
    onUpdateTask(editingRoutineId, updates);
    setEditingRoutineId(null);
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineText.trim()) return;

    onAddTask({
      userId: 'placeholder',
      text: newRoutineText.trim(),
      type: 'Rutina',
      createdAt: new Date().toISOString(),
      priority: 'Media',
      completed: false,
      category: routineArea || undefined,
      subCategory: routineSubCat || undefined
    });
    setNewRoutineText('');
    setRoutineArea('');
    setRoutineSubCat('');
    setShowAddRoutine(false);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;

    onAddTask({
      userId: 'placeholder',
      text: newHabitText.trim(),
      type: 'Hábito',
      completed: false,
      createdAt: new Date().toISOString(),
      fechaPlanificada: new Date().toISOString(),
      frecuencia: habitFreq,
      frecuenciaUnidad: habitFreqUnit,
      category: habitArea || undefined,
      subCategory: habitSubCat || undefined
    });
    setNewHabitText('');
    setHabitArea('');
    setHabitSubCat('');
    setShowAddHabit(false);
  };

  const handleAddPulso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPulsoText.trim()) return;

    onAddTask({
      userId: 'placeholder',
      text: newPulsoText.trim(),
      type: 'Pulso',
      completed: false,
      createdAt: new Date().toISOString(),
      currentCount: 0,
      targetCount: pulsoTarget,
      unitLabel: pulsoUnit || 'veces',
      polaridad: pulsoPolaridad,
      category: pulsoArea || undefined,
      subCategory: pulsoSubCat || undefined
    });
    setNewPulsoText('');
    setPulsoArea('');
    setPulsoSubCat('');
    setPulsoPolaridad('Reforzar');
    setShowAddPulso(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedRoutines(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  return (
    <div className="animate-in fade-in flex flex-col gap-8 pb-16 pt-6 px-6 md:px-10 max-w-4xl mx-auto w-full text-left bg-transparent">
       {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full mb-2 gap-4">
        
        {/* Left Side: Selectors */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 flex items-center pr-6 bg-base">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)} 
              className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0"
            >
              <option value="manual">Manual</option>
              <option value="priority">Prioridad</option>
              <option value="date">Fecha</option>
              <option value="name">Nombre</option>
            </select>
            <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
          </div>
        </div>
        
        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center justify-end gap-4 font-sans text-[10px] uppercase tracking-widest font-bold">
          <button 
            onClick={() => { setShowAddRoutine(!showAddRoutine); setShowAddHabit(false); setShowAddPulso(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddRoutine ? "text-accent font-black" : "text-text-main hover:text-text-dim")}
          >
            {showAddRoutine ? "Cerrar" : "+ Nueva Rutina"}
          </button>
          <button 
            onClick={() => { setShowAddHabit(!showAddHabit); setShowAddRoutine(false); setShowAddPulso(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddHabit ? "text-accent font-black" : "text-text-main hover:text-text-dim")}
          >
            {showAddHabit ? "Cerrar" : "+ Hábito Simple"}
          </button>
          <button 
            onClick={() => { setShowAddPulso(!showAddPulso); setShowAddRoutine(false); setShowAddHabit(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddPulso ? "text-accent font-black" : "text-text-main hover:text-text-dim")}
          >
            {showAddPulso ? "Cerrar" : "+ Nuevo Pulso"}
          </button>
        </div>
      </div>

      {/* 1. COLLAPSIBLE FORM: CREAR RUTINA */}
      {showAddRoutine && (
        <form onSubmit={handleAddRoutine} className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Contenedor de Rutina</h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              autoFocus
              type="text"
              placeholder="Nombre de la nueva rutina..."
              value={newRoutineText}
              onChange={e => setNewRoutineText(e.target.value)}
              className="flex-1 px-4 py-2 bg-base border border-border-line rounded-full text-sm focus:outline-none focus:border-[#a2b29f] text-text-main"
            />
            
            <div className="flex flex-wrap gap-2">
              <select 
                className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                value={routineArea}
                onChange={e => { setRoutineArea(e.target.value); setRoutineSubCat(''); }}
              >
                <option value="">Sin Área</option>
                {Object.keys(config?.areas || {}).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {routineArea && typeof config?.areas?.[routineArea] !== 'string' && (config?.areas?.[routineArea] as any)?.categories?.length > 0 && (
                <select 
                  className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                  value={routineSubCat}
                  onChange={e => setRoutineSubCat(e.target.value)}
                >
                  <option value="">Sin Categoría</option>
                  {((config?.areas?.[routineArea] as any).categories || []).map((sc: string) => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <button type="submit" disabled={!newRoutineText.trim()} className="self-end text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 bg-transparent border-0 outline-none">
            Crear Rutina
          </button>
        </form>
      )}

      {/* 2. COLLAPSIBLE FORM: CREAR HABITO */}
      {showAddHabit && (
        <form onSubmit={handleAddHabit} className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Nuevo Hábito Recurrente</h4>
          <div className="flex flex-col gap-4">
            <input 
              autoFocus
              type="text"
              placeholder="¿Qué hábito deseas incorporar?..."
              value={newHabitText}
              onChange={e => setNewHabitText(e.target.value)}
              className="px-4 py-2 bg-base border border-border-line rounded-full text-sm focus:outline-none focus:border-[#a2b29f] text-text-main"
            />
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* Frequency */}
              <div className="flex items-center gap-1.5 text-xs text-text-main pr-4 border border-border-line rounded-full px-3 py-1.5 bg-base">
                <span className="text-text-dim font-mono">Cada</span>
                <input 
                  type="number" 
                  min={1} 
                  value={habitFreq} 
                  onChange={e => setHabitFreq(Number(e.target.value))} 
                  className="w-10 bg-transparent text-center font-bold outline-none border-b border-border-line focus:border-[#a2b29f] text-text-main"
                />
                <select 
                  value={habitFreqUnit} 
                  onChange={e => setHabitFreqUnit(e.target.value as any)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer font-mono text-text-main"
                >
                  <option value="días">días</option>
                  <option value="semanas">sems</option>
                  <option value="meses">meses</option>
                </select>
              </div>

              {/* Area */}
              <div className="flex flex-wrap gap-2">
                <select 
                  className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                  value={habitArea}
                  onChange={e => { setHabitArea(e.target.value); }}
                >
                  <option value="">Sin Área</option>
                  {Object.keys(config?.areas || {}).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {habitArea && typeof config?.areas?.[habitArea] !== 'string' && (config?.areas?.[habitArea] as any)?.categories?.length > 0 && (
                  <select 
                    className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                    value={habitSubCat}
                    onChange={e => setHabitSubCat(e.target.value)}
                  >
                    <option value="">Sin Categoría</option>
                    {((config?.areas?.[habitArea] as any).categories || []).map((sc: string) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          <button type="submit" disabled={!newHabitText.trim()} className="self-end text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 bg-transparent border-0 outline-none">
            Crear Hábito
          </button>
        </form>
      )}

      {/* 3. COLLAPSIBLE FORM: CREAR PULSO */}
      {showAddPulso && (
        <form onSubmit={handleAddPulso} className="bg-base-dim/20 border border-border-line p-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">Crear Nuevo Pulso Diario</h4>
          <div className="flex flex-col gap-4">
            <input 
              autoFocus
              type="text"
              placeholder="¿Qué pulso deseas trackear? (ej: Vasos de agua, meditación...)..."
              value={newPulsoText}
              onChange={e => setNewPulsoText(e.target.value)}
              className="px-4 py-2 bg-base border border-border-line rounded-full text-sm focus:outline-none focus:border-[#a2b29f] text-text-main"
            />
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* Target & Unit */}
              <div className="flex items-center gap-2 text-xs border border-border-line rounded-full px-3 py-1.5 bg-base text-text-main">
                <span className="text-text-dim font-mono">Meta:</span>
                <input 
                  type="number" 
                  min={1} 
                  value={pulsoTarget} 
                  onChange={e => setPulsoTarget(Number(e.target.value))} 
                  className="w-10 bg-transparent text-center font-bold outline-none border-b border-border-line text-text-main"
                />
                <input 
                  type="text" 
                  placeholder="unidad (vasos)" 
                  value={pulsoUnit} 
                  onChange={e => setPulsoUnit(e.target.value)} 
                  className="w-20 bg-transparent font-bold outline-none text-center border-b border-border-line text-text-main placeholder:opacity-50"
                />
              </div>

              {/* Area & Polarity */}
              <div className="flex flex-wrap gap-2">
                <select 
                  className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                  value={pulsoPolaridad}
                  onChange={e => setPulsoPolaridad(e.target.value as any)}
                  title="Polaridad del Pulso"
                >
                  <option value="Reforzar">📈 Reforzar</option>
                  <option value="Abandonar">📉 Abandonar</option>
                </select>

                <select 
                  className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                  value={pulsoArea}
                  onChange={e => { setPulsoArea(e.target.value); setPulsoSubCat(''); }}
                >
                  <option value="">Sin Área</option>
                  {Object.keys(config?.areas || {}).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {pulsoArea && typeof config?.areas?.[pulsoArea] !== 'string' && (config?.areas?.[pulsoArea] as any)?.categories?.length > 0 && (
                  <select 
                    className="px-4 py-2 bg-base border border-border-line rounded-full text-xs font-mono focus:outline-none text-text-main"
                    value={pulsoSubCat}
                    onChange={e => setPulsoSubCat(e.target.value)}
                  >
                    <option value="">Sin Categoría</option>
                    {((config?.areas?.[pulsoArea] as any).categories || []).map((sc: string) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          <button type="submit" disabled={!newPulsoText.trim()} className="self-end text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 bg-transparent border-0 outline-none">
            Crear Pulso
          </button>
        </form>
      )}

      {/* ROUTINES LIST */}
      <div className="mb-6">
        <div 
          onClick={() => setIsRoutinesOpen(!isRoutinesOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isRoutinesOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Rutinas Activas
            </span>
          </div>
        </div>

        {isRoutinesOpen && (
          <div className="mt-4 animate-in fade-in duration-200 flex flex-col gap-2">
            {routines.length === 0 ? (
              <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                No hay rutinas activas.
              </p>
            ) : (
              routines.map(routine => {
            const isExpanded = expandedRoutines.includes(routine.id);
            const rawSubtasks = tasks.filter(t => t.parentId === routine.id && t.type === 'Hábito');
            const subtasks = sortTasks(rawSubtasks, sortBy);
            const routineDuration = subtasks.filter(t => !isFutureDate(t.fechaPlanificada)).reduce((acc, t) => acc + (t.duracion || 0), 0);
            
            if (editingRoutineId === routine.id) {
              return (
                <div key={routine.id} className="border border-border-line p-5 flex flex-col mb-4 bg-base-dim/10 text-left animate-in zoom-in-95 duration-200">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-4">Editando Rutina</h4>
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        autoFocus
                        type="text" 
                        className="flex-1 px-4 py-2 bg-base border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f] text-text-main"
                        value={editRoutineForm.text}
                        onChange={e => setEditRoutineForm({...editRoutineForm, text: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        className="flex-1 px-4 py-2 bg-base border border-border-line rounded-full focus:outline-none text-text-main font-mono text-xs"
                        value={editRoutineForm.category}
                        onChange={e => setEditRoutineForm({...editRoutineForm, category: e.target.value, subCategory: ''})}
                      >
                        <option value="">Sin Área</option>
                        {Object.keys(config?.areas || {}).map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      {editRoutineForm.category && typeof config?.areas?.[editRoutineForm.category] !== 'string' && (config?.areas?.[editRoutineForm.category] as any)?.categories?.length > 0 && (
                        <select 
                          className="flex-1 px-4 py-2 bg-base border border-border-line rounded-full focus:outline-none text-text-main font-mono text-xs"
                          value={editRoutineForm.subCategory}
                          onChange={e => setEditRoutineForm({...editRoutineForm, subCategory: e.target.value})}
                        >
                          <option value="">Sin Categoría</option>
                          {((config?.areas?.[editRoutineForm.category] as any)?.categories || []).map((sc: string) => (
                            <option key={sc} value={sc}>{sc}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="date" 
                        className="flex-1 px-4 py-2 bg-base border border-border-line rounded-full focus:outline-none font-mono text-xs text-text-main"
                        value={editRoutineForm.fechaPlanificada}
                        onChange={e => setEditRoutineForm({...editRoutineForm, fechaPlanificada: e.target.value})}
                        title="Próxima Ejecución"
                      />
                      <input 
                        type="time" 
                        className="w-full sm:w-auto px-4 py-2 bg-base border border-border-line rounded-full focus:outline-none font-mono text-xs text-text-main"
                        value={editRoutineForm.hora}
                        onChange={e => setEditRoutineForm({...editRoutineForm, hora: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex items-center gap-2 bg-base border border-border-line rounded-full px-4 py-1.5 flex-1 text-text-main">
                        <span className="text-xs font-mono uppercase tracking-wider text-text-dim whitespace-nowrap">Cada</span>
                        <input 
                          type="number" 
                          min={1} 
                          className="w-12 px-2 py-0.5 text-center bg-transparent border-b border-border-line font-bold focus:outline-none text-text-main"
                          value={editRoutineForm.frecuencia}
                          onChange={e => setEditRoutineForm({...editRoutineForm, frecuencia: parseInt(e.target.value) || 1})}
                        />
                        <select 
                          className="py-1 pr-2 bg-transparent focus:outline-none text-text-main font-medium cursor-pointer font-mono text-xs"
                          value={editRoutineForm.frecuenciaUnidad}
                          onChange={e => setEditRoutineForm({...editRoutineForm, frecuenciaUnidad: e.target.value})}
                        >
                          <option value="días">días</option>
                          <option value="semanas">sem</option>
                          <option value="meses">meses</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-6 items-center">
                    <button onClick={() => setEditingRoutineId(null)} className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0">Cancelar</button>
                    <button onClick={handleSaveEdit} className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0" disabled={!editRoutineForm.text.trim()}>
                      Guardar
                    </button>
                  </div>
                </div>
              );
            }

            const idx = routines.findIndex(r => r.id === routine.id);
            const isFirstItem = idx <= 0;
            const isLastItem = idx === -1 || idx === routines.length - 1;

            return (
              <div key={routine.id} id={`task-item-${routine.id}`} className="relative py-5 flex flex-col mb-4 border-b last:border-b-0 border-border-line/40 group transition-all">
                <div className="flex items-start gap-3 md:gap-4 w-full">
                  {/* Left Repeat Icon */}
                  <div className="mt-1 flex-shrink-0 flex items-center justify-center w-5 h-5">
                    <Repeat className="w-4 h-4 text-text-main/70" />
                  </div>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex gap-2 items-center flex-wrap mb-1">
                      <h3 className="text-subtitle font-normal leading-tight group-hover:text-accent transition-colors truncate">
                        {routine.text}
                      </h3>
                      {routine.category && (
                        <span className={cn("text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed leading-none flex items-center", 
                          getAreaColorClasses(typeof (config?.areas?.[routine.category || ''] || 'slate') === 'string' ? config?.areas?.[routine.category || ''] as string || 'slate' : (config?.areas?.[routine.category || ''] as any)?.color || 'slate')
                        )}>
                          {routine.category}
                        </span>
                      )}
                      {routine.subCategory && (
                        <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed border-border-line/50 text-text-dim leading-none flex items-center">
                          {routine.subCategory}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-3 text-[10px] font-mono text-text-dim/80 mt-1.5 flex-wrap items-center lowercase tracking-wider mb-2">
                      <span>{subtasks.length} hábitos</span>
                      {routineDuration > 0 && <span className="text-text-dim font-mono">⏱ {routineDuration}h</span>}
                      {routine.fechaPlanificada && (
                         <span className="text-text-dim font-mono">
                           📅 {routine.fechaPlanificada.substring(0, 10)}
                         </span>
                      )}
                      {routine.hora && <span className="text-text-dim font-mono">🕒 {routine.hora}</span>}
                      {routine.frecuencia && (
                        <span className="text-text-dim font-mono">
                          🔄 cada {routine.frecuencia} {routine.frecuenciaUnidad || 'días'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls Column (on the right) */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-6 pt-1">
                    {/* Chevron */}
                    <button 
                      title={isExpanded ? "Ocultar Hábitos" : "Ver Hábitos"} 
                      onClick={() => toggleExpand(routine.id)} 
                      className="text-[#a2b29f] hover:text-[#2d2d2d] p-0.5 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                    >
                       {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* 3-dots Options */}
                    <div className="relative flex items-center justify-center">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          setMenuRoutineUpwards(spaceBelow < 250);
                          setOpenMenuRoutineId(openMenuRoutineId === routine.id ? null : routine.id); 
                        }}
                        className="text-[#a2b29f] hover:text-text-main p-0.5 cursor-pointer bg-transparent border-0 rounded-full hover:bg-base-dim/50 flex items-center justify-center transition-colors"
                        title="Opciones"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {openMenuRoutineId === routine.id && (
                        <>
                          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuRoutineId(null)} />
                          <div className={cn(
                            "absolute right-0 z-50 w-40 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left",
                            menuRoutineUpwards ? "bottom-full mb-1" : "top-full mt-1"
                          )}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEdit(routine); setOpenMenuRoutineId(null); }}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                            >
                              <svg className="w-3 h-3 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                              Editar
                            </button>
                            {sortBy === 'manual' && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveRoutineUp(routine); setOpenMenuRoutineId(null); }}
                                  disabled={isFirstItem}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                  Mover arriba
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleMoveRoutineDown(routine); setOpenMenuRoutineId(null); }}
                                  disabled={isLastItem}
                                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                  Mover abajo
                                </button>
                              </>
                            )}
                            <div className="h-[1px] bg-border-line/40 my-1"></div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuRoutineId(null);
                                if (window.confirm(`¿Estás segura de que deseas eliminar permanentemente la rutina "${routine.text}" y todos sus hábitos?`)) {
                                  onDeleteTask(routine.id);
                                }
                              }} 
                              className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50/15 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                            >
                              <X className="w-3 h-3 text-red-500" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reordering Arrows */}
                    {sortBy === 'manual' && (
                      <div className="flex flex-col gap-0.5 items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveRoutineUp(routine); }}
                          disabled={isFirstItem}
                          className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveRoutineDown(routine); }}
                          disabled={isLastItem}
                          className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full bg-[var(--color-border-line)]/30 h-[1px] mb-1">
                  <div 
                    className="h-full bg-[var(--color-primary)] transition-all duration-500" 
                    style={{ width: `${subtasks.length > 0 ? (subtasks.filter(s => isFutureDate(s.fechaPlanificada)).length / subtasks.length) * 100 : 0}%` }}
                  ></div>
                </div>

                {isExpanded && (
                  <div className="relative pl-4 flex flex-col gap-2 mt-4 pt-4 border-t border-border-line/30 animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1 mt-1 mb-2 z-10 w-full pr-2">
                      <form 
                        onSubmit={(e: any) => {
                          e.preventDefault();
                          const val = e.target.elements[0].value.trim();
                          if (!val) return;
                          onAddTask({
                            userId: 'placeholder',
                            text: val,
                            type: 'Hábito',
                            parentId: routine.id,
                            category: routine.category,
                            subCategory: routine.subCategory,
                            completed: false,
                            createdAt: new Date().toISOString(),
                            fechaPlanificada: new Date().toISOString(),
                            frecuencia: 1
                          });
                          e.target.reset();
                        }}
                        className="flex items-center"
                      >
                        <input 
                          type="text" 
                          placeholder="Añadir hábito a esta rutina..."
                          className="flex-1 px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                        />
                        <button type="submit" className="text-text-main text-xs font-bold font-mono uppercase tracking-wider hover:underline cursor-pointer bg-transparent border-0 outline-none ml-4">
                          + Añadir
                        </button>
                      </form>
                    </div>
                    {subtasks.map(sub => (
                      <TaskItem 
                        key={sub.id}
                        task={sub} 
                        config={config} 
                        allTasks={tasks} 
                        history={history}
                        onToggle={onToggleTask} 
                        onDelete={() => onDeleteTask(sub.id)} 
                        onUpdate={onUpdateTask}
                        onAddTask={onAddTask}
                        onDeleteTask={onDeleteTask}
                        isSubtask 
                        hideAreaCategory={false}
                        showMoveArrows={sortBy === 'manual'}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
          </div>
        )}
      </div>

      {/* STATS DE HABITOS SUELTOS */}
      <div className="mb-6">
        <div 
          onClick={() => setIsHabitsOpen(!isHabitsOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isHabitsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Hábitos Individuales
            </span>
          </div>
        </div>

        {isHabitsOpen && (
          <div className="mt-4 animate-in fade-in duration-200">
            {standaloneHabits.length === 0 ? (
              <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                Sin hábitos individuales.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {standaloneHabits.map(habit => (
                  <TaskItem 
                    key={habit.id}
                    task={habit} 
                    config={config} 
                    allTasks={tasks} 
                    history={history}
                    onToggle={onToggleTask} 
                    onDelete={() => onDeleteTask(habit.id)} 
                    onUpdate={onUpdateTask}
                    onAddTask={onAddTask}
                    onDeleteTask={onDeleteTask}
                    isSubtask={false} 
                    hideAreaCategory={false}
                    showMoveArrows={sortBy === 'manual'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PULSOS DIARIOS */}
      <div className="mb-6">
        <div 
          onClick={() => setIsPulsosOpen(!isPulsosOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isPulsosOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Pulsos Diarios
            </span>
          </div>
        </div>

        {isPulsosOpen && (
          <div className="mt-4 animate-in fade-in duration-200">
            {pulsos.length === 0 ? (
              <p className="text-xs text-text-dim/60 font-light font-sans text-center py-6 bg-base-dim/5 border border-dashed border-border-line/40">
                Sin pulsos diarios en la lista general.
              </p>
            ) : (
              <div className="flex flex-wrap gap-y-3 w-full">
                {pulsos.map(t => {
                const count = (history || []).filter(h => h.taskId === t.id && isSameDay(h.date, new Date().toISOString())).length;
                const target = t.targetCount || 1;
                const unit = t.unitLabel || 'veces';
                const progress = Math.min((count / target) * 100, 100);
                const isDone = count >= target;

                if (editingPulsoId === t.id) {
                  return (
                    <div key={t.id} className="border border-border-line p-2 flex flex-col gap-2.5 animate-in zoom-in-95 duration-200 rounded-none bg-base-dim/10 text-left font-sans">
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text" 
                          className="px-2 py-0.5 bg-base border border-border-line rounded-none text-xs text-text-main focus:outline-none focus:border-[#a2b29f] w-full font-sans"
                          value={editPulsoForm.text}
                          onChange={e => setEditPulsoForm({...editPulsoForm, text: e.target.value})}
                          placeholder="Nombre del pulso..."
                        />
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1 text-[9px] border border-border-line rounded-none px-1.5 py-0.5 bg-base text-text-main font-mono w-fit">
                            <span className="text-text-dim">Meta:</span>
                            <input 
                              type="number" 
                              min={1} 
                              className="w-8 bg-transparent text-center font-bold focus:outline-none border-b border-border-line text-text-main"
                              value={editPulsoForm.targetCount}
                              onChange={e => setEditPulsoForm({...editPulsoForm, targetCount: Number(e.target.value)})}
                            />
                            <input 
                              type="text" 
                              className="w-10 bg-transparent font-bold focus:outline-none text-center border-b border-border-line text-text-main"
                              value={editPulsoForm.unitLabel}
                              onChange={e => setEditPulsoForm({...editPulsoForm, unitLabel: e.target.value})}
                              placeholder="un."
                            />
                          </div>
                          
                          <div className="flex gap-1 flex-wrap">
                            <select 
                              className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                              value={editPulsoForm.polaridad}
                              onChange={e => setEditPulsoForm({...editPulsoForm, polaridad: e.target.value})}
                              title="Polaridad"
                            >
                              <option value="Reforzar">Reforzar</option>
                              <option value="Abandonar">Abandonar</option>
                            </select>

                            <select 
                              className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                              value={editPulsoForm.category}
                              onChange={e => setEditPulsoForm({...editPulsoForm, category: e.target.value, subCategory: ''})}
                              title="Área"
                            >
                              <option value="">Sin Área</option>
                              {Object.keys(config?.areas || {}).map(a => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                            
                            {editPulsoForm.category && typeof config?.areas?.[editPulsoForm.category] !== 'string' && (config?.areas?.[editPulsoForm.category] as any)?.categories?.length > 0 && (
                              <select 
                                className="px-1.5 py-0.5 bg-base border border-border-line rounded-none text-[9px] font-mono focus:outline-none text-text-main cursor-pointer"
                                value={editPulsoForm.subCategory}
                                onChange={e => setEditPulsoForm({...editPulsoForm, subCategory: e.target.value})}
                                title="Categoría"
                              >
                                <option value="">Sin Cat.</option>
                                {((config?.areas?.[editPulsoForm.category] as any).categories || []).map((sc: string) => (
                                  <option key={sc} value={sc}>{sc}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <button 
                          type="button"
                          onClick={() => setEditingPulsoId(null)} 
                          className="text-[8.5px] font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (!editPulsoForm.text.trim()) return;
                            onUpdateTask(t.id, {
                              text: editPulsoForm.text.trim(),
                              targetCount: editPulsoForm.targetCount,
                              unitLabel: editPulsoForm.unitLabel,
                              polaridad: editPulsoForm.polaridad,
                              category: editPulsoForm.category || undefined,
                              subCategory: editPulsoForm.subCategory || undefined
                            });
                            setEditingPulsoId(null);
                          }} 
                          className="text-[8.5px] font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0"
                          disabled={!editPulsoForm.text.trim()}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={t.id} className="relative group py-1.5 px-3 flex items-center bg-transparent rounded-none transition-all animate-in zoom-in-95 duration-200 text-left flex-none w-fit min-w-[160px] max-w-[220px] border-r border-border-line/30 last:border-r-0 gap-2">
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      {/* Top row: text and badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-medium text-text-main truncate font-sans" title={t.text}>{t.text}</h4>
                        {t.category && (
                          <span className={cn("text-[7.5px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-dashed leading-none", 
                            getAreaColorClasses(typeof (config?.areas?.[t.category] || 'slate') === 'string' ? config?.areas?.[t.category] as string || 'slate' : (config?.areas?.[t.category] as any)?.color || 'slate')
                          )}>
                            {t.category}
                          </span>
                        )}
                        {t.polaridad && (
                          <span className="text-[7.5px] font-mono uppercase tracking-wider px-1 py-0.2 rounded-full border border-dashed border-border-line/50 text-text-dim leading-none">
                            {t.polaridad === 'Abandonar' ? '📉' : '📈'}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-[1.5px] w-full bg-[#efede8]/60 dark:bg-border-line/50 relative rounded-none overflow-hidden">
                        <div className={cn("h-full transition-all duration-300 absolute top-0 left-0", isDone ? "bg-[#81b29a]" : "bg-[#73c2b8]")} style={{ width: `${progress}%` }}></div>
                      </div>

                      {/* Bottom row: Counter adjuster and count indicator */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex border border-border-line rounded-none bg-transparent overflow-hidden">
                          <button 
                            onClick={() => onUpdateTask(t.id, { currentCount: Math.max(0, count - 1), completed: Math.max(0, count - 1) >= target })}
                            className="w-[18px] h-[18px] flex items-center justify-center text-[9px] text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-colors cursor-pointer bg-transparent border-0 rounded-none font-bold"
                          >
                            -
                          </button>
                          <div className="w-[1px] bg-border-line"></div>
                          <button 
                            onClick={() => onUpdateTask(t.id, { currentCount: Math.min(target * 2, count + 1), completed: (count + 1) >= target })}
                            className="w-[18px] h-[18px] flex items-center justify-center text-[9px] text-text-dim hover:bg-base-dim/50 hover:text-text-main transition-colors cursor-pointer bg-transparent border-0 rounded-none font-bold"
                          >
                            +
                          </button>
                        </div>
                        
                        <span className="text-[9.5px] font-mono text-text-dim leading-none">
                          {count} <span className="opacity-60">/ {target} {unit}</span>
                        </span>
                        {isDone && <span className="text-[7.5px] uppercase tracking-wider font-mono font-bold text-[#81b29a] leading-none">Listo</span>}
                      </div>
                    </div>

                    {/* 3-dots Options Menu */}
                    <div className="relative flex items-center justify-center shrink-0 border-l border-border-line/70 pl-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setOpenMenuPulsoId(openMenuPulsoId === t.id ? null : t.id); 
                        }}
                        className="text-[#a2b29f] hover:text-text-main p-0.5 cursor-pointer bg-transparent border-0 rounded-full hover:bg-base-dim/50 flex items-center justify-center transition-colors"
                        title="Opciones"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {openMenuPulsoId === t.id && (
                        <>
                          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuPulsoId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditPulsoForm({
                                  text: t.text,
                                  targetCount: t.targetCount || 1,
                                  unitLabel: t.unitLabel || 'veces',
                                  polaridad: t.polaridad || 'Reforzar',
                                  category: t.category || '',
                                  subCategory: t.subCategory || ''
                                });
                                setEditingPulsoId(t.id);
                                setOpenMenuPulsoId(null); 
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                            >
                              <Edit2 className="w-3 h-3 text-text-dim" />
                              Editar
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuPulsoId(null);
                                onDeleteTask(t.id);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-50/15 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                            >
                              <X className="w-3 h-3 text-red-500" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
