import React, { useState, useMemo, useEffect } from 'react';
import { Layers, ChevronDown, ChevronUp, ChevronRight, CheckCircle, Folder, Plus, X, Edit2, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { AppTask, Config, HistoryRecord } from '../types';
import TaskItem from './TaskItem';
import SectionList from './ui/SectionList';
import ViewHeader from './ui/ViewHeader';
import GanttChart, { GanttScale } from './GanttChart';
import ListControls from './ui/ListControls';
import { cn, getAreaColorClasses, getAreaProgressClasses, getAreaTextClasses, isFutureDate } from '../lib/utils';

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
  history?: HistoryRecord[];
  onToggleTask: (task: AppTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
  activeTimer?: { taskId: string; isRunning: boolean } | null;
  onStartTimer?: (taskId: string) => void;
  focusTaskId?: string | null;
}

export default function ProyectosView({ config, tasks, history, onToggleTask, onDeleteTask, onAddTask, onUpdateTask, activeTimer, onStartTimer, focusTaskId }: Props) {
  const [filter, setFilter] = useState('Todas');
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newProjForm, setNewProjForm] = useState({ text: '', category: '', subCategory: '', parentId: '' });
  const [newTaskForm, setNewTaskForm] = useState({ text: '', category: '', subCategory: '', fechaPlanificada: new Date().toISOString().substring(0, 10), duracion: 0 });
  
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editProjForm, setEditProjForm] = useState({ text: '', category: '', subCategory: '', parentId: '' });

  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedProjs, setExpandedProjs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'name' | 'progress'>('manual');
  const [openMenuProjId, setOpenMenuProjId] = useState<string | null>(null);
  const [menuProjUpwards, setMenuProjUpwards] = useState(false);

  // Collapsible states
  const [isGanttOpen, setIsGanttOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [ganttScaleView, setGanttScaleView] = useState<GanttScale>('ciclo');

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
    } else if (criterion === 'progress') {
      sortedPending.sort((a, b) => {
        const getProgress = (t: AppTask) => {
          if (t.type === 'Proyecto') {
            const subs = tasks.filter(s => s.parentId === t.id);
            return subs.length ? (subs.filter(s => s.completed).length / subs.length) : (t.completed ? 1 : 0);
          }
          return t.completed ? 1 : 0;
        };
        return getProgress(b) - getProgress(a);
      });
    }

    const sortedCompleted = [...completed].sort((a, b) => {
      const aTime = a.lastExecutedAt ? new Date(a.lastExecutedAt).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastExecutedAt ? new Date(b.lastExecutedAt).getTime() : new Date(b.createdAt).getTime();
      return aTime - bTime;
    });

    return [...sortedPending, ...sortedCompleted];
  };




  const filteredTasksForGantt = useMemo(() => {
    if (filter === 'Todas') return tasks;
    const matchingProjIds = tasks.filter(t => t.type === 'Proyecto' && t.category === filter).map(t => t.id);
    return tasks.filter(t => 
      (t.type === 'Proyecto' && t.category === filter) || 
      (t.type === 'Tarea' && t.parentId && matchingProjIds.includes(t.parentId))
    );
  }, [tasks, filter]);

  React.useEffect(() => {
    if (focusTaskId) {
      const foundTask = tasks.find(t => t.id === focusTaskId);
      if (foundTask) {
        let projectToExpand = '';
        if (foundTask.type === 'Proyecto') {
          projectToExpand = foundTask.id;
        } else if (foundTask.parentId) {
          const parent = tasks.find(t => t.id === foundTask.parentId);
          if (parent && parent.type === 'Proyecto') {
            projectToExpand = parent.id;
          }
        }
        
        if (projectToExpand) {
          setExpandedProjs(prev => prev.includes(projectToExpand) ? prev : [...prev, projectToExpand]);
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

  const toggleProject = (id: string) => {
    setExpandedProjs(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  let projects = tasks.filter(t => t.type === 'Proyecto');
  if (filter !== 'Todas') {
    projects = projects.filter(p => p.category === filter);
  }

  const activeProjs = sortTasks(projects.filter(p => !p.completed), sortBy);
  const compProjs = sortTasks(projects.filter(p => p.completed), sortBy);

  // Standalone tasks (Tareas Simples)
  let standaloneTasks = tasks.filter(t => {
    if (t.type !== 'Tarea') return false;
    const proj = getProjectForTask(t.id, tasks);
    if (proj) return false;
    if (t.parentId) {
      const parent = tasks.find(p => p.id === t.parentId);
      if (parent && parent.type === 'Tarea') return false;
    }
    return true;
  });

  if (filter !== 'Todas') {
    standaloneTasks = standaloneTasks.filter(t => t.category === filter);
  }

  const activeStandaloneTasks = sortTasks(standaloneTasks.filter(t => !t.completed), sortBy);
  const completedStandaloneTasks = sortTasks(standaloneTasks.filter(t => t.completed), sortBy);

  const startEdit = (proj: AppTask) => {
    setEditProjForm({ 
      text: proj.text, 
      category: proj.category || '', 
      subCategory: proj.subCategory || '',
      parentId: proj.parentId || ''
    });
    setEditingProjId(proj.id);
  };

  const getProjSiblings = (proj: AppTask) => {
    const siblingsList = tasks.filter(t => t.type === 'Proyecto');
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

  const handleMoveProjUp = (proj: AppTask) => {
    const siblings = getProjSiblings(proj);
    const idx = siblings.findIndex(s => s.id === proj.id);
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
    onUpdateTask(proj.id, { order: newOrder });
  };

  const handleMoveProjDown = (proj: AppTask) => {
    const siblings = getProjSiblings(proj);
    const idx = siblings.findIndex(s => s.id === proj.id);
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
    onUpdateTask(proj.id, { order: newOrder });
  };

  const handleSaveEdit = () => {
    if (!editProjForm.text.trim() || !editProjForm.category || !editingProjId) return;
    
    const updates: Partial<AppTask> = {
      text: editProjForm.text.trim(),
      category: editProjForm.category,
      subCategory: editProjForm.subCategory || '',
      parentId: editProjForm.parentId || ''
    };
    
    onUpdateTask(editingProjId, updates);
    setEditingProjId(null);
  };

  const handleInlineAddTask = (e: React.FormEvent, proj: AppTask) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    onAddTask({
      userId: 'placeholder',
      text: newTaskText.trim(),
      category: proj.category,
      subCategory: proj.subCategory,
      type: 'Tarea',
      parentId: proj.id,
      completed: false,
      createdAt: new Date().toISOString()
    });

    setNewTaskText('');
    setAddingTaskId(null);
  };

  const renderProjBlock = (projList: AppTask[]) => projList.map(proj => {
    const rawSubtasks = tasks.filter(t => t.parentId === proj.id);
    const subtasks = sortTasks(rawSubtasks, sortBy);
    const progress = subtasks.length 
      ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100) 
      : (proj.completed ? 100 : 0);
    
    const projDuration = subtasks.filter(s => !s.completed).reduce((acc, s) => acc + (s.duracion || 0), 0);
    const areaProps = config?.areas?.[proj.category || ''];
    const pColor = typeof areaProps === 'string' ? areaProps : (areaProps?.color || 'slate');

    if (editingProjId === proj.id) {
       return (
         <div key={proj.id} className="bg-base-dim/20 p-5 border border-border-line mb-4 text-left animate-in slide-in-from-top-1 duration-200">
            <h4 className="text-[10px] font-mono tracking-widest text-primary font-bold mb-3 uppercase">Editando Proyecto</h4>
             <div className="flex flex-col md:flex-row gap-3 mb-4">
               <input 
                 autoFocus
                 type="text" 
                 className="flex-1 px-4 py-2 bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                 value={editProjForm.text}
                 onChange={e => setEditProjForm({...editProjForm, text: e.target.value})}
               />
               <AreaCategoryDropdown
                 config={config}
                 value={`${editProjForm.category}${editProjForm.subCategory ? ':' + editProjForm.subCategory : ''}`}
                 onChange={(category, subCategory) => {
                   setEditProjForm({...editProjForm, category, subCategory, parentId: ''});
                 }}
                 placeholder="Seleccionar Área"
               />
             </div>
            <div className="flex justify-end gap-6 items-center">
              <button onClick={() => setEditingProjId(null)} className="text-xs font-mono uppercase tracking-wider text-text-dim hover:underline cursor-pointer bg-transparent border-0 outline-none">Cancelar</button>
              <button onClick={handleSaveEdit} className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 bg-transparent border-0 outline-none" disabled={!editProjForm.text.trim() || !editProjForm.category}>
                Guardar
              </button>
            </div>
         </div>
       );
    }

    const isExpanded = expandedProjs.includes(proj.id);
    const idx = projList.findIndex(p => p.id === proj.id);
    const isFirstItem = idx <= 0;
    const isLastItem = idx === -1 || idx === projList.length - 1;

    return (
      <div key={proj.id} id={`task-item-${proj.id}`} className={cn("relative p-4 transition-all group border-b last:border-b-0 border-border-line/40", proj.completed && "grayscale")}>
        
        <div className="flex items-start gap-3 md:gap-4 w-full">
          {/* Toggle button showing project type icon */}
          <button onClick={() => onToggleTask(proj)} className="mt-1 flex-shrink-0 focus:outline-none hover:scale-105 transition-transform bg-transparent border-0 cursor-pointer flex items-center justify-center w-5 h-5 rounded-full hover:bg-base-dim/40">
             {proj.completed ? (
               <CheckCircle className="text-emerald-600 dark:text-emerald-500 w-4 h-4" />
             ) : (
               <span className="text-text-main/70 group-hover:text-text-main transition-colors flex items-center justify-center shrink-0">
                 <Folder className={cn("w-3.5 h-3.5", getAreaTextClasses(pColor))} />
               </span>
             )}
          </button>

          {/* Middle content: text, badges, progress bar */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h3 className={cn("text-base font-medium text-text-main", proj.completed ? "line-through opacity-60 font-light" : "")}>
                {proj.text}
              </h3>
              <div className="flex gap-1.5">
                <span className={cn("text-[9px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full leading-none flex items-center", getAreaColorClasses(pColor))}>
                  {proj.category}
                </span>
                {proj.subCategory && (
                  <span className={cn("text-[9px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full bg-transparent opacity-85 leading-none flex items-center", getAreaColorClasses(pColor))}>
                    {proj.subCategory}
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-text-dim font-mono uppercase tracking-wider mb-2">
              {proj.priority} • {subtasks.length} Tareas 
              {projDuration > 0 && <span className="ml-1.5 font-bold">• ⏱ {projDuration.toFixed(1)}h</span>}
            </p>

            <div className="flex items-center gap-3 w-full max-w-xs">
              <span className="text-[10px] font-mono font-bold text-text-dim leading-none">{progress}%</span>
              <div className="flex-1 h-[2px] bg-[var(--color-border-line)]/50 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all", getAreaProgressClasses(pColor))} style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Controls Column (on the right) */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 w-6 pt-1">
            {/* Chevron */}
            <button 
              title={isExpanded ? "Ocultar Tareas" : "Ver Tareas"} 
              onClick={() => toggleProject(proj.id)} 
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
                  setMenuProjUpwards(spaceBelow < 250);
                  setOpenMenuProjId(openMenuProjId === proj.id ? null : proj.id); 
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

              {openMenuProjId === proj.id && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenMenuProjId(null)} />
                  <div className={cn(
                    "absolute right-0 z-50 w-40 bg-base border border-border-line rounded-xl shadow-lg p-1 glass-matte flex flex-col text-left",
                    menuProjUpwards ? "bottom-full mb-1" : "top-full mt-1"
                  )}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEdit(proj); setOpenMenuProjId(null); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light"
                    >
                      <svg className="w-3 h-3 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      Editar
                    </button>
                    {sortBy === 'manual' && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveProjUp(proj); setOpenMenuProjId(null); }}
                          disabled={isFirstItem}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-main hover:bg-base-dim/40 rounded-lg cursor-pointer bg-transparent border-0 text-left w-full font-light disabled:opacity-40 disabled:pointer-events-none"
                        >
                          <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                          Mover arriba
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleMoveProjDown(proj); setOpenMenuProjId(null); }}
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
                        setOpenMenuProjId(null);
                        if (window.confirm(`¿Estás segura de que deseas eliminar permanentemente el proyecto "${proj.text}" y todas sus tareas?`)) {
                          onDeleteTask(proj.id);
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
                  onClick={(e) => { e.stopPropagation(); handleMoveProjUp(proj); }}
                  disabled={isFirstItem}
                  className="p-0.5 text-text-dim/40 hover:text-text-main disabled:opacity-20 cursor-pointer bg-transparent border-0 flex items-center justify-center rounded hover:bg-base-dim/50 transition-colors"
                  title="Mover arriba"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMoveProjDown(proj); }}
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

        {isExpanded && (
          <div className="relative pl-2 flex flex-col gap-2 mt-4 animate-in fade-in duration-200">
            {addingTaskId === proj.id ? (
              <form onSubmit={e => handleInlineAddTask(e, proj)} className="flex items-center gap-4 mt-1 mb-2 ml-8 text-left w-full pr-2">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Nombre de la nueva tarea..."
                  className="flex-1 px-4 py-1.5 text-sm bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onBlur={() => {
                    if (!newTaskText.trim()) setAddingTaskId(null);
                  }}
                />
                <button type="submit" disabled={!newTaskText.trim()} className="text-text-main disabled:opacity-40 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:opacity-75 transition-opacity ml-2 cursor-pointer hover:underline bg-transparent border-0 outline-none">
                  + Añadir
                </button>
              </form>
            ) : (
              <button 
                onClick={() => {
                  setAddingTaskId(proj.id);
                  setNewTaskText('');
                }}
                className="mt-1 mb-2 ml-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-dim hover:text-text-main hover:underline transition-colors py-2 cursor-pointer bg-transparent border-0 outline-none"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Tarea
              </button>
            )}

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
                hideAreaCategory
                activeTimer={activeTimer}
                onStartTimer={onStartTimer}
                showMoveArrows={sortBy === 'manual'}
              />
            ))}
          </div>
        )}
      </div>
    );
  });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjForm.text.trim() || !newProjForm.category) return;
    
    const newTask: Omit<AppTask, 'id'> = {
      userId: 'placeholder',
      text: newProjForm.text.trim(),
      category: newProjForm.category,
      type: 'Proyecto',
      completed: false,
      parentId: newProjForm.parentId || undefined,
      createdAt: new Date().toISOString()
    };
    
    if (newProjForm.subCategory) {
      newTask.subCategory = newProjForm.subCategory;
    }
    
    onAddTask(newTask);
    setNewProjForm({ text: '', category: '', subCategory: '', parentId: '' });
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-6 pt-6 pb-16 px-6 md:px-10 max-w-4xl mx-auto w-full">
      
      {/* Toolbar instead of ViewHeader */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full mb-2 gap-4">
        
        {/* Left Side: Selectors */}
        <ListControls 
          currentFilter={filter}
          onFilterChange={setFilter}
          filterOptions={[
            { label: 'Todas las áreas', value: 'Todas' },
            ...Object.keys(config?.areas || {}).map(cat => ({ label: cat, value: cat }))
          ]}
          currentSort={sortBy}
          onSortChange={(val) => setSortBy(val as any)}
          sortOptions={[
            { label: 'Manual', value: 'manual' },
            { label: 'Prioridad', value: 'priority' },
            { label: 'Fecha', value: 'date' },
            { label: 'Nombre', value: 'name' },
            { label: 'Progreso', value: 'progress' }
          ]}
        />
        
        {/* Right Side: Actions */}
        {!isAdding && !isAddingTask && (
          <div className="flex flex-wrap items-center justify-end gap-4 font-sans text-[10px] uppercase tracking-widest font-bold">
            <button 
              onClick={() => setIsAdding(true)} 
              className="text-text-main hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors"
            >
              + Nuevo Proyecto
            </button>
            <button 
              onClick={() => {
                setIsAddingTask(true);
                setNewTaskForm({
                  text: '',
                  category: filter !== 'Todas' ? filter : '',
                  subCategory: '',
                  fechaPlanificada: new Date().toISOString().substring(0, 10),
                  duracion: 0
                });
              }} 
              className="text-text-main hover:underline cursor-pointer bg-transparent border-0 outline-none transition-colors"
            >
              + Nueva Tarea Simple
            </button>
          </div>
        )}
      </div>

      {isAddingTask && (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskForm.text.trim() || !newTaskForm.category) return;
            onAddTask({
              userId: 'placeholder',
              text: newTaskForm.text.trim(),
              category: newTaskForm.category,
              subCategory: newTaskForm.subCategory || undefined,
              type: 'Tarea',
              completed: false,
              fechaPlanificada: new Date(newTaskForm.fechaPlanificada).toISOString(),
              duracion: Number(newTaskForm.duracion || 0),
              createdAt: new Date().toISOString()
            });
            setIsAddingTask(false);
          }} 
          className="bg-base-dim/20 border border-border-line p-5 mb-6 text-left animate-in slide-in-from-top-2 duration-300 flex flex-col gap-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Crear Nueva Tarea Simple</h3>
            <button type="button" onClick={() => setIsAddingTask(false)} className="text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0">
              <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              autoFocus
              type="text" 
              placeholder="Nombre de la tarea..."
              className="flex-1 px-4 py-2 bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={newTaskForm.text}
              onChange={e => setNewTaskForm({...newTaskForm, text: e.target.value})}
            />
            <AreaCategoryDropdown
              config={config}
              value={`${newTaskForm.category}${newTaskForm.subCategory ? ':' + newTaskForm.subCategory : ''}`}
              onChange={(category, subCategory) => {
                setNewTaskForm({...newTaskForm, category, subCategory});
              }}
              placeholder="Seleccionar Área"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-dim font-mono uppercase">Fecha:</span>
              <input 
                type="date"
                className="px-3 py-1.5 text-xs bg-base border border-border-line rounded-full text-text-main font-mono"
                value={newTaskForm.fechaPlanificada}
                onChange={e => setNewTaskForm({...newTaskForm, fechaPlanificada: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-dim font-mono uppercase">Duración:</span>
              <div className="flex items-center gap-1 bg-base border border-border-line rounded-full px-3 py-1.5">
                <input 
                  type="number" 
                  min={0} 
                  step="0.1"
                  className="w-10 bg-transparent text-text-main text-xs font-bold focus:outline-none text-center" 
                  value={newTaskForm.duracion || ''} 
                  onChange={e => setNewTaskForm({...newTaskForm, duracion: Number(e.target.value)})}
                  placeholder="0.0"
                />
                <span className="text-xs text-text-dim font-mono font-bold">h</span>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={!newTaskForm.text.trim() || !newTaskForm.category} 
              className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 sm:ml-auto bg-transparent border-0 outline-none"
            >
              Crear Tarea
            </button>
          </div>
        </form>
      )}

      {isAdding && (
        <form onSubmit={handleAddProject} className="bg-base-dim/20 border border-border-line p-5 mb-6 text-left animate-in slide-in-from-top-2 duration-300">
           <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Crear Nuevo Proyecto</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0">
               <X className="w-4 h-4"/>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              autoFocus
              type="text" 
              placeholder="Nombre del proyecto..."
              className="flex-1 px-4 py-2 bg-base text-text-main border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f]"
              value={newProjForm.text}
              onChange={e => setNewProjForm({...newProjForm, text: e.target.value})}
            />
            <AreaCategoryDropdown
              config={config}
              value={`${newProjForm.category}${newProjForm.subCategory ? ':' + newProjForm.subCategory : ''}`}
              onChange={(category, subCategory) => {
                setNewProjForm({...newProjForm, category, subCategory, parentId: ''});
              }}
              placeholder="SELECCIONAR ÁREA / CATEGORÍA"
            />
            <button type="submit" disabled={!newProjForm.text.trim() || !newProjForm.category} className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 sm:ml-4 bg-transparent border-0 outline-none">
              Crear
            </button>
          </div>
        </form>
      )}

      {/* Gantt Chart Section */}
      <div className="mb-6">
        <div 
          onClick={() => setIsGanttOpen(!isGanttOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isGanttOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Línea de Tiempo (Gantt)
            </span>
          </div>
        </div>

        {isGanttOpen && (
          <div className="mt-4 animate-in fade-in duration-200">
            <GanttChart 
              config={config}
              tasks={tasks}
              onUpdateTask={onUpdateTask}
              scale={ganttScaleView === 'ciclo' ? 'cycle' : ganttScaleView === 'cuarto' ? 'quarter' : 'year'}
              periodStart={new Date().toISOString().substring(0, 10)}
              periodEnd={(() => {
                const end = new Date();
                if (ganttScaleView === 'ciclo') end.setDate(end.getDate() + 28);
                else if (ganttScaleView === 'cuarto') end.setDate(end.getDate() + 90);
                else end.setDate(end.getDate() + 365);
                return end.toISOString().substring(0, 10);
              })()}
            />
          </div>
        )}
      </div>

      {/* Activos list */}
      <div className="mb-6">
        <div 
          onClick={() => setIsProjectsOpen(!isProjectsOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isProjectsOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Proyectos Activos ({activeProjs.length})
            </span>
          </div>
        </div>

        {isProjectsOpen && (
          <div className="mt-4 animate-in fade-in duration-200">
            {activeProjs.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-dim/60 font-light font-sans bg-base-dim/5 border border-dashed border-border-line/40">
                No hay proyectos activos.
              </div>
            ) : (
              renderProjBlock(activeProjs)
            )}
          </div>
        )}
      </div>

      {/* Tareas Simples list */}
      <div className="mb-6">
        <div 
          onClick={() => setIsTasksOpen(!isTasksOpen)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group border-b border-border-line/40"
        >
          <div className="flex items-center gap-2">
            {isTasksOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Tareas Simples ({activeStandaloneTasks.length})
            </span>
          </div>
        </div>

        {isTasksOpen && (
          <div className="mt-4 animate-in fade-in duration-200">
            {activeStandaloneTasks.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-dim/60 font-light font-sans bg-base-dim/5 border border-dashed border-border-line/40">
                No hay tareas simples activas.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeStandaloneTasks.map(t => (
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
                    activeTimer={activeTimer}
                    onStartTimer={onStartTimer}
                    showMoveArrows={sortBy === 'manual'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completados list */}
      <div className="mt-10 border-t border-border-line/40 pt-4">
        <div 
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex justify-between items-center pb-2 cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2">
            {showCompleted ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
            )}
            <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
              Completados
            </span>
          </div>
        </div>

        {showCompleted && (
          <div className="mt-4 animate-in fade-in duration-200 flex flex-col gap-6">
            {compProjs.length > 0 && (
              <div>
                <h4 className="text-[10px] font-sans uppercase tracking-widest text-text-dim mb-4">Proyectos</h4>
                {renderProjBlock(compProjs)}
              </div>
            )}
            {completedStandaloneTasks.length > 0 && (
              <div>
                <h4 className="text-[10px] font-sans uppercase tracking-widest text-text-dim mb-4">Tareas Simples</h4>
                <div className="flex flex-col gap-3">
                  {completedStandaloneTasks.map(t => (
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
                      activeTimer={activeTimer}
                      onStartTimer={onStartTimer}
                      showMoveArrows={sortBy === 'manual'}
                    />
                  ))}
                </div>
              </div>
            )}
            {compProjs.length === 0 && completedStandaloneTasks.length === 0 && (
              <div className="text-center py-6 text-xs text-text-dim/60 font-light font-sans bg-base-dim/5 border border-dashed border-border-line/40">
                No hay elementos completados.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// Custom searchable collapsible dropdown
interface AreaCategoryDropdownProps {
  config: Config | null;
  value: string;
  onChange: (category: string, subCategory: string) => void;
  placeholder?: string;
}

function AreaCategoryDropdown({ config, value, onChange, placeholder = 'Seleccionar Área' }: AreaCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedAreas, setExpandedAreas] = useState<string[]>(Object.keys(config?.areas || {}));

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    setSearch('');
  };

  const toggleArea = (areaName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAreas(prev => 
      prev.includes(areaName) ? prev.filter(a => a !== areaName) : [...prev, areaName]
    );
  };

  const currentSelectionText = useMemo(() => {
    if (!value) return placeholder;
    const [cat, sub] = value.split(':');
    return sub ? `${cat} ➔ ${sub}` : cat;
  }, [value, placeholder]);

  const areas = config?.areas || {};

  const filteredAreas = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return Object.entries(areas);

    return Object.entries(areas).map(([areaName, areaConfig]) => {
      const areaMatch = areaName.toLowerCase().includes(query);
      const cats = typeof areaConfig === 'object' ? (areaConfig.categories || []) : [];
      const matchingCats = cats.filter(cat => cat.toLowerCase().includes(query));

      const configObj = typeof areaConfig === 'object' ? areaConfig : { color: areaConfig };
      if (areaMatch || matchingCats.length > 0) {
        return [areaName, {
          ...configObj,
          categories: areaMatch ? cats : matchingCats
        }];
      }
      return null;
    }).filter(Boolean) as [string, any][];
  }, [areas, search]);

  useEffect(() => {
    if (search.trim()) {
      setExpandedAreas(filteredAreas.map(([name]) => name));
    }
  }, [search, filteredAreas]);

  return (
    <div className="relative w-full sm:w-80 select-none z-30 text-left">
      <div 
        onClick={toggleDropdown}
        className="w-full flex items-center justify-between px-4 py-2 bg-base border border-border-line rounded-full cursor-pointer text-sm font-medium text-text-main hover:border-[#a2b29f] transition-all"
      >
        <span className="truncate">{currentSelectionText}</span>
        <ChevronDown className={cn("w-4 h-4 text-text-dim transition-transform duration-200", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
          
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-base border border-border-line shadow-lg max-h-80 overflow-y-auto flex flex-col p-2 rounded-2xl glass-matte">
            <input 
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-base-dim/20 border border-border-line rounded-full focus:outline-none focus:border-[#a2b29f] mb-2 text-text-main font-sans"
              autoFocus
            />

            <div className="flex flex-col gap-1 overflow-y-auto pr-1">
              {filteredAreas.length === 0 ? (
                <div className="text-[10px] text-text-dim font-mono text-center uppercase py-4">Sin resultados</div>
              ) : (
                filteredAreas.map(([areaName, areaConfig]) => {
                  const isExpanded = expandedAreas.includes(areaName);
                  const cats = typeof areaConfig === 'object' ? (areaConfig.categories || []) : [];
                  const color = typeof areaConfig === 'object' ? (areaConfig.color || 'slate') : areaConfig;

                  return (
                    <div key={areaName} className="flex flex-col border-b last:border-b-0 border-border-line/10 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                      <div 
                        onClick={() => {
                          onChange(areaName, '');
                          setIsOpen(false);
                        }}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-base-dim/40 cursor-pointer text-xs font-mono font-bold text-text-main group"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", 
                            color === 'emerald' ? 'bg-emerald-500' :
                            color === 'teal' ? 'bg-teal-500' :
                            color === 'amber' ? 'bg-amber-500' :
                            color === 'slate' ? 'bg-slate-400' : 'bg-slate-400'
                          )} />
                          <span>{areaName} (General)</span>
                        </div>
                        <button 
                          onClick={(e) => toggleArea(areaName, e)} 
                          className="p-1 hover:bg-base-dim/50 rounded text-text-dim hover:text-text-main transition-colors bg-transparent border-0 cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExpanded && cats.length > 0 && (
                        <div className="flex flex-col pl-4 gap-0.5 border-l border-border-line/20 ml-3">
                          {cats.map((cat: string) => (
                            <div 
                              key={cat}
                              onClick={() => {
                                onChange(areaName, cat);
                                setIsOpen(false);
                              }}
                              className="px-2 py-1 rounded-lg hover:bg-base-dim/40 cursor-pointer text-xs text-text-dim hover:text-text-main text-left font-sans font-light"
                            >
                              ↳ {cat}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
