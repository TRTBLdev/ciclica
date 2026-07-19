import React, { useState } from 'react';
import { Separator } from '../types';
import { APP_COLORS, cn } from '../lib/utils';

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' }
];

interface Props {
  initialValue?: Separator;
  onSave: (separator: Separator) => void;
  onCancel?: () => void;
}

export default function SeparatorForm({ initialValue, onSave, onCancel }: Props) {
  const [hour, setHour] = useState(initialValue?.hora || '08:00');
  const [name, setName] = useState(initialValue?.text || '');
  const [detail, setDetail] = useState(initialValue?.detalle || '');
  const [color, setColor] = useState(initialValue?.color || '');
  const [weekdays, setWeekdays] = useState<number[]>(initialValue?.weekdays || []);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hour || !name.trim()) return;
    onSave({ hora: hour, text: name.trim(), detalle: detail.trim(), color: color || undefined, weekdays: weekdays.length ? weekdays : undefined });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4 bg-base-dim/10 border border-border-line/60 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-text-dim">
          Hora
          <input required type="time" value={hour} onChange={event => setHour(event.target.value)} className="px-3 py-2 text-xs bg-base text-text-main border border-border-line" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-text-dim">
          Nombre
          <input required value={name} onChange={event => setName(event.target.value)} placeholder="Mañana" className="px-3 py-2 text-xs bg-base text-text-main border border-border-line" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[10px] font-mono uppercase text-text-dim">
        Detalle
        <input value={detail} onChange={event => setDetail(event.target.value)} placeholder="Foco e inicio" className="px-3 py-2 text-xs bg-base text-text-main border border-border-line" />
      </label>
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-[10px] font-mono uppercase text-text-dim mb-2">Color</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setColor('')} className={cn('h-7 px-2 border text-[10px] cursor-pointer bg-transparent', !color ? 'border-text-main text-text-main' : 'border-border-line text-text-dim')}>Sin color</button>
          {APP_COLORS.map(option => (
            <button key={option} type="button" aria-label={option} onClick={() => setColor(option)} className={cn('w-7 h-7 border-2 cursor-pointer', `bg-${option}-500`, color === option ? 'border-text-main' : 'border-transparent')} />
          ))}
        </div>
      </fieldset>
      <fieldset className="border-0 p-0 m-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <legend className="text-[10px] font-mono uppercase text-text-dim">Días visibles</legend>
          <button type="button" onClick={() => setWeekdays([])} className={cn('text-[10px] font-mono uppercase cursor-pointer border-0 bg-transparent', weekdays.length === 0 ? 'text-text-main underline' : 'text-text-dim')}>Todos</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const selected = weekdays.includes(day.value);
            return <button key={day.value} type="button" onClick={() => setWeekdays(prev => selected ? prev.filter(value => value !== day.value) : [...prev, day.value].sort())} className={cn('px-3 py-1.5 rounded-full border text-[10px] cursor-pointer', selected ? 'bg-text-main text-base border-text-main' : 'bg-transparent text-text-dim border-border-line')}>{day.label}</button>;
          })}
        </div>
        <p className="mt-2 text-[10px] text-text-dim">{weekdays.length ? DAYS.filter(day => weekdays.includes(day.value)).map(day => day.label).join(' · ') : 'Todos los días'}</p>
      </fieldset>
      <div className="flex items-center gap-4">
        <button type="submit" className="px-4 py-2 text-[10px] font-mono font-bold uppercase border border-text-main text-text-main bg-transparent cursor-pointer">Guardar</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-[10px] font-mono uppercase text-text-dim bg-transparent border-0 cursor-pointer">Cancelar</button>}
      </div>
    </form>
  );
}
