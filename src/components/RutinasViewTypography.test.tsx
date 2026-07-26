import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask } from '../types';
import RutinasView from './RutinasView';

const routine: AppTask = {
  id: 'routine',
  userId: 'local_user',
  text: 'Bodycare',
  type: 'Rutina',
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  appearanceMode: 'interval',
  appearanceFrequency: 1,
  appearanceFrequencyUnit: 'días',
  fechaAparicion: '2026-07-01',
  routineCycleFrequency: 1,
  routineCycleUnit: 'meses',
  routineCycleAnchorDate: '2026-07-01',
};

const habit: AppTask = {
  id: 'habit',
  userId: 'local_user',
  text: 'Baño + Dry Brush',
  type: 'Hábito',
  parentId: routine.id,
  completed: false,
  createdAt: '2026-07-01T12:00:00.000Z',
  duracion: 0.5,
  objetivoPorCiclo: 3,
};

describe('routine card metric typography', () => {
  it('matches progress, appearances and cycle to the 10px mono metadata scale', () => {
    const markup = renderToStaticMarkup(
      <RutinasView
        config={null}
        tasks={[routine, habit]}
        history={[]}
        progressSnapshots={[]}
        onToggleTask={() => undefined}
        onDeleteTask={() => undefined}
        onUpdateTask={() => undefined}
        onAddTask={() => undefined}
      />,
    );
    const routineProgressOutput = markup.match(/<output class="([^"]*)"[^>]*>[^<]*apar\.[^<]*<\/output>/);

    expect(routineProgressOutput).not.toBeNull();
    expect(routineProgressOutput?.[1]).toContain('font-mono');
    expect(routineProgressOutput?.[1]).toContain('text-[10px]');
    expect(routineProgressOutput?.[1]).toContain('leading-5');
    expect(routineProgressOutput?.[1]).toContain('text-text-dim');
    expect(routineProgressOutput?.[1]).toContain('tabular-nums');
  });
});
