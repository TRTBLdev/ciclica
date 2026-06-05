import React, { useState, useMemo, useEffect } from 'react';
import { Layers, ChevronDown, ChevronUp, ChevronRight, CheckCircle, Folder, Plus, X, Edit2, Trash2, Save } from 'lucide-react';
import { AppTask, Config, HistoryRecord } from '../types';
import TaskItem from './TaskItem';
import GanttChart from './GanttChart';
import { cn, getAreaColorClasses, getAreaProgressClasses, getAreaTextClasses } from '../lib/utils';

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
  const [newProjForm, setNewProjForm] = useState({ text: '', category: '', subCategory: '', parentId: '' });
  
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editProjForm, setEditProjForm] = useState({ text: '', category: '', subCategory: '', parentId: '' });

  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [expandedProjs, setExpandedProjs] = useState<string[]>([]);
  const [showGantt, setShowGantt] = useState(false);
  const [sortBy, setSortBy] = useState<'manual' | 'priority' | 'date' | 'name' | 'progress'>('manual');

  const sortTasks = (taskList: AppTask[], criterion: string) => {
    return [...taskList].sort((a, b) => {
      if (criterion === 'manual') {
        const aOrder = a.order !== undefined ? a.order : 100000;
        const bOrder = b.order !== undefined ? b.order : 100000;
        if (a.order !== undefined || b.order !== undefined) {
          return aOrder - bOrder;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (criterion === 'priority') {
        const pVal = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        const aVal = pVal[a.priority || 'Baja'] || 1;
        const bVal = pVal[b.priority || 'Baja'] || 1;
        return bVal - aVal;
      }
      if (criterion === 'name') {
        return a.text.localeCompare(b.text);
      }
      if (criterion === 'date') {
        const aTime = a.fechaPlanificada ? new Date(a.fechaPlanificada).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.fechaPlanificada ? new Date(b.fechaPlanificada).getTime() : new Date(b.createdAt).getTime();
        return aTime - bTime;
      }
      if (criterion === 'progress') {
        const getProgress = (t: AppTask) => {
          if (t.type === 'Proyecto') {
            const subs = tasks.filter(s => s.parentId === t.id);
            return subs.length ? (subs.filter(s => s.completed).length / subs.length) : (t.completed ? 1 : 0);
          }
          return t.completed ? 1 : 0;
        };
        return getProgress(b) - getProgress(a);
      }
      return 0;
    });
  };

  // Drag and drop states for tasks under projects
  const [subDraggedId, setSubDraggedId] = useState<string | null>(null);
  const [subDraggedOverId, setSubDraggedOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setSubDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== subDraggedOverId) {
      setSubDraggedOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, parentId: string) => {
    e.preventDefault();
    const sourceId = subDraggedId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setSubDraggedId(null);
      setSubDraggedOverId(null);
      return;
    }

    const siblings = tasks.filter(t => t.parentId === parentId);
    const sortedSiblings = [...siblings].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const itemsWithOrders = sortedSiblings.map((t, idx) => ({
      ...t,
      order: t.order !== undefined ? t.order : (idx + 1) * 1000
    }));

    const sourceIndex = itemsWithOrders.findIndex(item => item.id === sourceId);
    const targetIndex = itemsWithOrders.findIndex(item => item.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedList = [...itemsWithOrders];
    const [draggedItem] = reorderedList.splice(sourceIndex, 1);
    reorderedList.splice(targetIndex, 0, draggedItem);

    const newIndex = targetIndex;
    let newOrder = 1000;

    if (newIndex === 0) {
      newOrder = reorderedList[1].order - 1000;
    } else if (newIndex === reorderedList.length - 1) {
      newOrder = reorderedList[reorderedList.length - 2].order + 1000;
    } else {
      const prevOrder = reorderedList[newIndex - 1].order;
      const nextOrder = reorderedList[newIndex + 1].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    onUpdateTask(sourceId, { order: newOrder });

    setSubDraggedId(null);
    setSubDraggedOverId(null);
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
               {editProjForm.category && tasks.some(t => t.type === 'Meta' && t.category === editProjForm.category) && (
                 <div className="relative flex items-center pr-6 bg-base rounded-full border border-border-line px-4 py-2 w-full md:w-60">
                   <select
                     value={editProjForm.parentId}
                     onChange={e => setEditProjForm({...editProjForm, parentId: e.target.value})}
                     className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0 w-full"
                   >
                     <option value="">Sin Meta Asociada</option>
                     {tasks.filter(t => t.type === 'Meta' && t.category === editProjForm.category).map(m => (
                       <option key={m.id} value={m.id}>🎯 {m.text}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-text-main pointer-events-none" />
                 </div>
               )}
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

    return (
      <div key={proj.id} id={`task-item-${proj.id}`} className={cn("relative p-4 transition-all group border-b last:border-b-0 border-border-line/40", proj.completed && "grayscale")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 pb-1 gap-3 text-left">
          <div className="flex items-center gap-3">
            <button onClick={() => onToggleTask(proj)} className="focus:outline-none hover:scale-105 transition-transform bg-transparent border-0 cursor-pointer">
               {proj.completed ? <CheckCircle className="text-text-main opacity-40 w-5 h-5" /> : <Folder className={cn("w-5 h-5", getAreaTextClasses(pColor))} />}
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn("text-base font-medium text-text-main", proj.completed ? "line-through opacity-60 font-light" : "")}>
                  {proj.text}
                </h3>
                <div className="flex gap-1.5 ml-1">
                  <span className={cn("text-[9px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full", getAreaColorClasses(pColor))}>
                    {proj.category}
                  </span>
                  {proj.subCategory && (
                    <span className={cn("text-[9px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full bg-transparent opacity-85", getAreaColorClasses(pColor))}>
                      {proj.subCategory}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-text-dim font-mono uppercase tracking-wider mt-1.5">
                {proj.priority} • {subtasks.length} Tareas 
                {projDuration > 0 && <span className="ml-1.5 font-bold">• ⏱ {projDuration.toFixed(1)}h</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
            <div className="text-right flex flex-col items-end flex-grow md:flex-grow-0">
              <span className="text-[10px] font-mono font-bold text-text-dim">{progress}%</span>
              <div className="w-full md:w-28 h-[2px] bg-[var(--color-border-line)]/50 rounded-full mt-1.5 overflow-hidden">
                <div className={cn("h-full transition-all", getAreaProgressClasses(pColor))} style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            
            <div className="flex gap-1">
              <button 
                title={isExpanded ? "Ocultar Tareas" : "Ver Tareas"} 
                onClick={() => toggleProject(proj.id)} 
                className="p-1.5 text-text-dim hover:text-text-main transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0"
              >
                 {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button title="Editar Proyecto" onClick={() => startEdit(proj)} className="p-1.5 text-text-dim hover:text-text-main transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0">
                 <Edit2 className="w-4 h-4" />
              </button>
              <button title="Eliminar Proyecto" onClick={() => onDeleteTask(proj.id)} className="p-1.5 text-text-dim hover:text-red-500 transition-colors md:opacity-0 group-hover:opacity-100 opacity-100 cursor-pointer bg-transparent border-0">
                 <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="relative pl-2 flex flex-col gap-2 mt-4 animate-in fade-in duration-200">
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
                onDragStart={sortBy === 'manual' ? handleDragStart : undefined}
                onDragOver={sortBy === 'manual' ? handleDragOver : undefined}
                onDrop={sortBy === 'manual' ? (e) => handleDrop(e, sub.id, proj.id) : undefined}
                draggedOverId={sortBy === 'manual' ? subDraggedOverId : undefined}
              />
            ))}

            {addingTaskId === proj.id ? (
              <form onSubmit={e => handleInlineAddTask(e, proj)} className="flex items-center gap-4 mt-3 ml-8 text-left">
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
                className="mt-3 ml-8 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-dim hover:text-text-main hover:underline transition-colors py-2 cursor-pointer bg-transparent border-0 outline-none"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir Tarea
              </button>
            )}
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
    <div className="flex flex-col gap-6 pt-10 pb-16 px-6 md:px-10 max-w-4xl mx-auto w-full">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-line pb-6 gap-4 text-left">
        <h2 className="text-title flex items-center gap-3">
          <Layers className="w-6 h-6 stroke-[2]" /> Proyectos Operativos
        </h2>
        
        <div className="flex items-center gap-6">
          <div className="relative border-b border-transparent hover:border-[#a2b29f] transition-colors pb-1 flex items-center pr-6 bg-base">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)} 
              className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0"
            >
              <option value="Todas">Todas</option>
              {Object.keys(config?.areas || {}).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
          </div>

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
              <option value="progress">Progreso</option>
            </select>
            <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-text-main pointer-events-none" />
          </div>
          
          <button 
            onClick={() => setShowGantt(!showGantt)} 
            className="text-text-main text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:underline cursor-pointer bg-transparent border-0 outline-none"
          >
            {showGantt ? '✕ ocultar cronograma' : '📅 ver cronograma'}
          </button>
          
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)} 
              className="text-text-main text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 hover:underline cursor-pointer bg-transparent border-0 outline-none"
            >
              + Nuevo Proyecto
            </button>
          )}
        </div>
      </div>

      {showGantt && (
        <div className="w-full mb-6">
          <GanttChart config={config} tasks={filteredTasksForGantt} onUpdateTask={onUpdateTask} />
        </div>
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
            {newProjForm.category && tasks.some(t => t.type === 'Meta' && t.category === newProjForm.category) && (
              <div className="relative flex items-center pr-6 bg-base rounded-full border border-border-line px-4 py-2 w-full sm:w-60">
                <select
                  value={newProjForm.parentId}
                  onChange={e => setNewProjForm({...newProjForm, parentId: e.target.value})}
                  className="appearance-none bg-transparent text-text-main text-xs font-mono uppercase tracking-wider focus:outline-none cursor-pointer pr-4 bg-base border-0 w-full"
                >
                  <option value="">Sin Meta Asociada</option>
                  {tasks.filter(t => t.type === 'Meta' && t.category === newProjForm.category).map(m => (
                    <option key={m.id} value={m.id}>🎯 {m.text}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-text-main pointer-events-none" />
              </div>
            )}
            <button type="submit" disabled={!newProjForm.text.trim() || !newProjForm.category} className="text-xs font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer disabled:opacity-40 sm:ml-4 bg-transparent border-0 outline-none">
              Crear
            </button>
          </div>
        </form>
      )}

      {/* Activos list */}
      <div className="mb-6">
        <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 text-left">Activos</h3>
        <div className="border-t border-border-line/40 flex flex-col">
          {activeProjs.length ? renderProjBlock(activeProjs) : <p className="text-xs text-text-dim p-6 text-left font-mono italic">No hay proyectos activos.</p>}
        </div>
      </div>

      {/* Tareas Simples list */}
      <div className="mb-6">
        <h3 className="text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 text-left">Tareas Simples</h3>
        <div className="border-t border-border-line/40 flex flex-col">
          {activeStandaloneTasks.length ? (
            activeStandaloneTasks.map(t => (
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
              />
            ))
          ) : (
            <p className="text-xs text-text-dim p-6 text-left font-mono italic">No hay tareas simples activas.</p>
          )}
        </div>
      </div>

      {/* Completados list */}
      <div className="border-t border-border-line pt-6">
        <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-primary uppercase mb-4 hover:text-text-main transition-colors focus:outline-none w-full text-left bg-transparent border-0 cursor-pointer">
          <span className={cn("transition-transform duration-200 inline-block", !showCompleted && "-rotate-90")}>
            <ChevronDown className="w-4 h-4" />
          </span>
          Completados
        </button>
        {showCompleted && (
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="text-[10px] font-mono font-semibold tracking-wider text-text-dim uppercase mb-2 text-left">Proyectos Completados</h4>
              <div className="border-t border-border-line/40 flex flex-col">
                {compProjs.length ? renderProjBlock(compProjs) : <p className="text-xs text-text-dim p-4 text-left font-mono italic">No hay proyectos completados.</p>}
              </div>
            </div>
            {completedStandaloneTasks.length > 0 && (
              <div>
                <h4 className="text-[10px] font-mono font-semibold tracking-wider text-text-dim uppercase mb-2 text-left">Tareas Simples Completadas</h4>
                <div className="border-t border-border-line/40 flex flex-col">
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
                    />
                  ))}
                </div>
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
