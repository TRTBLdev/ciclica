import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Omnibar from './Omnibar';
import { AppTask, Config, HistoryRecord } from '../types';

describe('Omnibar quick launch alignment', () => {
  it('unifica cabeceras sin emoji, muestra CategoryBadge en Recientes y reserva ancho para alinear botones Play', () => {
    const config: Config = {
      userId: 'local_user',
      theme: 'muji',
      cycleConfig: { trackingType: 'none' },
      areas: { BODY: { color: 'teal', categories: ['NUTRICIÓN', 'HIGIENE'] } },
      separators: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const quickHabit: AppTask = {
      id: 'quick_1',
      userId: 'local_user',
      text: 'Té y preparar desayuno',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'NUTRICIÓN',
      quickTrack: true,
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const recentHabit: AppTask = {
      id: 'recent_1',
      userId: 'local_user',
      text: 'Brush Teeth + Skincare PM',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'HIGIENE',
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const history: HistoryRecord[] = [
      {
        id: 'hist_1',
        userId: 'local_user',
        taskId: recentHabit.id,
        date: '2026-11-21T20:00:00.000Z',
        duration: 0.25,
        createdAt: '2026-11-21T20:00:00.000Z',
      },
    ];

    const markup = renderToStaticMarkup(
      <Omnibar
        activeTimer={null}
        tasks={[quickHabit, recentHabit]}
        history={history}
        config={config}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onDiscard={vi.fn()}
        onStartTimer={vi.fn()}
        onToggleTask={vi.fn()}
        onUpdateStartTime={vi.fn()}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
      />,
    );

    expect(markup).toContain('Acceso rápido');
    expect(markup).toContain('Recientes');
    expect(markup).not.toContain('⚡');
    expect(markup).toContain('<span class="truncate font-medium">Brush Teeth + Skincare PM</span>');
    expect(markup).toContain('HIGIENE');
    expect(markup).toContain('<span class="w-5 h-5 shrink-0" aria-hidden="true"></span>');
  });
});
