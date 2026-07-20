import React, { useState } from 'react';
import { Shapes, Plus, Edit2, Trash2, Tag, Save, X, ArrowRight, Folder, CheckSquare, Repeat, Circle, ChevronLeft, ArrowUpRight, LayoutGrid, Layers, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { Config, AreaConfig, AppTask, HistoryRecord, Intention } from '../types';
import { cn, getAreaColorClasses, getAreaBorderClasses, getAreaTextClasses, APP_COLORS } from '../lib/utils';
import { calculateItemProgress, getActiveAreaCommitments, getIntentionItemLabel, INTENTION_SCALE_LABELS, summarizeIntentionProgress } from '../domain/intentionProgress';
import TaskItem from './TaskItem';
import CategoryBadge from './ui/CategoryBadge';

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history?: HistoryRecord[];
  intentions?: Intention[];
  onUpdateConfig: (c: Partial<Config>) => void;
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onNavigate?: (view: 'hoy' | 'proyectos' | 'calendario' | 'areas' | 'completadas' | 'rutinas' | 'reportes' | 'syllabus' | 'configuracion', taskId?: string) => void;
  focusTaskId?: string | null;
}

export default function AreasView({ config, tasks, history, intentions = [], onUpdateConfig, onToggleTask, onDeleteTask, onAddTask, onUpdateTask, onNavigate, focusTaskId }: Props) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const areas = config?.areas || {};

  React.useEffect(() => {
    if (focusTaskId && config?.areas && config.areas[focusTaskId]) {
      setSelectedArea(focusTaskId);
    }
  }, [focusTaskId, config]);

  const handleUpdateAreas = (newAreas: Record<string, string | AreaConfig>) => {
    onUpdateConfig({ areas: newAreas });
  };

  if (selectedArea && areas[selectedArea]) {
    return (
      <AreaDetail 
        areaName={selectedArea}
        areaConfig={areas[selectedArea]}
        tasks={tasks}
        config={config}
        history={history}
        intentions={intentions}
        areas={areas}
        onBack={() => setSelectedArea(null)}
        onUpdateAreas={handleUpdateAreas}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onAddTask={onAddTask}
        onUpdateTask={onUpdateTask}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base pt-4">

      <AreasList config={config} areas={areas} tasks={tasks} history={history} intentions={intentions} onSelect={setSelectedArea} onUpdate={handleUpdateAreas} />
    </div>
  );
}

