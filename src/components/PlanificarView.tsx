import React from 'react';
import { Config, AppTask, HistoryRecord, Intention, IntentionScale } from '../types';
import IntentionForm from './IntentionForm';

interface Props {
  scale: IntentionScale;
  intentions: Intention[];
  tasks: AppTask[];
  history: HistoryRecord[];
  config: Config | null;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  onAddIntention: (intention: Omit<Intention, 'id'>) => void;
  onUpdateIntention: (id: string, updates: Partial<Intention>) => void;
  onDeleteIntention: (id: string) => void;
}

export default function PlanificarView({
  scale,
  intentions,
  tasks,
  history,
  config,
  periodStart,
  periodEnd,
  periodLabel,
  onAddIntention,
  onUpdateIntention,
  onDeleteIntention
}: Props) {
  const existingIntention = intentions.find(i => 
    i.scale === scale && i.periodStart === periodStart && i.periodEnd === periodEnd
  );

  if (!config) return null;

  return (
    <div className="w-full">
      <IntentionForm
        isOpen={true}
        isInline={true}
        onClose={() => {}}
        scale={scale}
        existingIntention={existingIntention}
        config={config}
        tasks={tasks}
        history={history}
        intentions={intentions}
        periodStart={periodStart}
        periodEnd={periodEnd}
        periodLabel={periodLabel}
        onSave={(data) => {
          if (existingIntention) {
            onUpdateIntention(existingIntention.id, data);
          } else {
            onAddIntention(data);
          }
        }}
        onUpdate={onUpdateIntention}
        onDelete={onDeleteIntention}
      />
    </div>
  );
}
