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
    expect(markup).toContain('Próx.');
  });

  it('shows the end of a standalone quota period without repeating parent routine dates', () => {
    const quotaHabit: AppTask = {
      ...habit,
      id: 'quota-habit',
      appearanceMode: 'quota',
      fechaAparicion: '2026-07-01',
      quotaTarget: 3,
      quotaPeriodUnit: 'semanas',
    };
    const markup = renderToStaticMarkup(
      <TaskItem
        task={quotaHabit}
        config={null}
        allTasks={[quotaHabit]}
        history={[]}
        onToggle={() => undefined}
        onDelete={() => undefined}
        context="routine"
      />,
    );

    expect(markup).toContain('Próx.');
    expect(markup).toContain('Cierra');
  });

  it('does not repeat standalone dates on a habit inherited from a routine', () => {
    const routine: AppTask = {
      id: 'routine-parent',
      userId: 'local_user',
      text: 'Rutina',
      type: 'Rutina',
      completed: false,
      createdAt: '2026-07-01T12:00:00.000Z',
      appearanceMode: 'interval',
      appearanceFrequency: 1,
      appearanceFrequencyUnit: 'días',
      fechaAparicion: '2026-07-01',
      routineCycleFrequency: 1,
      routineCycleUnit: 'semanas',
    };
    const child = { ...habit, id: 'child-habit', parentId: routine.id };
    const markup = renderToStaticMarkup(
      <TaskItem
        task={child}
        config={null}
        allTasks={[routine, child]}
        history={[]}
        onToggle={() => undefined}
        onDelete={() => undefined}
        context="routine"
      />,
    );

    expect(markup).toContain('0/1');
    expect(markup).not.toContain('Próx.');
    expect(markup).not.toContain('Cierra');
  });
});
