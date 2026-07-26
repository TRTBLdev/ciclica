import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import TaskItem from './TaskItem';

const habit: AppTask = {
  id: 'habit',
  userId: 'local_user',
  text: 'Leer',
  type: 'Hábito',
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  appearanceMode: 'interval',
  appearanceFrequency: 1,
  appearanceFrequencyUnit: 'semanas',
  fechaAparicion: '2026-07-20',
  duracion: 0.5,
};

describe('habit duration on TaskItem', () => {
  it('keeps real versus estimated duration visible and enables historical detail', () => {
    const markup = renderToStaticMarkup(
      <TaskItem
        task={habit}
        config={null}
        allTasks={[habit]}
        history={[]}
        onToggle={() => undefined}
        onDelete={() => undefined}
        context="routine"
        durationSummary={{
          currentActualHours: 0.5,
          estimatedHours: 0.5,
          completedCycleAverageHours: 0.42,
          completedCycleCount: 3,
        }}
      />,
    );

    expect(markup).toContain('Real 0.50 h / Est. 0.50 h');
    expect(markup).toContain('aria-label="Expandir detalles"');
  });
});