function AreasList({ 
  config,
  areas, 
  tasks, 
  history = [], 
  intentions = [], 
  onSelect, 
  onUpdate 
}: { 
  config: Config | null,
  areas: Record<string, string | AreaConfig>, 
  tasks: AppTask[], 
  history?: HistoryRecord[], 
  intentions?: Intention[], 
  onSelect: (key: string) => void, 
  onUpdate: (areas: Record<string, string | AreaConfig>) => void 
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string, color: string, categories: string[] }>({ name: '', color: 'teal', categories: [] });
  const [newCat, setNewCat] = useState('');

  const startAdd = () => {
    setEditForm({ name: '', color: 'teal', categories: [] });
    setIsAdding(true);
    setNewCat('');
  };

  const handleSave = () => {
    if (!editForm.name.trim()) return;
    const newAreas = { ...areas };
    newAreas[editForm.name.toUpperCase()] = { color: editForm.color, categories: editForm.categories };
    onUpdate(newAreas);
    setIsAdding(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim() || editForm.categories.includes(newCat.trim().toUpperCase())) return;
    setEditForm({ ...editForm, categories: [...editForm.categories, newCat.trim().toUpperCase()] });
    setNewCat('');
  };

  const areaEntries = Object.entries(areas);

  return (
    <div className="flex-1 flex flex-col">
      {isAdding ? (
         <div className="p-8 md:p-12 border-b border-border-line bg-base-dim/30 text-left">
            <h4 className="text-label mb-6">Inicializar Nuevo Módulo</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mb-8">
              <div>
                <label className="text-label block mb-2">IDENTIFICADOR DE ÁREA</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-base border border-border-line rounded-xl px-4 py-2 text-sm uppercase tracking-wider focus:outline-none text-text-main placeholder:text-text-dim/50 font-light" 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="EJ. SYSTEM, MIND..."
                />
              </div>
              <div>
                <label className="text-label block mb-2">INDEX COLOR</label>
                <select 
                  className="w-full bg-base border border-border-line rounded-xl px-4 py-2 text-sm focus:outline-none uppercase text-text-main"
                  value={editForm.color}
                  onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                >
                  {APP_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="max-w-3xl mb-8">
              <label className="text-label block mb-4">CATEGORÍAS ASIGNADAS</label>
              
              <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                {editForm.categories.length === 0 ? (
                  <span className="text-xs text-primary">SIN CATEGORÍAS</span>
                ) : (
                  editForm.categories.map(cat => (
                    <div key={cat} className={cn("flex items-center gap-2 px-3 py-1 pill-rounded text-xs tracking-wider border", getAreaColorClasses(editForm.color))}>
                      {cat}
                      <button type="button" onClick={() => setEditForm({...editForm, categories: editForm.categories.filter(c=>c!==cat)})} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={newCat} 
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(e); }}
                  placeholder="AGREGAR CATEGORÍA..."
                  className="flex-1 bg-base border border-border-line rounded-xl px-4 py-2 text-xs uppercase focus:outline-none text-text-main"
                />
                <button type="button" onClick={handleAddCategory} className="text-text-main font-mono uppercase tracking-wider font-bold text-xs hover:underline transition-all cursor-pointer">
                  + Añadir
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleSave} 
                className="text-text-main font-mono uppercase tracking-wider font-bold text-sm hover:underline transition-all cursor-pointer"
              >
                Guardar Área
              </button>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-text-dim font-mono uppercase tracking-wider font-bold text-sm hover:underline transition-all cursor-pointer ml-6"
              >
                Cancelar
              </button>
            </div>
          </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 bg-base">
            {areaEntries.map(([key, val], index) => {
            const categories = (val && typeof val === 'object' && 'categories' in val) ? (val.categories || []) : [];
            const areaColor = typeof val === 'string' ? val : ((val && typeof val === 'object' && 'color' in val && val.color) || 'slate');
            const activeProjects = tasks.filter(t => t.category === key && t.type === 'Proyecto' && !t.completed);
            const activeHabits = tasks.filter(t => t.category === key && t.type === 'Hábito' && !t.completed && (!t.parentId || tasks.find(p=>p.id===t.parentId)?.type!=='Rutina'));
            const activeRoutines = tasks.filter(t => t.category === key && t.type === 'Rutina' && !t.completed);

            const areaIntentions = getActiveAreaCommitments(key, intentions, tasks);

            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="relative text-left group flex flex-col p-6 md:p-10 transition-colors hover:bg-base-dim/30 min-h-[280px] cursor-pointer"
              >
                <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
                {index % 2 === 0 && <div className="absolute right-0 top-6 bottom-6 w-[1px] bg-[var(--color-border-line)] hidden md:block" />}
                
                <div className="flex items-center justify-between w-full mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-subtitle leading-none font-sans font-light">{key}</span>
                  </div>
                  <Circle className="w-1.5 h-1.5 text-text-main" strokeWidth={3} />
                </div>

                <div className="flex flex-col gap-2 w-full mb-6 text-xs font-mono text-text-dim">
                  <div className="flex justify-between items-center w-full">
                    <span className="tracking-wide">RUTINAS</span>
                    <div className="flex-grow border-b border-dotted border-border-line mx-2"></div>
                    <span className="text-text-main font-bold">{activeRoutines.length.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className="tracking-wide">PROYECTOS</span>
                    <div className="flex-grow border-b border-dotted border-border-line mx-2"></div>
                    <span className="text-text-main font-bold">{activeProjects.length.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className="tracking-wide">HÁBITOS</span>
                    <div className="flex-grow border-b border-dotted border-border-line mx-2"></div>
                    <span className="text-text-main font-bold">{activeHabits.length.toString().padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Active Intention Progress Section inside Area Card */}
                {areaIntentions.length > 0 && (
                  <div className="mt-2 mb-6 pt-3 border-t border-border-line/20 w-full flex flex-col gap-2 text-left font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-text-dim/80 font-bold">Progreso de Intención Activa:</span>
                    <div className="flex flex-col gap-2">
                      {areaIntentions.slice(0, 3).map(({ item, intention }) => {
                        const progress = calculateItemProgress(item, tasks, history, intention.periodStart, intention.periodEnd, intentions);
                        let label = '';
                        const displayScaleLabel = INTENTION_SCALE_LABELS[intention.scale];

                        label = getIntentionItemLabel(item, tasks);
                        const summary = summarizeIntentionProgress(progress);


                        return (
                          <div key={item.id} className="flex flex-col gap-1 w-full text-[9px]">
                            <div className="flex justify-between items-center text-text-main/90">
                              <span className="truncate max-w-[170px]" title={`${displayScaleLabel}: ${label}`}>{displayScaleLabel}: {label}</span>
                              <span className="font-bold text-right ml-2">{summary.compactValue} ({Math.round(summary.percent)}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-base-dim/40 rounded-full overflow-hidden border border-border-line/10">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  summary.percent >= 100 ? "bg-emerald-500" : "bg-primary/80"
                                )}
                                style={{ width: `${summary.percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {areaIntentions.length > 3 && (
                        <span className="text-[8px] text-text-dim text-right font-light italic">
                          + {areaIntentions.length - 3} compromisos más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-end justify-between w-full mt-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.slice(0, 3).map(cat => (
                      <React.Fragment key={cat}><CategoryBadge area={key} subCategory={cat} config={config} hideArea /></React.Fragment>
                    ))}
                    {categories.length > 3 && (
                      <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-transparent text-text-dim">
                        +{categories.length - 3}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:text-text-main transition-colors" />
                </div>
              </button>
            );
            })}

            <button 
              onClick={startAdd} 
              className="relative flex flex-col items-center justify-center p-6 md:p-10 text-primary hover:text-accent hover:bg-base-dim/30 transition-all min-h-[280px] cursor-pointer"
            >
              <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
              {areaEntries.length % 2 === 0 && <div className="absolute right-0 top-6 bottom-6 w-[1px] bg-[var(--color-border-line)] hidden md:block" />}
              
              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-primary)] mb-4 group-hover:border-[var(--color-accent)] transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono tracking-widest uppercase">Iniciar Área</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AreaDetail({ 
  areaName, 
  areaConfig, 
  tasks, 
  config,
  history,
  intentions = [],
  areas, 
  onBack, 
  onUpdateAreas,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onUpdateTask,
  onNavigate
}: { 
  areaName: string, 
  areaConfig: string | AreaConfig, 
  tasks: AppTask[], 
  config: Config | null,
  history?: HistoryRecord[],
  intentions?: Intention[],
  areas: Record<string, string | AreaConfig>, 
  onBack: () => void, 
  onUpdateAreas: (a: Record<string, string | AreaConfig>) => void,
  onToggleTask: (task: AppTask) => void,
  onDeleteTask: (id: string) => void,
  onAddTask: (task: Omit<AppTask, 'id'>) => void,
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void,
  onNavigate?: (view: 'hoy' | 'proyectos' | 'calendario' | 'areas' | 'completadas' | 'rutinas' | 'reportes' | 'syllabus' | 'configuracion', taskId?: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const categories = typeof areaConfig === 'string' ? [] : (areaConfig?.categories || []);
  const areaColor = typeof areaConfig === 'string' ? areaConfig : (areaConfig?.color || 'slate');

  // Working edit form state
  const [editName, setEditName] = useState(areaName);
  const [editColor, setEditColor] = useState(areaColor);
  const [editCats, setEditCats] = useState<string[]>(categories);
  const [editNewCat, setEditNewCat] = useState('');

  // Expand / collapse states for rows
  const [expandRoutines, setExpandRoutines] = useState(false);
  const [expandProjects, setExpandProjects] = useState(false);
  const [expandHabits, setExpandHabits] = useState(false);
  const [expandTasks, setExpandTasks] = useState(false);
  const [expandCommitments, setExpandCommitments] = useState(true);

  const routinesInArea = tasks.filter(t => t.type === 'Rutina' && t.category === areaName);
  const projectsInArea = tasks.filter(t => t.type === 'Proyecto' && t.category === areaName);
  const activeCommitments = getActiveAreaCommitments(areaName, intentions, tasks);
  const commitmentGroups = (['phase', 'cycle', 'quarter', 'year'] as const)
    .map(scale => ({
      scale,
      commitments: activeCommitments.filter(({ intention }) => intention.scale === scale)
    }))
    .filter(group => group.commitments.length > 0);

  const formatPeriodDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });

  const getCommitmentSummary = (item: Parameters<typeof calculateItemProgress>[0], periodStart: string, periodEnd: string) => {
    const progress = calculateItemProgress(item, tasks, history || [], periodStart, periodEnd, intentions);
    return summarizeIntentionProgress(progress);
  };
  const habitsInArea = tasks.filter(t => t.category === areaName && t.type === 'Hábito' && (!t.parentId || tasks.find(p=>p.id===t.parentId)?.type !== 'Rutina'));
  const standaloneTasks = tasks.filter(t => t.category === areaName && t.type !== 'Proyecto' && t.type !== 'Hábito' && t.type !== 'Rutina' && (!t.parentId || tasks.find(p=>p.id===t.parentId)?.type !== 'Rutina'));

  const handleAddEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNewCat.trim() || editCats.includes(editNewCat.trim().toUpperCase())) return;
    setEditCats([...editCats, editNewCat.trim().toUpperCase()]);
    setEditNewCat('');
  };

  const handleSaveConfig = () => {
    const cleanName = editName.trim().toUpperCase();
    if (!cleanName) return;

    const newAreas = { ...areas };
    if (cleanName !== areaName) {
      // Renamed!
      delete newAreas[areaName];
      newAreas[cleanName] = { color: editColor, categories: editCats };
      
      // Cascade renamed area key to all related tasks and projects!
      tasks.forEach(t => {
        if (t.category === areaName) {
          onUpdateTask(t.id, { category: cleanName });
        }
      });
    } else {
      newAreas[areaName] = { color: editColor, categories: editCats };
    }

    onUpdateAreas(newAreas);
    setIsEditing(false);
    onBack(); // Return to areas list
  };

  return (
    <div className="animate-in fade-in flex flex-col h-full bg-base">
      {/* Header Statement */}
      <div className="p-6 md:p-10 relative flex flex-col justify-between">
         <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
         <div className="w-full flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-wider font-bold">
           <button onClick={onBack} className="text-primary hover:text-text-main transition-colors flex items-center gap-2 cursor-pointer">
             <ChevronLeft className="w-4 h-4" />
             <span>Volver a Áreas</span>
           </button>
           
           <div className="flex gap-6">
             <button onClick={() => setIsEditing(!isEditing)} className="text-accent hover:text-text-main transition-colors cursor-pointer">
               Configurar
             </button>
             <button onClick={() => {
                if(confirm(`¿Estás segura de eliminar el área ${areaName}?`)) {
                  const newAreas = { ...areas }; delete newAreas[areaName]; onUpdateAreas(newAreas); onBack();
                }
             }} className="text-red-500/80 hover:text-red-500 transition-colors cursor-pointer">
               Eliminar
             </button>
           </div>
         </div>

         {/* Header Info */}
         <div className="flex flex-col gap-2 text-left">
            <h1 className="text-title md:text-3xl leading-none font-sans font-light">{areaName}</h1>
            
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categories.map(cat => (
                <React.Fragment key={cat}><CategoryBadge area={areaName} subCategory={cat} config={config} hideArea /></React.Fragment>
              ))}
            </div>
         </div>
      </div>

      {/* RENDER EDIT PANEL (Collapsible inside details) */}
      {isEditing && (
         <div className="p-6 md:p-10 border-b border-border-line bg-base-dim/30 text-left animate-in slide-in-from-top-2 duration-300">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-primary mb-6 font-bold">Configurar Pilar de Vida</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mb-8">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Nombre del Área</label>
              <input 
                type="text" 
                className="w-full bg-base border border-border-line rounded-xl px-4 py-2 font-light text-sm uppercase tracking-wider focus:outline-none text-text-main" 
                value={editName} 
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Color de Acento</label>
              <div className="flex flex-wrap gap-2">
                {APP_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-all cursor-pointer",
                      editColor === c ? "border-[var(--color-text-main)] scale-110" : "border-transparent hover:scale-110",
                      `bg-${c}-500`
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-3xl mb-8">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-2">Subcategorías (Píldoras)</label>
            
            <div className="flex flex-wrap gap-1.5 mb-4">
              {editCats.length === 0 ? (
                <span className="text-xs text-primary italic">Sin subcategorías</span>
              ) : (
                editCats.map(cat => (
                  <div key={cat} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border", getAreaTextClasses(editColor), getAreaBorderClasses(editColor))}>
                    {cat}
                    <button type="button" onClick={() => setEditCats(editCats.filter(c => c !== cat))} className="hover:text-red-500 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-4">
              <input 
                type="text" 
                value={editNewCat} 
                onChange={e => setEditNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddEditCategory(e); }}
                placeholder="NUEVA CATEGORÍA..."
                className="flex-1 bg-base border border-border-line rounded-xl px-4 py-2 text-xs uppercase focus:outline-none text-text-main"
              />
              <button type="button" onClick={handleAddEditCategory} className="text-text-main font-mono uppercase tracking-wider font-bold text-xs hover:underline transition-all cursor-pointer">
                + Añadir
              </button>
            </div>
          </div>

          <div className="flex gap-6">
            <button 
              onClick={handleSaveConfig} 
              className="text-text-main font-mono uppercase tracking-wider font-bold text-xs hover:underline transition-all cursor-pointer"
            >
              Guardar Cambios
            </button>
            <button 
              onClick={() => setIsEditing(false)} 
              className="text-text-dim font-mono uppercase tracking-wider font-bold text-xs hover:underline transition-all cursor-pointer ml-6"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* RENDER HORIZONTAL COLLAPSIBLE LISTS (Accordion Style) */}
      <div className="flex-1 p-6 md:p-10 flex flex-col gap-6 max-w-4xl w-full mx-auto text-left pb-16 bg-base">
         <section className="border-b border-border-line/30 pb-6">
            <h3
              onClick={() => setExpandCommitments(!expandCommitments)}
              aria-label={expandCommitments ? 'Contraer compromisos vigentes' : 'Expandir compromisos vigentes'}
              aria-expanded={expandCommitments}
              title={expandCommitments ? 'Contraer compromisos vigentes' : 'Expandir compromisos vigentes'}
              className="text-subtitle flex items-center justify-between gap-4 cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Compromisos vigentes ({activeCommitments.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandCommitments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </h3>

            {expandCommitments && (commitmentGroups.length === 0 ? (
              <p className="text-xs text-primary italic">No hay compromisos vigentes en esta area.</p>
            ) : (
              <div className="space-y-5 mt-4 animate-in fade-in duration-200">
                {commitmentGroups.map(({ scale, commitments }) => (
                  <div key={scale} className="space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-main">
                        {INTENTION_SCALE_LABELS[scale]}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-text-dim">
                        {formatPeriodDate(commitments[0].intention.periodStart)} - {formatPeriodDate(commitments[0].intention.periodEnd)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {commitments.map(({ intention, item }) => {
                        const summary = getCommitmentSummary(item, intention.periodStart, intention.periodEnd);
                        return (
                          <div key={item.id} className="w-full border border-border-line/30 px-4 py-3 flex flex-col gap-2 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm text-text-main truncate" title={getIntentionItemLabel(item, tasks)}>
                                  {getIntentionItemLabel(item, tasks)}
                                </p>
                                <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-text-dim">
                                  {summary.typeLabel}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-mono text-text-main">{Math.round(summary.percent)}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-text-dim">
                              <span>{summary.value}</span>
                              <span>Meta activa</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-base-dim/50 border border-border-line/10">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500', summary.percent >= 100 ? 'bg-emerald-500' : 'bg-primary/80')}
                                style={{ width: `${summary.percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
         </section>
         
         {/* 1. PROJECTS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandProjects(!expandProjects)}
              aria-label={expandProjects ? 'Contraer proyectos' : 'Expandir proyectos'}
              aria-expanded={expandProjects}
              title={expandProjects ? 'Contraer proyectos' : 'Expandir proyectos'}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" /> Proyectos Operativos ({projectsInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandProjects ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </h3>

            {expandProjects && (
              <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                {projectsInArea.length === 0 ? (
                  <p className="text-xs text-primary pl-6 italic">Sin proyectos creados.</p>
                ) : (
                  projectsInArea.map(proj => (
                    <div key={proj.id} className="relative p-4 transition-colors group hover:bg-base-dim/20 border-b border-border-line/20 last:border-0 flex items-center justify-between">
                       <div className="flex flex-col gap-1 items-start">
                         <div className="flex items-center gap-2">
                           <h4 className="text-item font-medium leading-none">{proj.text}</h4>
                           {onNavigate && (
                             <button 
                               onClick={() => onNavigate('proyectos', proj.id)}
                               className="text-primary hover:text-text-main p-1 cursor-pointer bg-transparent border-0"
                               title="Ir a su ubicación en vista Proyectos"
                             >
                               <ArrowUpRight className="w-3.5 h-3.5"/>
                             </button>
                           )}
                         </div>
                         {proj.subCategory && (
                           <CategoryBadge area={proj.category} subCategory={proj.subCategory} config={config} className="mt-1" hideArea />
                         )}
                       </div>
                       <button onClick={() => { if(confirm('¿Eliminar proyecto?')) onDeleteTask(proj.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-red-500 p-1 rounded hover:bg-red-50/10 cursor-pointer">
                         <X className="w-4 h-4"/>
                       </button>
                    </div>
                  ))
                )}
              </div>
            )}
         </div>

         {/* 2. RUTINAS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandRoutines(!expandRoutines)}
              aria-label={expandRoutines ? 'Contraer rutinas' : 'Expandir rutinas'}
              aria-expanded={expandRoutines}
              title={expandRoutines ? 'Contraer rutinas' : 'Expandir rutinas'}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" /> Rutinas del Pilar ({routinesInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandRoutines ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </h3>

            {expandRoutines && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                {routinesInArea.length === 0 ? (
                  <p className="text-xs text-primary pl-6 italic">Sin rutinas asignadas en este pilar.</p>
                ) : (
                  routinesInArea.map(r => {
                    const childHabits = tasks.filter(h => h.parentId === r.id && h.type === 'Hábito');
                    return (
                      <div key={r.id} className="flex flex-col border-b border-border-line/10 pb-4 last:border-0 last:pb-0">
                        <TaskItem
                          task={r}
                          config={config}
                          allTasks={tasks}
                          history={history}
                          onToggle={onToggleTask}
                          onDelete={() => onDeleteTask(r.id)}
                          onUpdate={onUpdateTask}
                          onAddTask={onAddTask}
                          onDeleteTask={onDeleteTask}
                          onNavigateToLocation={onNavigate ? () => onNavigate('rutinas', r.id) : undefined}
                        />
                        
                        {/* Nested Child Habits */}
                        {childHabits.length > 0 && (
                          <div className="pl-12 flex flex-col gap-2 mt-2">
                            {childHabits.map(h => (
                              <TaskItem
                                key={h.id}
                                task={h}
                                config={config}
                                allTasks={tasks}
                                history={history}
                                onToggle={onToggleTask}
                                onDelete={() => onDeleteTask(h.id)}
                                onUpdate={onUpdateTask}
                                onAddTask={onAddTask}
                                onDeleteTask={onDeleteTask}
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

         {/* 3. HABITS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandHabits(!expandHabits)}
              aria-label={expandHabits ? 'Contraer hábitos' : 'Expandir hábitos'}
              aria-expanded={expandHabits}
              title={expandHabits ? 'Contraer hábitos' : 'Expandir hábitos'}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" /> Hábitos Recurrentes ({habitsInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandHabits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </h3>

            {expandHabits && (
              <div className="mt-4 space-y-2 animate-in fade-in duration-200">
                {habitsInArea.length === 0 ? (
                  <p className="text-xs text-primary pl-6 italic">Sin hábitos asignados.</p>
                ) : (
                  habitsInArea.map(hab => (
                    <TaskItem
                       key={hab.id}
                       task={hab}
                       config={config}
                       allTasks={tasks}
                       history={history}
                       onToggle={onToggleTask}
                       onDelete={() => onDeleteTask(hab.id)}
                       onUpdate={onUpdateTask}
                       onAddTask={onAddTask}
                       onDeleteTask={onDeleteTask}
                       onNavigateToLocation={onNavigate ? () => onNavigate('rutinas', hab.id) : undefined}
                     />
                  ))
                )}
              </div>
            )}
         </div>

         {/* 4. ACTIONS SECTION */}
         <div>
            <h3 
              onClick={() => setExpandTasks(!expandTasks)}
              aria-label={expandTasks ? 'Contraer tareas' : 'Expandir tareas'}
              aria-expanded={expandTasks}
              title={expandTasks ? 'Contraer tareas' : 'Expandir tareas'}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-accent" /> Acciones y Tareas ({standaloneTasks.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandTasks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </h3>

            {expandTasks && (
              <div className="mt-4 space-y-2 animate-in fade-in duration-200">
                {standaloneTasks.length === 0 ? (
                  <p className="text-xs text-primary pl-6 italic">Sin tareas individuales registradas.</p>
                ) : (
                  standaloneTasks.map(t => (
                    <TaskItem
                       key={t.id}
                       task={t}
                       config={config}
                       allTasks={tasks}
                       history={history}
                       onToggle={onToggleTask}
                       onDelete={() => onDeleteTask(t.id)}
                       onUpdate={onUpdateTask}
                       onAddTask={onAddTask}
                       onDeleteTask={onDeleteTask}
                       onNavigateToLocation={onNavigate ? () => onNavigate('proyectos', t.id) : undefined}
                     />
                  ))
                )}
              </div>
            )}
         </div>

      </div>
    </div>
  );
}
