import React from 'react';
import { Config, AppTask, HistoryRecord, Intention, IntentionScale } from '../types';
import IntentionForm from './IntentionForm';
import RoadmapPlanner from './RoadmapPlanner';
import CyclePlanner from './CyclePlanner';

interface Props {
  scale: IntentionScale | 'phase';
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
  onUpdateTask: (id: string, updates: Partial<AppTask>) => void;
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
  onDeleteIntention,
  onUpdateTask
}: Props) {
  const existingIntention = intentions.find(i => 
    i.scale === scale && i.periodStart === periodStart && i.periodEnd === periodEnd
  );

  if (!config) return null;

  return (
    <div className="w-full space-y-16">
      <IntentionForm
        isOpen={true}
        isInline={true}
        onClose={() => {}}
        scale={scale as IntentionScale}
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
      
      {/* Planners based on scale */}
      <div className="border-t border-border-line/30 pt-8">
        {(scale === 'year' || scale === 'quarter') && (
          <RoadmapPlanner 
            scale={scale}
            periodStart={periodStart}
            periodEnd={periodEnd}
            tasks={tasks}
            onUpdateTask={onUpdateTask}
            config={config}
          />
        )}
        
        {scale === 'cycle' && (
          <CyclePlanner 
            tasks={tasks}
            onUpdateTask={onUpdateTask}
            config={config}
          />
        )}
      </div>
    </div>
  );
}
