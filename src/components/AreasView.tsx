import React, { useState } from 'react';
import { Shapes, Plus, Edit2, Trash2, Tag, Save, X, ArrowRight, Folder, CheckSquare, Repeat, Circle, ChevronLeft, ArrowUpRight, LayoutGrid, Layers, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { Config, AreaConfig, AppTask, HistoryRecord } from '../types';
import { cn, getAreaColorClasses } from '../lib/utils';
import TaskItem from './TaskItem';

const COLORS = ['slate', 'blue', 'orange', 'purple', 'emerald', 'amber', 'red', 'green', 'teal', 'cyan'];

interface Props {
  config: Config | null;
  tasks: AppTask[];
  history?: HistoryRecord[];
  onUpdateConfig: (c: Partial<Config>) => void;
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  onNavigate?: (view: 'hoy' | 'proyectos' | 'calendario' | 'areas' | 'completadas' | 'rutinas' | 'reportes' | 'syllabus' | 'configuracion', taskId?: string) => void;
}

export default function AreasView({ config, tasks, history, onUpdateConfig, onToggleTask, onDeleteTask, onAddTask, onUpdateTask, onNavigate }: Props) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const areas = config?.areas || {};

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
    <div className="animate-in fade-in flex flex-col h-full bg-base">
      {/* Header Statement */}
      <div className="p-6 md:p-10 relative">
         <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
         <h1 className="text-title mb-2 leading-none flex items-center gap-3">
            <Shapes className="w-6 h-6 text-text-main" /> Áreas de Vida
         </h1>
         <p className="text-sm text-text-dim max-w-2xl leading-relaxed">
           Los pilares fundamentales de su arquitectura operativa. Estructura modular para la gestión de proyectos y hábitos recurrentes.
         </p>
      </div>

      <AreasList areas={areas} tasks={tasks} onSelect={setSelectedArea} onUpdate={handleUpdateAreas} />
    </div>
  );
}

