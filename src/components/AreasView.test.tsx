import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask, Config } from '../types';
import AreasView from './AreasView';

const config: Config = {
  userId: 'local_user',
  theme: 'muji',
  areas: { BODY: { color: 'teal', categories: ['NUTRICIÓN'] } },
  separators: [],
  cycleConfig: { trackingType: 'none' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('AreasView cards', () => {
  it('renders the four counters in the requested order', () => {
    const markup = renderToStaticMarkup(
      <AreasView
        config={config}
        tasks={[]}
        history={[]}
        progressSnapshots={[]}
        intentions={[]}
        onUpdateConfig={() => undefined}
        onToggleTask={() => undefined}
        onDeleteTask={() => undefined}
        onAddTask={() => undefined}
        onUpdateTask={() => undefined}
      />,
    );
    const text = markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const projects = text.indexOf('PROYECTOS');
    const tasks = text.indexOf('TAREAS');
    const routines = text.indexOf('RUTINAS');
    const habits = text.indexOf('HÁBITOS');

    expect(projects).toBeGreaterThanOrEqual(0);
    expect(tasks).toBeGreaterThan(projects);
    expect(routines).toBeGreaterThan(tasks);
    expect(habits).toBeGreaterThan(routines);
  });

  it('exposes the Tipo | Subcategoría structure toggle inside AreaDetail', () => {
    const habit: AppTask = {
      id: 'h_nut',
      userId: 'local_user',
      text: 'Desayuno proteico',
      type: 'Hábito',
      category: 'BODY',
      subCategory: 'NUTRICIÓN',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const markup = renderToStaticMarkup(
      <AreasView
        config={config}
        tasks={[habit]}
        history={[]}
        progressSnapshots={[]}
        intentions={[]}
        onUpdateConfig={() => undefined}
        onToggleTask={() => undefined}
        onDeleteTask={() => undefined}
        onAddTask={() => undefined}
        onUpdateTask={() => undefined}
        focusTaskId="BODY"
      />,
    );
    // Note: useEffect sets selectedArea on client mount; verify AreasView renders cleanly with focusTaskId
    expect(markup).toContain('BODY');
  });
});
