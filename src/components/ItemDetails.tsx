import React from 'react';
import { ChecklistItem } from '../types';
import { cn } from '../lib/utils';
import LinkedText from './ui/LinkedText';

interface Props {
  notes?: string;
  checklist?: ChecklistItem[];
  onToggleChecklistItem?: (itemId: string) => void;
  onUpdateNotes?: (notes: string) => void;
}

function ChecklistMark({ done }: { done: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      {done && (
        <path
          d="m6.8 10.1 2.05 2.05 4.4-4.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function ItemDetails({
  notes,
  checklist = [],
  onToggleChecklistItem,
  onUpdateNotes,
}: Props) {
  const detailsId = React.useId();
  const notesId = `${detailsId}-notes`;
  const checklistId = `${detailsId}-checklist`;
  const hasNotes = !!notes?.trim();
  const hasChecklist = checklist.length > 0;

  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [editedNotes, setEditedNotes] = React.useState(notes || '');

  React.useEffect(() => {
    setEditedNotes(notes || '');
  }, [notes]);

  if (!hasNotes && !hasChecklist) return null;

  const completedItems = checklist.filter(item => item.done).length;
  const progress = hasChecklist
    ? Math.round((completedItems / checklist.length) * 100)
    : 0;

  return (
    <section className="mb-1 text-left text-xs text-text-main" aria-label="Detalles del ítem">
      {hasNotes && (
        <section className="py-3" aria-labelledby={notesId}>
          <header className="mb-1.5 flex items-center justify-between">
            <h4 id={notesId} className="font-mono text-[9px] font-bold uppercase tracking-widest text-text-dim">
              Notas
            </h4>
            {onUpdateNotes && !isEditingNotes && (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="text-[9px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0"
              >
                Editar
              </button>
            )}
          </header>
          {isEditingNotes ? (
            <div className="flex flex-col gap-2 animate-in fade-in duration-150">
              <textarea
                autoFocus
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
                rows={3}
                className="w-full resize-y border-0 border-b border-border-line bg-transparent px-0 py-1.5 text-xs font-sans font-light leading-relaxed text-text-main outline-none focus:border-text-main"
                placeholder="Escribe notas o contexto..."
              />
              <div className="flex justify-end gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    setEditedNotes(notes || '');
                    setIsEditingNotes(false);
                  }}
                  className="text-[9px] font-mono uppercase tracking-wider text-text-dim hover:text-text-main cursor-pointer bg-transparent border-0"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateNotes?.(editedNotes);
                    setIsEditingNotes(false);
                  }}
                  className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold hover:underline cursor-pointer bg-transparent border-0"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <p
              onClick={onUpdateNotes ? () => setIsEditingNotes(true) : undefined}
              className={cn(
                "whitespace-pre-wrap font-sans font-light leading-relaxed",
                onUpdateNotes && "cursor-pointer hover:opacity-85"
              )}
            >
              <LinkedText text={notes} />
            </p>
          )}
        </section>
      )}

      {hasChecklist && (
        <section
          className={cn('py-3', hasNotes && 'border-t border-border-line/50')}
          aria-labelledby={checklistId}
        >
          <header className="mb-2.5 flex items-center justify-between gap-3">
            <h4 id={checklistId} className="font-mono text-[9px] font-bold uppercase tracking-widest text-text-dim">
              Guía de pasos (Checklist)
            </h4>
            <output className="font-mono text-[10px] text-text-dim" aria-label={`${progress}% completado`}>
              {progress}%
            </output>
          </header>

          <progress
            max={100}
            value={progress}
            aria-label={`Checklist: ${completedItems} de ${checklist.length} pasos completados`}
            className="mb-2.5 block h-0.5 w-full appearance-none overflow-hidden accent-emerald-600 [&::-webkit-progress-bar]:bg-border-line/40 [&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600"
          />

          <ul className="m-0 list-none space-y-2 p-0">
            {checklist.map(item => (
              <li key={item.id} className="flex select-none items-start gap-2.5 py-0.5">
                <button
                  type="button"
                  onClick={() => onToggleChecklistItem?.(item.id)}
                  disabled={!onToggleChecklistItem}
                  aria-pressed={item.done}
                  aria-label={`${item.done ? 'Marcar pendiente' : 'Marcar completado'}: ${item.text}`}
                  className={cn(
                    'flex shrink-0 items-center justify-center border-0 bg-transparent p-0 text-text-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-dim',
                    onToggleChecklistItem && 'cursor-pointer hover:text-accent',
                    item.done && 'text-emerald-600 dark:text-emerald-500',
                  )}
                >
                  <ChecklistMark done={item.done} />
                </button>
                <p className={cn('font-light leading-relaxed', item.done && 'line-through opacity-50')}>
                  <LinkedText text={item.text} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
