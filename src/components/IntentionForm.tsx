import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Config, AppTask, HistoryRecord, Intention, IntentionItem, IntentionScale, LinkedItem } from '../types';
import { cn } from '../lib/utils';
import { getCurrentPeriod, findIntentionForPeriod, parseLocalDate } from '../domain/periodUtils';
import { calculateItemProgress } from '../domain/intentionProgress';
import Combobox from './Combobox';
import GanttChart from './GanttChart';

interface IntentionFormProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
  tasks: AppTask[];
  history: HistoryRecord[];
  intentions: Intention[];
  onSave: (intention: Omit<Intention, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Intention>) => void;
  onDelete: (id: string) => void;
  initialScale?: IntentionScale;
  isInline?: boolean;
  
  // Controlled mode props (for PlanificarView)
  scale?: IntentionScale;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  existingIntention?: Intention | null;
}

export default function IntentionForm({
  isOpen,
  onClose,
  config,
  tasks,
  history,
  intentions,
  onSave,
  onUpdate,
  onDelete,
  initialScale = 'phase',
  isInline = false,
  scale: controlledScale,
  periodStart: controlledPeriodStart,
  periodEnd: controlledPeriodEnd,
  periodLabel: controlledPeriodLabel,
  existingIntention: controlledExistingIntention
}: IntentionFormProps) {
  const [internalScale, setInternalScale] = useState<IntentionScale>(initialScale);
  const scale = controlledScale || internalScale;
  const [theme, setTheme] = useState('');
  const [items, setItems] = useState<IntentionItem[]>([]);
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [isCommitmentsExpanded, setIsCommitmentsExpanded] = useState(true);
  const [isGanttExpanded, setIsGanttExpanded] = useState(true);

  useEffect(() => {
    if (existingId && isSavingNew) {
      setIsSavingNew(false);
    }
  }, [existingId, isSavingNew]);

  // Period ranges computed dynamically if not controlled
  const currentPeriod = getCurrentPeriod(scale, config);
  const periodStart = controlledPeriodStart || currentPeriod.start;
  const periodEnd = controlledPeriodEnd || currentPeriod.end;
  const periodLabel = controlledPeriodLabel || currentPeriod.label;

  // Check if period has already passed (readonly mode)
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastPeriod = periodEnd < todayStr;

  // Load existing intention for current period if it exists
  useEffect(() => {
    const existing = controlledExistingIntention !== undefined 
      ? controlledExistingIntention 
      : findIntentionForPeriod(intentions || [], scale, periodStart, periodEnd);
      
    if (existing) {
      setTheme(existing.theme || '');
      setItems(existing.items || []);
      setLinkedItems(existing.linkedItems || []);
      setIsEditing(true);
      setExistingId(existing.id);
    } else {
      setTheme('');
      setItems([]);
      setLinkedItems([]);
      setIsEditing(false);
      setExistingId(null);
    }
  }, [scale, periodStart, periodEnd, intentions, controlledExistingIntention]);

  if (!isOpen) return null;

  const areaNames = Object.keys(config.areas);
  const getAreaCategories = (areaName: string): string[] => {
    const areaVal = config.areas[areaName];
    if (typeof areaVal === 'object' && areaVal !== null) {
      return areaVal.categories || [];
    }
    return [];
  };

  const projects = tasks.filter(t => t.type === 'Proyecto');
  const taskOptions = tasks.filter(t => ['Tarea', 'Hábito', 'Rutina', 'Pulso'].includes(t.type));

  const handleAddItem = () => {
    if (isPastPeriod) return;
    const newItem: IntentionItem = {
      id: `ii_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      targetType: 'hours',
      areaName: areaNames[0] || '',
      targetHours: 1
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (isPastPeriod) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<IntentionItem>) => {
    if (isPastPeriod) return;
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates };

      // Clean up other properties when switching levels/types to avoid state leaking
      if (updates.targetType) {
        if (updates.targetType === 'hours') {
          delete merged.targetDays;
          merged.targetHours = merged.targetHours || 1;
        } else if (updates.targetType === 'consistency') {
          delete merged.targetHours;
          merged.targetDays = merged.targetDays || 1;
        } else {
          // completion
          delete merged.targetHours;
          delete merged.targetDays;
        }
      }

      // If binding level changes, reset target identifiers
      if (updates.areaName !== undefined && updates.areaName !== item.areaName) {
        delete merged.subCategory;
        delete merged.projectId;
        delete merged.taskId;
      }
      return merged;
    }));
  };

  // Auto-save logic
  useEffect(() => {
    if (isPastPeriod) return;
    if (items.length === 0 && !theme) return;

    const timeoutId = setTimeout(() => {
      // Validation silently
      let isValid = true;
      for (const item of items) {
        if (item.targetType === 'hours' && (!item.targetHours || item.targetHours <= 0)) isValid = false;
        if (item.targetType === 'consistency' && (!item.targetDays || item.targetDays <= 0)) isValid = false;
        if (item.targetType === 'completion' && !item.projectId && !item.taskId) isValid = false;
      }
      if (!isValid) return;

      // Clean up orphaned linkedItems (where childItemId is no longer in items)
      const validItemIds = items.map(it => it.id);
      const cleanedLinkedItems = linkedItems.filter(link => validItemIds.includes(link.childItemId));

      const payload = {
        userId: config.userId,
        scale,
        periodStart,
        periodEnd,
        theme: theme.trim() || undefined,
        items,
        linkedItems: cleanedLinkedItems,
        createdAt: new Date().toISOString()
      };

      if (isEditing && existingId) {
        onUpdate(existingId, payload);
      } else {
        if (!isSavingNew) {
          setIsSavingNew(true);
          onSave(payload);
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [theme, items, linkedItems, isPastPeriod, isEditing, existingId, scale, periodStart, periodEnd, config.userId, isSavingNew, onSave, onUpdate]);

  const handleDelete = () => {
    if (existingId) {
      onDelete(existingId);
      setTheme('');
      setItems([]);
      setIsEditing(false);
      setExistingId(null);
      if (!isInline) {
        onClose();
      }
    }
  };

  const parentScale: IntentionScale | null = 
    scale === 'phase' ? 'cycle' :
    scale === 'cycle' ? 'quarter' :
    scale === 'quarter' ? 'year' :
    null;

  const parentIntention = parentScale 
    ? intentions.find(i => 
        i.scale === parentScale && 
        i.periodStart <= periodStart && 
        i.periodEnd >= periodEnd
      )
    : null;

  // Group items by Area for rendering
  const itemsByArea: Record<string, IntentionItem[]> = {};
  items.forEach(item => {
    let area = 'General';
    if (item.areaName) {
      area = item.areaName;
    } else if (item.projectId) {
      const p = tasks.find(t => t.id === item.projectId);
      if (p?.category) area = p.category;
    } else if (item.taskId) {
      const t = tasks.find(t => t.id === item.taskId);
      if (t?.category) area = t.category;
    }
    if (!itemsByArea[area]) itemsByArea[area] = [];
    itemsByArea[area].push(item);
  });

  const content = (
    <div className={cn("bg-base w-full flex flex-col text-text-main", isInline ? "" : "border border-border-line max-w-2xl max-h-[85vh] shadow-xl rounded-none")}>
      {/* Header */}
      <div className={cn("flex justify-between items-center px-6 py-4 border-b border-border-line bg-base-dim/10", isInline && "hidden")}>
        <span className="font-sans text-xs uppercase tracking-widest text-text-dim font-light">Definir Intenciones</span>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-base-dim rounded-full transition-colors cursor-pointer text-text-dim"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scale Buttons - Only show if not inline */}
          {!isInline && (
            <div className="flex justify-center gap-2">
              {(['phase', 'cycle', 'quarter', 'year'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => !controlledScale && setInternalScale(s)}
                  disabled={!!controlledScale}
                  className={cn(
                    "px-4 py-1.5 text-xs font-sans uppercase tracking-widest rounded-full transition-all border",
                    scale === s
                      ? "bg-text-main text-[var(--base-bg)] border-text-main font-light"
                      : "bg-base border-border-line text-text-dim hover:text-text-main",
                    !!controlledScale && scale !== s && "opacity-50 cursor-not-allowed",
                    !controlledScale && "cursor-pointer"
                  )}
                >
                  {s === 'phase' ? 'Fase' : s === 'cycle' ? 'Ciclo' : s === 'quarter' ? 'Cuarto' : 'Año'}
                </button>
              ))}
            </div>
          )}

          {/* Period Label Indicator - Only show if not inline */}
          {!isInline && (
            <div className="bg-base-dim/30 border-y border-border-line/60 py-3 text-center font-sans text-xs uppercase tracking-widest text-text-main font-light">
              {periodLabel}
            </div>
          )}

          {/* Theme text area */}
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light">
              Norte Narrativo / Tema del Período
            </label>
            <textarea
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={isPastPeriod ? "Sin tema para este período." : "¿Cuál es tu foco principal para este período?"}
              disabled={isPastPeriod}
              className="w-full min-h-[70px] px-0 py-2 text-xs bg-transparent text-text-main border-b border-border-line/40 focus:outline-none focus:border-primary resize-y font-sans font-light rounded-none disabled:bg-base-dim/20 disabled:text-text-dim transition-colors"
            />
          </div>

          {/* Commitments list (now for all scales, collapsible) */}
          <div className="space-y-4 pt-4 border-t border-border-line/40">
            <div 
              onClick={() => setIsCommitmentsExpanded(!isCommitmentsExpanded)}
              className="flex justify-between items-center pb-2 cursor-pointer select-none group"
            >
              <div className="flex items-center gap-2">
                {isCommitmentsExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                )}
                <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
                  Compromisos ({items.length})
                </span>
              </div>
              {isCommitmentsExpanded && !isPastPeriod && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddItem();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-widest text-primary font-light hover:text-text-main transition-colors cursor-pointer border-0 bg-transparent p-2 -m-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              )}
            </div>

            {isCommitmentsExpanded && (
              items.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-dim/60 font-light font-sans bg-base-dim/5 border border-dashed border-border-line/40">
                  Ningún compromiso definido. Haz click en Agregar para comenzar.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(itemsByArea).map(area => (
                    <div key={area} className="space-y-3">
                      {/* Area separator header */}
                      <div className="text-[10px] font-sans uppercase tracking-widest text-primary font-light border-b border-border-line/30 pb-1">
                        {area === 'General' ? 'Otros / General' : area}
                      </div>

                      <div className="space-y-3">
                        {itemsByArea[area].map((item) => {
                          // Check if we are binding to area, subcategory, project, or task
                          let bindLevel: 'area' | 'subCategory' | 'project' | 'task' = 'area';
                          if (item.taskId) bindLevel = 'task';
                          else if (item.projectId) bindLevel = 'project';
                          else if (item.subCategory) bindLevel = 'subCategory';

                          return (
                            <div 
                              key={item.id} 
                              className="flex flex-col gap-2 py-4 border-b border-border-line/10 last:border-b-0 relative group/item"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-[110px_110px_1fr_auto_auto] gap-3 md:gap-4 w-full items-center">
                                {/* Selectors Wrapper: inline grid/flex on mobile, display contents on desktop */}
                                <div className="flex flex-wrap sm:grid sm:grid-cols-[110px_110px_1fr] md:contents gap-2 items-center w-full">
                                  {/* Type dropdown */}
                                  <div className="relative flex items-center w-[110px] sm:w-auto">
                                    <select
                                      value={item.targetType}
                                      onChange={(e) => handleUpdateItem(item.id, { targetType: e.target.value as any })}
                                      disabled={isPastPeriod}
                                      className="appearance-none w-full bg-transparent text-text-main text-xs font-mono border-b border-border-line focus:border-primary px-0 py-1.5 focus:outline-none cursor-pointer pr-4 disabled:opacity-70 transition-colors"
                                    >
                                      <option value="hours">Horas</option>
                                      <option value="consistency">Consistencia</option>
                                      <option value="completion">Completación</option>
                                    </select>
                                    <ChevronDown className="absolute right-0 w-3 h-3 text-text-dim pointer-events-none" />
                                  </div>

                                  {/* Bind level selector */}
                                  <div className="relative flex items-center w-[110px] sm:w-auto">
                                    <select
                                      value={bindLevel}
                                      onChange={(e) => {
                                        const lvl = e.target.value;
                                        if (lvl === 'area') {
                                          handleUpdateItem(item.id, { areaName: areaNames[0] || '', subCategory: undefined, projectId: undefined, taskId: undefined });
                                        } else if (lvl === 'subCategory') {
                                          const firstArea = areaNames[0] || '';
                                          const cats = getAreaCategories(firstArea);
                                          handleUpdateItem(item.id, { areaName: firstArea, subCategory: cats[0] || '', projectId: undefined, taskId: undefined });
                                        } else if (lvl === 'project') {
                                          handleUpdateItem(item.id, { areaName: undefined, subCategory: undefined, projectId: projects[0]?.id || '', taskId: undefined });
                                        } else {
                                          handleUpdateItem(item.id, { areaName: undefined, subCategory: undefined, projectId: undefined, taskId: taskOptions[0]?.id || '' });
                                        }
                                      }}
                                      disabled={isPastPeriod}
                                      className="appearance-none w-full bg-transparent text-text-main text-xs font-mono border-b border-border-line focus:border-primary px-0 py-1.5 focus:outline-none cursor-pointer pr-4 disabled:opacity-70 transition-colors"
                                    >
                                      <option value="area">Área</option>
                                      <option value="subCategory">Categoría</option>
                                      <option value="project">Proyecto</option>
                                      <option value="task">Tarea/Hábito</option>
                                    </select>
                                    <ChevronDown className="absolute right-0 w-3 h-3 text-text-dim pointer-events-none" />
                                  </div>

                                  {/* Target selection values */}
                                  <div className="flex items-center gap-2 flex-grow flex-1 min-w-[150px] sm:w-auto">
                                    {bindLevel === 'area' && (
                                      <div className="relative flex-1 flex items-center">
                                        <select
                                          value={item.areaName || ''}
                                          onChange={(e) => handleUpdateItem(item.id, { areaName: e.target.value })}
                                          disabled={isPastPeriod}
                                          className="appearance-none w-full bg-transparent text-text-main text-xs font-mono border-b border-border-line focus:border-primary px-0 py-1.5 focus:outline-none cursor-pointer pr-4 disabled:opacity-70 transition-colors"
                                        >
                                          {areaNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                          ))}
                                        </select>
                                        <ChevronDown className="absolute right-0 w-3 h-3 text-text-dim pointer-events-none" />
                                      </div>
                                    )}

                                    {bindLevel === 'subCategory' && (
                                      <>
                                        <div className="relative flex-1 flex items-center">
                                          <select
                                            value={item.areaName || ''}
                                            onChange={(e) => {
                                              const area = e.target.value;
                                              const cats = getAreaCategories(area);
                                              handleUpdateItem(item.id, { areaName: area, subCategory: cats[0] || '' });
                                            }}
                                            disabled={isPastPeriod}
                                            className="appearance-none w-full bg-transparent text-text-main text-xs font-mono border-b border-border-line focus:border-primary px-0 py-1.5 focus:outline-none cursor-pointer pr-4 disabled:opacity-70 transition-colors"
                                          >
                                            {areaNames.map(name => (
                                              <option key={name} value={name}>{name}</option>
                                            ))}
                                          </select>
                                          <ChevronDown className="absolute right-0 w-3 h-3 text-text-dim pointer-events-none" />
                                        </div>
                                        <div className="relative flex-1 flex items-center">
                                          <select
                                            value={item.subCategory || ''}
                                            onChange={(e) => handleUpdateItem(item.id, { subCategory: e.target.value })}
                                            disabled={isPastPeriod}
                                            className="appearance-none w-full bg-transparent text-text-main text-xs font-mono border-b border-border-line focus:border-primary px-0 py-1.5 focus:outline-none cursor-pointer pr-4 disabled:opacity-70 transition-colors"
                                          >
                                            {getAreaCategories(item.areaName || '').map(cat => (
                                              <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                          </select>
                                          <ChevronDown className="absolute right-0 w-3 h-3 text-text-dim pointer-events-none" />
                                        </div>
                                      </>
                                    )}

                                    {bindLevel === 'project' && (
                                      <div className="relative flex-1 flex items-center w-full min-w-[150px]">
                                        <Combobox
                                          value={item.projectId || ''}
                                          onChange={(val) => handleUpdateItem(item.id, { projectId: val })}
                                          disabled={isPastPeriod}
                                          placeholder={projects.length === 0 ? "No hay proyectos" : "Seleccionar proyecto..."}
                                          options={projects.map(p => ({ value: p.id, label: p.text }))}
                                        />
                                      </div>
                                    )}

                                    {bindLevel === 'task' && (
                                      <div className="relative flex-1 flex items-center w-full min-w-[150px]">
                                        <Combobox
                                          value={item.taskId || ''}
                                          onChange={(val) => handleUpdateItem(item.id, { taskId: val })}
                                          disabled={isPastPeriod}
                                          placeholder={taskOptions.length === 0 ? "No hay tareas" : "Seleccionar tarea..."}
                                          options={taskOptions.map(t => ({ value: t.id, label: `[${t.type}] ${t.text}` }))}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Target Values & Actions Wrapper: flex on mobile, display contents on desktop */}
                                <div className="flex items-center justify-between md:contents w-full gap-2">
                                  {/* Targets input values */}
                                  <div className="flex items-center gap-2 md:justify-end">
                                    {item.targetType === 'hours' && (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="0.5"
                                          step="0.5"
                                          value={item.targetHours || ''}
                                          onChange={(e) => handleUpdateItem(item.id, { targetHours: parseFloat(e.target.value) || 0 })}
                                          disabled={isPastPeriod}
                                          className="w-12 px-0 py-1.5 text-xs bg-transparent text-text-main border-b border-border-line focus:outline-none focus:border-primary text-center disabled:opacity-70 font-mono transition-colors"
                                        />
                                        <span className="font-mono text-[10px] text-text-dim uppercase">hrs</span>
                                      </div>
                                    )}

                                    {item.targetType === 'consistency' && (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          value={item.targetDays || ''}
                                          onChange={(e) => handleUpdateItem(item.id, { targetDays: parseInt(e.target.value, 10) || 0 })}
                                          disabled={isPastPeriod}
                                          className="w-12 px-0 py-1.5 text-xs bg-transparent text-text-main border-b border-border-line focus:outline-none focus:border-primary text-center disabled:opacity-70 font-mono transition-colors"
                                        />
                                        <span className="font-mono text-[10px] text-text-dim uppercase">días</span>
                                      </div>
                                    )}

                                    {item.targetType === 'completion' && (
                                      <span className="font-mono text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded-none border border-primary/25 font-light uppercase animate-none">
                                        Hito
                                      </span>
                                    )}

                                    {/* Progress details shown inline */}
                                    {isEditing && (
                                      <div className="text-[10px] font-mono text-text-dim ml-1">
                                        {(() => {
                                          const progress = calculateItemProgress(item, tasks, history, periodStart, periodEnd, intentions);
                                          if (progress.type === 'hours' && progress.hours) {
                                            return `(${progress.hours.current}/${progress.hours.target}h)`;
                                          }
                                          if (progress.type === 'consistency' && progress.consistency) {
                                            return `(${progress.consistency.current}/${progress.consistency.target}d)`;
                                          }
                                          if (progress.type === 'completion' && progress.completion) {
                                            return progress.completion.completed ? '✓' : '✗';
                                          }
                                          return '';
                                        })()}
                                      </div>
                                    )}
                                  </div>

                                  {/* Trash button */}
                                  {!isPastPeriod ? (
                                    <div className="flex items-center justify-end w-8 md:w-auto">
                                      <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="p-2 -m-2 text-text-dim hover:text-red-500 transition-colors cursor-pointer border-0 bg-transparent"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-8 md:w-auto" />
                                  )}
                                </div>
                              </div>

                              {/* Upper scale linking dropdown */}
                              {parentIntention && (
                                <div className="flex items-center gap-2 pt-2 font-mono text-[9px] w-full text-left">
                                  <span className="text-text-dim uppercase">Vincular a norte superior:</span>
                                  <div className="relative flex items-center">
                                    <select
                                      value={linkedItems.find(l => l.childItemId === item.id)?.parentItemId || ''}
                                      onChange={(e) => {
                                        const pItemId = e.target.value;
                                        if (pItemId) {
                                          const exists = linkedItems.some(l => l.childItemId === item.id);
                                          if (exists) {
                                            setLinkedItems(linkedItems.map(l => 
                                              l.childItemId === item.id ? { ...l, parentItemId: pItemId } : l
                                            ));
                                          } else {
                                            setLinkedItems([...linkedItems, {
                                              parentItemId: pItemId,
                                              childIntentionId: existingId || '',
                                              childItemId: item.id
                                            }]);
                                          }
                                        } else {
                                          setLinkedItems(linkedItems.filter(l => l.childItemId !== item.id));
                                        }
                                      }}
                                      disabled={isPastPeriod}
                                      className="appearance-none bg-transparent text-text-main text-[9px] font-mono border-b border-border-line px-0 py-0.5 focus:outline-none focus:border-primary cursor-pointer pr-4 max-w-[250px] truncate transition-colors"
                                    >
                                      <option value="">Ninguno</option>
                                      {parentIntention.items.map(parentIt => {
                                        let label = `[${parentIt.targetType === 'hours' ? 'hrs' : parentIt.targetType === 'consistency' ? 'días' : 'hito'}] `;
                                        if (parentIt.projectId) {
                                          label += tasks.find(t => t.id === parentIt.projectId)?.text || 'Proyecto';
                                        } else if (parentIt.taskId) {
                                          label += tasks.find(t => t.id === parentIt.taskId)?.text || 'Tarea';
                                        } else if (parentIt.subCategory) {
                                          label += `${parentIt.areaName} ➔ ${parentIt.subCategory}`;
                                        } else if (parentIt.areaName) {
                                          label += parentIt.areaName;
                                        }
                                        return (
                                          <option key={parentIt.id} value={parentIt.id}>{label}</option>
                                        );
                                      })}
                                    </select>
                                    <ChevronDown className="absolute right-0 w-2.5 h-2.5 text-text-dim pointer-events-none" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Gantt Chart (only for quarter and year, collapsible) */}
          {(scale === 'quarter' || scale === 'year') && (
            <div className="space-y-4 pt-4 border-t border-border-line/40">
              <div 
                onClick={() => setIsGanttExpanded(!isGanttExpanded)}
                className="flex items-center gap-2 pb-2 cursor-pointer select-none group"
              >
                {isGanttExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-dim group-hover:text-text-main transition-colors" />
                )}
                <span className="font-sans text-[10px] uppercase tracking-widest text-text-dim font-light group-hover:text-text-main transition-colors">
                  Línea de Tiempo (Gantt)
                </span>
              </div>
              {isGanttExpanded && (
                <div className="border border-border-line/40 bg-base">
                  <GanttChart 
                    config={config} 
                    tasks={tasks} 
                    onUpdateTask={(id, updates) => {
                      console.log("Task updated from Gantt:", id, updates);
                    }} 
                    scale={scale as 'phase'|'cycle'|'quarter'|'year'} 
                    periodStart={periodStart} 
                    periodEnd={periodEnd} 
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-border-line bg-base-dim/10">
          <div>
            {!isPastPeriod && isEditing && (
              <button
                onClick={handleDelete}
                className="p-2 -ml-2 text-xs font-sans uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
              >
                Eliminar
              </button>
            )}
          </div>

          <div className="flex gap-4 items-center">
            <span className="text-[10px] font-mono text-text-dim flex items-center opacity-70">
              ✓ Guardado automático
            </span>
            {!isInline && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider text-text-dim border border-border-line rounded-full hover:text-text-main hover:bg-base-dim/20 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {content}
    </div>
  );
}
