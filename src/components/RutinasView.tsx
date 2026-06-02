import React, { useState } from 'react';
import { AppTask, Config, HistoryRecord, TaskType } from '../types';
import TaskItem from './TaskItem';
import { RotateCw, Plus, ChevronDown, ChevronUp, Edit2, Trash2, Save, Repeat, Activity, Sliders, X } from 'lucide-react';
import { cn, getAreaColorClasses, isSameDay } from '../lib/utils';

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

  const routines = tasks.filter(t => t.type === 'Rutina' && !t.completed);
  const standaloneHabits = tasks.filter(t => t.type === 'Hábito' && (!t.parentId || !tasks.some(p => p.id === t.parentId)));
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
    <div className="animate-in fade-in flex flex-col gap-8 pb-16 pt-10 px-6 md:px-10 max-w-4xl mx-auto w-full text-left bg-transparent">
      
      {/* HEADER */}
      <div className="border-b border-border-line pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-title flex items-center gap-3">
            <Repeat className="text-text-main w-6 h-6 stroke-[2]" /> Rutinas y Hábitos
          </h2>
          <p className="text-sm text-text-dim mt-1 leading-relaxed max-w-lg">
            Administre de forma fluida sus bloques recurrentes de rutinas, hábitos programados e indicadores multi-diarios.
          </p>
        </div>

        {/* Collapsible Toggles - Stacked vertically */}
        <div className="flex flex-col items-end gap-3 font-mono text-xs uppercase tracking-wider font-bold text-right">
          <button 
            onClick={() => { setShowAddRoutine(!showAddRoutine); setShowAddHabit(false); setShowAddPulso(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddRoutine ? "text-accent font-black" : "text-text-dim hover:text-text-main")}
          >
            {showAddRoutine ? "✕ Cerrar" : "+ Nueva Rutina"}
          </button>
          <button 
            onClick={() => { setShowAddHabit(!showAddHabit); setShowAddRoutine(false); setShowAddPulso(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddHabit ? "text-accent font-black" : "text-text-dim hover:text-text-main")}
          >
            {showAddHabit ? "✕ Cerrar" : "+ Hábito Simple"}
          </button>
          <button 
            onClick={() => { setShowAddPulso(!showAddPulso); setShowAddRoutine(false); setShowAddHabit(false); }}
            className={cn("hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors", showAddPulso ? "text-accent font-black" : "text-text-dim hover:text-text-main")}
          >
            {showAddPulso ? "✕ Cerrar" : "+ Nuevo Pulso"}
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
            
            <div className="flex gap-2">
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

      {/* 2. COLLAPSIBLE FORM: CREAR HÁBITO */}
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
              <div className="flex gap-2">
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
              <div className="flex gap-2">
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
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase border-b border-border-line pb-3 mb-6">Rutinas Activas</h3>
        {routines.length === 0 ? (
          <p className="text-xs text-text-dim font-mono italic pl-2">No hay rutinas activas.</p>
        ) : (
          routines.map(routine => {
            const isExpanded = expandedRoutines.includes(routine.id);
            const subtasks = tasks.filter(t => t.parentId === routine.id && t.type === 'Hábito');
            const routineDuration = subtasks.filter(t => !t.completed).reduce((acc, t) => acc + (t.duracion || 0), 0);
            
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

            return (
              <div key={routine.id} id={`task-item-${routine.id}`} className="relative py-5 flex flex-col mb-4 border-b last:border-b-0 border-border-line/40 group transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-3 gap-3">
                  <div 
                    className="flex-1 cursor-pointer flex items-start gap-3" 
                    onClick={() => toggleExpand(routine.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-2 items-center flex-wrap">
                        <h3 className="text-subtitle font-normal leading-tight group-hover:text-accent transition-colors truncate">
                          {routine.text}
                        </h3>
                        {routine.category && (
                          <span className={cn("text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed", 
                            getAreaColorClasses(typeof (config?.areas?.[routine.category || ''] || 'slate') === 'string' ? config?.areas?.[routine.category || ''] as string || 'slate' : (config?.areas?.[routine.category || ''] as any)?.color || 'slate')
                          )}>
                            {routine.category}
                          </span>
                        )}
                        {routine.subCategory && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed border-border-line/50 text-text-dim">
                            {routine.subCategory}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-[10px] font-mono text-text-dim/80 mt-1.5 flex-wrap items-center lowercase tracking-wider">
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
                  </div>
                  
                  <div className="flex items-center gap-1 justify-end">
                    <button 
                      title={isExpanded ? "Ocultar Hábitos" : "Ver Hábitos"} 
                      onClick={() => toggleExpand(routine.id)} 
                      className="p-1.5 text-text-dim hover:text-text-main transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0"
                    >
                       {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button title="Editar Rutina" onClick={() => startEdit(routine)} className="p-1.5 text-text-dim hover:text-primary transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0">
                       <Edit2 className="w-4 h-4" />
                    </button>
                    <button title="Eliminar Rutina" onClick={() => { if(confirm('¿Eliminar rutina?')) onDeleteTask(routine.id); }} className="p-1.5 text-text-dim hover:text-red-500 transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0">
                       <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full bg-[var(--color-border-line)]/30 h-[1px] mb-1">
                  <div 
                    className="h-full bg-[var(--color-primary)] transition-all duration-500" 
                    style={{ width: `${subtasks.length > 0 ? (subtasks.filter(s => s.completed).length / subtasks.length) * 100 : 0}%` }}
                  ></div>
                </div>

                {isExpanded && (
                  <div className="relative pl-4 flex flex-col gap-2 mt-4 pt-4 border-t border-border-line/30 animate-in fade-in duration-200">
                    {subtasks.map(sub => (
                      <TaskItem 
                        key={sub.id}
                        task={sub} 
                        config={config} 
                        allTasks={tasks} 
                        history={history}
                        onToggle={() => onToggleTask(sub)} 
                        onDelete={() => onDeleteTask(sub.id)} 
                        onUpdate={onUpdateTask}
                        onAddTask={onAddTask}
                        onDeleteTask={onDeleteTask}
                        isSubtask 
                        hideAreaCategory={false}
                      />
                    ))}
                    <div className="flex flex-col gap-1 mt-1 z-10 w-full pr-2">
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
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* STATS DE HÁBITOS SUELTOS */}
      <div className="mt-8">
        <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase border-b border-border-line pb-3 mb-6">Hábitos Individuales</h3>
        <div className="flex flex-col gap-2">
          {standaloneHabits.length === 0 ? (
            <p className="text-xs text-text-dim font-mono italic pl-2">Sin hábitos individuales.</p>
          ) : (
            standaloneHabits.map(habit => (
              <TaskItem 
                key={habit.id}
                task={habit} 
                config={config} 
                allTasks={tasks} 
                history={history}
                onToggle={() => onToggleTask(habit)} 
                onDelete={() => onDeleteTask(habit.id)} 
                onUpdate={onUpdateTask}
                onAddTask={onAddTask}
                onDeleteTask={onDeleteTask}
                isSubtask={false} 
                hideAreaCategory={false}
              />
            ))
          )}
        </div>
      </div>

<div className="mt-8 font-mono">
        <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase border-b border-border-line pb-3 mb-6">Pulsos Diarios</h3>
        <div className="flex flex-col gap-2">
          {pulsos.length === 0 ? (
            <p className="text-xs text-text-dim font-mono italic pl-2">Sin pulsos diarios en la lista general.</p>
          ) : (
            <div className="flex flex-wrap gap-y-3 w-full animate-in fade-in duration-300">
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
                  <div key={t.id} className="relative group p-2 flex items-stretch bg-transparent rounded-none transition-all animate-in zoom-in-95 duration-200 text-left flex-1 min-w-[160px] sm:min-w-[180px] max-w-[280px] border-r border-border-line/30 last:border-r-0">
                    <div className="flex-1 pr-2 min-w-0 flex flex-col justify-between">
                      {/* Top row: text and badges */}
                      <div>
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
                        <div className="h-[1.5px] w-full bg-[#efede8]/60 dark:bg-border-line/50 relative rounded-none overflow-hidden my-1">
                          <div className={cn("h-full transition-all duration-300 absolute top-0 left-0", isDone ? "bg-[#81b29a]" : "bg-[#73c2b8]")} style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      {/* Bottom row: Counter adjuster and count indicator */}
                      <div className="flex items-center gap-2 mt-1">
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

                    {/* Right vertical action panel */}
                    <div className="flex flex-col border-l border-border-line/70 pl-1.5 gap-1 shrink-0 justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => {
                          setEditPulsoForm({
                            text: t.text,
                            targetCount: t.targetCount || 1,
                            unitLabel: t.unitLabel || 'veces',
                            polaridad: t.polaridad || 'Reforzar',
                            category: t.category || '',
                            subCategory: t.subCategory || ''
                          });
                          setEditingPulsoId(t.id);
                        }}
                        className="w-[18px] h-[18px] flex items-center justify-center text-text-dim hover:text-primary transition-colors cursor-pointer bg-transparent border-0"
                        title="Editar Pulso"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => { if(confirm('¿Eliminar pulso?')) onDeleteTask(t.id); }}
                        className="w-[18px] h-[18px] flex items-center justify-center text-text-dim hover:text-red-500 transition-colors cursor-pointer bg-transparent border-0"
                        title="Eliminar Pulso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