function AreasList({ areas, tasks, onSelect, onUpdate }: { areas: Record<string, string | AreaConfig>, tasks: AppTask[], onSelect: (key: string) => void, onUpdate: (areas: Record<string, string | AreaConfig>) => void }) {
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
                  className="w-full bg-transparent border-b border-[var(--color-text-main)] py-3 font-bold text-xl uppercase tracking-wider focus:outline-none text-text-main placeholder:text-primary/50" 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="EJ. SYSTEM, MIND..."
                />
              </div>
              <div>
                <label className="text-label block mb-2">INDEX COLOR</label>
                <select 
                  className="w-full bg-transparent border-b border-[var(--color-text-main)] py-3 text-sm focus:outline-none uppercase text-text-main bg-base"
                  value={editForm.color}
                  onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                >
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
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
                  className="flex-1 bg-transparent border-b border-[var(--color-primary)] py-2 text-xs uppercase focus:outline-none text-text-main focus:border-[var(--color-text-main)]"
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
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border-line bg-base">
            {areaEntries.map(([key, val], index) => {
            const categories = typeof val === 'string' ? [] : (val.categories || []);
            const areaColor = typeof val === 'string' ? val : (val.color || 'slate');
            const activeProjects = tasks.filter(t => t.category === key && t.type === 'Proyecto' && !t.completed);
            const activeHabits = tasks.filter(t => t.category === key && t.type === 'Hábito' && !t.completed);
            const activeGoals = tasks.filter(t => t.category === key && t.type === 'Meta' && !t.completed);

            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className="relative text-left group flex flex-col p-6 md:p-10 transition-colors hover:bg-base-dim/30 min-h-[240px] cursor-pointer"
              >
                <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-[var(--color-border-line)]" />
                {index % 2 === 0 && <div className="absolute right-0 top-6 bottom-6 w-[1px] bg-[var(--color-border-line)] hidden md:block" />}
                
                <div className="flex items-center justify-between w-full mb-8">
                  <div className="flex items-center gap-4">
                    <span className="text-subtitle leading-none font-sans font-light">{key}</span>
                  </div>
                  <Circle className="w-1.5 h-1.5 text-text-main" strokeWidth={3} />
                </div>

                <div className="flex flex-col gap-2 w-full mb-8 text-xs font-mono text-text-dim">
                  <div className="flex justify-between items-center w-full">
                    <span className="tracking-wide">METAS</span>
                    <div className="flex-grow border-b border-dotted border-border-line mx-2"></div>
                    <span className="text-text-main font-bold">{activeGoals.length.toString().padStart(2, '0')}</span>
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

                <div className="flex items-end justify-between w-full mt-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.slice(0, 3).map(cat => (
                      <span key={cat} className={cn("text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-dashed", getAreaColorClasses(areaColor))}>
                        {cat}
                      </span>
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
            className="relative flex flex-col items-center justify-center p-6 md:p-10 text-primary hover:text-accent hover:bg-base-dim/30 transition-all min-h-[240px] cursor-pointer"
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
  const [expandGoals, setExpandGoals] = useState(true);
  const [expandProjects, setExpandProjects] = useState(true);
  const [expandHabits, setExpandHabits] = useState(true);
  const [expandTasks, setExpandTasks] = useState(true);

  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    onAddTask({
      userId: 'placeholder',
      text: newGoalText.trim(),
      category: areaName,
      type: 'Meta',
      completed: false,
      createdAt: new Date().toISOString()
    });
    setNewGoalText('');
    setAddingGoal(false);
  };

  const goalsInArea = tasks.filter(t => t.type === 'Meta' && t.category === areaName);
  const projectsInArea = tasks.filter(t => t.type === 'Proyecto' && t.category === areaName);
  const habitsInArea = tasks.filter(t => t.category === areaName && t.type === 'Hábito' && (!t.parentId || tasks.find(p=>p.id===t.parentId)?.type==='Rutina'));
  const standaloneTasks = tasks.filter(t => t.category === areaName && t.type !== 'Proyecto' && t.type !== 'Hábito' && t.type !== 'Rutina' && t.type !== 'Meta' && (!t.parentId || tasks.find(p=>p.id===t.parentId)?.type==='Rutina'));

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
                <span key={cat} className={cn("text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-dashed", getAreaColorClasses(areaColor))}>
                  {cat}
                </span>
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
                className="w-full bg-transparent border-b border-[var(--color-text-main)] py-2 font-bold text-lg uppercase focus:outline-none text-text-main" 
                value={editName} 
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Color de Acento</label>
              <select 
                className="w-full bg-transparent border-b border-[var(--color-text-main)] py-2 text-sm focus:outline-none uppercase font-mono text-text-main bg-base"
                value={editColor}
                onChange={e => setEditColor(e.target.value)}
              >
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="max-w-3xl mb-8">
            <label className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-2">Subcategorías (Píldoras)</label>
            
            <div className="flex flex-wrap gap-1.5 mb-4">
              {editCats.length === 0 ? (
                <span className="text-xs text-primary italic">Sin subcategorías</span>
              ) : (
                editCats.map(cat => (
                  <div key={cat} className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border border-dashed", getAreaColorClasses(editColor))}>
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
                className="flex-1 bg-transparent border-b border-[var(--color-primary)] py-1.5 text-xs uppercase focus:outline-none font-mono text-text-main focus:border-[var(--color-text-main)]"
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
         
         {/* 1. METAS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandGoals(!expandGoals)}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Metas de Enfoque ({goalsInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandGoals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandGoals ? 'Ocultar' : 'Mostrar'}
              </span>
            </h3>

            {expandGoals && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                {goalsInArea.length === 0 ? (
                  <p className="text-xs text-primary pl-6 italic">Sin metas registradas en este pilar.</p>
                ) : (
                  <div className="space-y-4">
                    {goalsInArea.map(g => {
                      const associatedProjects = tasks.filter(t => t.type === 'Proyecto' && t.parentId === g.id);
                      const totalProj = associatedProjects.length;
                      const completedProj = associatedProjects.filter(p => p.completed).length;
                      const metaProgress = totalProj > 0 ? Math.round((completedProj / totalProj) * 100) : null;
                      
                      return (
                        <div key={g.id} className="flex flex-col border-b border-border-line/10 pb-4 last:border-0 last:pb-0">
                          <TaskItem
                            task={g}
                            config={config}
                            allTasks={tasks}
                            history={history}
                            onToggle={onToggleTask}
                            onDelete={() => onDeleteTask(g.id)}
                            onUpdate={onUpdateTask}
                            onAddTask={onAddTask}
                            onDeleteTask={onDeleteTask}
                            onNavigateToLocation={onNavigate ? () => onNavigate('proyectos', g.id) : undefined}
                          />
                          
                          {/* Meta Progress & Associated Projects */}
                          <div className="pl-12 flex flex-col gap-1.5 text-xs font-mono text-text-dim text-left mt-1">
                            {metaProgress !== null && (
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-primary">Progreso:</span>
                                <div className="w-24 h-1 bg-base-dim/60 rounded-full overflow-hidden border border-border-line/10">
                                  <div className="h-full bg-primary" style={{ width: `${metaProgress}%` }} />
                                </div>
                                <span className="text-[9px] text-text-main font-bold">{metaProgress}% ({completedProj}/{totalProj} Proyectos)</span>
                              </div>
                            )}
                            
                            {associatedProjects.length > 0 && (
                              <div className="flex flex-col gap-1 mt-1 pl-3 border-l border-border-line/20">
                                {associatedProjects.map(p => (
                                  <div key={p.id} className="flex items-center gap-2 text-[10px] text-text-dim/80">
                                    <span>↳</span>
                                    <span className={cn(p.completed && "line-through opacity-60")}>{p.text}</span>
                                    <span className={cn("text-[8px] px-1.5 rounded-full uppercase tracking-wide leading-none py-0.5", 
                                      p.completed 
                                        ? "bg-slate-100 text-slate-500 border border-slate-200/50" 
                                        : "bg-primary/10 text-primary border border-primary/20"
                                    )}>
                                      {p.completed ? "Listo" : "En curso"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {addingGoal ? (
                  <form onSubmit={handleAddGoal} className="flex items-center gap-4 mt-3 pl-6 text-left animate-in slide-in-from-top-1 duration-150">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Nombre de la nueva meta..."
                      className="flex-1 px-4 py-1.5 text-xs bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                      value={newGoalText}
                      onChange={e => setNewGoalText(e.target.value)}
                      onBlur={() => {
                        if (!newGoalText.trim()) setAddingGoal(false);
                      }}
                    />
                    <button type="submit" disabled={!newGoalText.trim()} className="text-text-main disabled:opacity-40 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:opacity-75 transition-opacity ml-2 cursor-pointer hover:underline bg-transparent border-0 outline-none">
                      + Crear
                    </button>
                  </form>
                ) : (
                  <button 
                    onClick={() => {
                      setAddingGoal(true);
                      setNewGoalText('');
                    }}
                    className="mt-3 pl-6 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-dim hover:text-text-main hover:underline transition-colors py-1 bg-transparent border-0 outline-none cursor-pointer"
                  >
                    + Nueva Meta
                  </button>
                )}
              </div>
            )}
         </div>

         {/* 2. PROJECTS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandProjects(!expandProjects)}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" /> Proyectos Operativos ({projectsInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandProjects ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandProjects ? 'Ocultar' : 'Mostrar'}
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
                           <span className="text-[9px] font-mono uppercase tracking-wider border border-border-line text-accent px-2 py-0.5 rounded-full mt-1 bg-transparent">
                             {proj.subCategory}
                           </span>
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

         {/* 3. HABITS SECTION */}
         <div className="border-b border-border-line/30 pb-6">
            <h3 
              onClick={() => setExpandHabits(!expandHabits)}
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" /> Hábitos Recurrentes ({habitsInArea.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandHabits ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandHabits ? 'Ocultar' : 'Mostrar'}
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
              className="text-subtitle flex items-center justify-between cursor-pointer group hover:opacity-85 select-none"
            >
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-accent" /> Acciones y Tareas ({standaloneTasks.length})
              </span>
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-normal flex items-center gap-1">
                {expandTasks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandTasks ? 'Ocultar' : 'Mostrar'}
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
