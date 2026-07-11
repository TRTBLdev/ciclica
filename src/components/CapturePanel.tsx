import React, { useState } from 'react';
import { X, ChevronDown, Plus } from 'lucide-react';
import { Config, AppTask, TaskType } from '../types';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: Config | null;
  tasks: AppTask[];
  onAddTask: (task: Omit<AppTask, 'id'>) => void;
}

export default function CapturePanel({ isOpen, onClose, config, tasks, onAddTask }: Props) {
  const [qcText, setQcText] = useState('');
  const [qcType, setQcType] = useState<'Tarea' | 'Hábito' | 'Contador' | 'Proyecto' | 'Rutina'>('Tarea');
  const [qcPriority, setQcPriority] = useState('Baja');
  const [qcFrecuencia, setQcFrecuencia] = useState(1);
  const [qcFrecuenciaUnidad, setQcFrecuenciaUnidad] = useState('días');
  const [qcTargetCount, setQcTargetCount] = useState(1);
  const [qcUnitLabel, setQcUnitLabel] = useState('veces');
  const [qcPolaridad, setQcPolaridad] = useState('Reforzar');
  const [qcAllocation, setQcAllocation] = useState<'fixed' | 'growth' | 'mixed'>('growth');
  const [qcDate, setQcDate] = useState(new Date().toISOString().split('T')[0]);
  const [qcHora, setQcHora] = useState('');
  const [qcView, setQcView] = useState('Hoy');
  const [qcDest, setQcDest] = useState('');
  const [qcSubCat, setQcSubCat] = useState('');

  const activeProjects = tasks.filter(t => t.type === 'Proyecto' && !t.completed);
  const activeRoutines = tasks.filter(t => t.type === 'Rutina' && !t.completed);

  const handleTypeChange = (val: typeof qcType) => {
    setQcType(val);
    if (val === 'Tarea') {
      setQcAllocation('growth');
      setQcPriority('Baja');
    } else if (val === 'Hábito') {
      setQcAllocation('fixed');
      setQcFrecuencia(1);
      setQcFrecuenciaUnidad('días');
    } else if (val === 'Contador') {
      setQcAllocation('fixed');
      setQcTargetCount(1);
      setQcUnitLabel('veces');
      setQcPolaridad('Reforzar');
    } else if (val === 'Rutina' || val === 'Proyecto') {
      setQcAllocation('growth');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcText.trim()) return;

    const newTask: Omit<AppTask, 'id'> = {
      userId: 'placeholder',
      text: qcText.trim(),
      type: (qcType === 'Contador' ? 'Pulso' : qcType) as TaskType,
      createdAt: new Date().toISOString(),
      fechaPlanificada: new Date(qcDate).toISOString(),
      priority: qcPriority,
      completed: false,
      view: qcView,
      hora: qcHora || undefined,
      allocationType: qcAllocation
    };

    if (qcType === 'Hábito' || qcType === 'Rutina') {
      newTask.frecuencia = qcFrecuencia;
      newTask.frecuenciaUnidad = qcFrecuenciaUnidad as any;
    }

    if (qcType === 'Contador') {
      newTask.currentCount = 0;
      newTask.targetCount = qcTargetCount;
      newTask.unitLabel = qcUnitLabel || 'veces';
      newTask.polaridad = qcPolaridad as any;
    }

    if (qcDest.startsWith('proj:')) {
      const pId = qcDest.replace('proj:', '');
      newTask.parentId = pId;
      const proj = tasks.find(t => t.id === pId);
      if (proj) {
        newTask.category = proj.category || '';
        newTask.subCategory = proj.subCategory || '';
      }
    } else if (qcDest.startsWith('rutina:')) {
      newTask.parentId = qcDest.replace('rutina:', '');
    } else if (qcDest.startsWith('area:')) {
      newTask.category = qcDest.replace('area:', '');
      if (qcSubCat) {
        newTask.subCategory = qcSubCat;
      }
    }

    onAddTask(newTask);
    
    // Reset Form
    setQcText('');
    setQcSubCat('');
    setQcHora('');
    onClose();
  };

  return (
    <div
      className={cn(
        "absolute left-0 z-40 bg-base transition-all duration-300 w-full md:w-1/2 flex flex-col overflow-hidden text-left",
        "bottom-[50px] md:bottom-auto md:top-0",
        "h-[70vh] md:h-[50dvh]",
        "border-t md:border-t-0 border-b-0 md:border-b border-border-line md:border-r",
        isOpen 
          ? "translate-y-0 opacity-100 md:translate-x-0" 
          : "translate-y-full opacity-0 md:translate-y-0 md:-translate-x-full md:opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border-line/60">
        <span className="text-[10px] font-mono uppercase text-text-dim tracking-widest font-bold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-text-dim" /> Captura Rápida
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text-main p-1 hover:bg-base-dim/40 rounded-full transition-colors cursor-pointer bg-transparent border-0 outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4">
        
        {/* Main Input Text */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Nombre del elemento</label>
          <input
            type="text"
            required
            placeholder={
              qcType === 'Tarea' 
                ? "¿Qué hay que hacer hoy?" 
                : qcType === 'Hábito' 
                  ? "Nombre del hábito..." 
                  : qcType === 'Contador' 
                    ? "Nombre del pulso/ritmo..." 
                    : `Nombre del ${qcType.toLowerCase()}...`
            }
            className="w-full h-10 px-3 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f] transition-all placeholder:text-text-dim/40"
            value={qcText}
            onChange={e => setQcText(e.target.value)}
          />
        </div>

        {/* 2-Column Selectors Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tipo de Elemento */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Tipo</label>
            <div className="relative flex items-center">
              <select
                className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                value={qcType}
                onChange={e => handleTypeChange(e.target.value as any)}
              >
                <option value="Tarea">✏️ Tarea</option>
                <option value="Hábito">🔄 Hábito</option>
                <option value="Contador">📈 Pulso</option>
                <option value="Proyecto">🎯 Proyecto</option>
                <option value="Rutina">🔁 Rutina</option>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* Asignación Energética */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Asignación</label>
            <div className="relative flex items-center">
              <select
                className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer font-sans"
                value={qcAllocation}
                onChange={e => setQcAllocation(e.target.value as any)}
              >
                <option value="growth">⚡ Inversión</option>
                <option value="fixed">🛡️ Soporte</option>
                <option value="mixed">☯️ Mixto</option>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* TAREA: Prioridad */}
          {qcType === 'Tarea' && (
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Prioridad</label>
              <div className="relative flex items-center">
                <select
                  className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                  value={qcPriority}
                  onChange={e => setQcPriority(e.target.value)}
                >
                  <option value="Baja">🟢 Baja</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Alta">🔥 Alta</option>
                </select>
                <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
              </div>
            </div>
          )}

          {/* HÁBITO: Frecuencia */}
          {qcType === 'Hábito' && (
            <div className="flex gap-2 col-span-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Frecuencia</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f]"
                  value={qcFrecuencia}
                  onChange={e => setQcFrecuencia(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Unidad</label>
                <div className="relative flex items-center">
                  <select
                    className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                    value={qcFrecuenciaUnidad}
                    onChange={e => setQcFrecuenciaUnidad(e.target.value)}
                  >
                    <option value="días">días</option>
                    <option value="semanas">semanas</option>
                    <option value="meses">meses</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* PULSO (Contador) */}
          {qcType === 'Contador' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Meta</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f]"
                  value={qcTargetCount}
                  onChange={e => setQcTargetCount(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Unidad</label>
                <input
                  type="text"
                  placeholder="veces"
                  className="w-full px-3 py-2 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f]"
                  value={qcUnitLabel}
                  onChange={e => setQcUnitLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Polaridad</label>
                <div className="relative flex items-center">
                  <select
                    className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                    value={qcPolaridad}
                    onChange={e => setQcPolaridad(e.target.value)}
                  >
                    <option value="Reforzar">📈 Reforzar hábito</option>
                    <option value="Abandonar">📉 Abandonar hábito</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Destino (Proyecto / Área / Rutina) */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Proyecto / Área / Rutina</label>
            <div className="relative flex items-center">
              <select
                className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                value={qcDest}
                onChange={e => { setQcDest(e.target.value); setQcSubCat(''); }}
              >
                <option value="">Ninguno</option>
                <optgroup label="Proyectos">
                  {activeProjects.map(p => (
                    <option key={p.id} value={`proj:${p.id}`}>{p.text}</option>
                  ))}
                </optgroup>
                <optgroup label="Rutinas">
                  {activeRoutines.map(r => (
                    <option key={r.id} value={`rutina:${r.id}`}>{r.text}</option>
                  ))}
                </optgroup>
                <optgroup label="Áreas">
                  {Object.keys(config?.areas || {}).map(a => (
                    <option key={a} value={`area:${a}`}>{a}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* Subcategoría de Área */}
          {qcDest.startsWith('area:') && config?.areas?.[qcDest.replace('area:', '')] && typeof config.areas[qcDest.replace('area:', '')] === 'object' && ((config.areas[qcDest.replace('area:', '')] as any).categories?.length > 0) && (
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Subcategoría</label>
              <div className="relative flex items-center">
                <select
                  className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                  value={qcSubCat}
                  onChange={e => setQcSubCat(e.target.value)}
                >
                  <option value="">Ninguna...</option>
                  {(config.areas[qcDest.replace('area:', '')] as any).categories.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
              </div>
            </div>
          )}

          {/* Ubicación de Vista */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Vista</label>
            <div className="relative flex items-center">
              <select
                className="w-full appearance-none bg-base-dim/20 border border-border-line text-text-main text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#a2b29f] cursor-pointer"
                value={qcView}
                onChange={e => setQcView(e.target.value)}
              >
                <option value="Hoy">☀️ Hoy</option>
                <option value="Backlog">📥 Backlog</option>
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-text-dim pointer-events-none" />
            </div>
          </div>

          {/* Fecha Planificada */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Fecha Planificada</label>
            <input
              type="date"
              className="w-full px-3 py-1.5 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f] font-sans"
              value={qcDate}
              onChange={e => setQcDate(e.target.value)}
            />
          </div>

          {/* Hora Planificada */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[9px] uppercase tracking-wider text-text-dim font-mono">Hora (Opcional)</label>
            <input
              type="time"
              className="w-full px-3 py-1.5 text-xs bg-base-dim/20 text-text-main border border-border-line rounded-lg focus:outline-none focus:border-[#a2b29f] font-sans"
              value={qcHora}
              onChange={e => setQcHora(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-text-main text-base font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-text-main/90 transition-colors cursor-pointer outline-none border-none mt-2"
        >
          Crear Elemento
        </button>
      </form>
    </div>
  );
}
