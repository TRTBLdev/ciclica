import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord } from '../types';
import CompletadasView from './CompletadasView';
import { ToastProvider } from './ToastProvider';

const makeTask = (id: string, text: string): AppTask => ({
  id,
  userId: 'local_user',
  text,
  type: 'Tarea',
  completed: false,
  createdAt: new Date().toISOString(),
});

const makeRecord = (id: string, taskId: string, date: string): HistoryRecord => ({
  id,
  userId: 'local_user',
  taskId,
  date,
  createdAt: date,
  duration: 0.5,
  isCompletion: false,
});

describe('completed history view', () => {
  it('renders the last seven days by default', () => {
    const recentTask = makeTask('recent', 'Sesión reciente');
    const oldTask = makeTask('old', 'Sesión antigua');
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    const markup = renderToStaticMarkup(
      <ToastProvider>
        <CompletadasView
          config={null}
          tasks={[recentTask, oldTask]}
          history={[
            makeRecord('recent-log', recentTask.id, new Date().toISOString()),
            makeRecord('old-log', oldTask.id, oldDate.toISOString()),
          ]}
          onToggleTask={() => undefined}
          onDeleteTask={() => undefined}
          onUpdateTask={() => undefined}
          onAddTask={() => undefined}
          onUpdateHistory={() => undefined}
          onDeleteHistory={() => undefined}
          onAddHistory={() => undefined}
        />
      </ToastProvider>,
    );

    expect(markup).toContain('value="7dias" selected=""');
    expect(markup).toContain('Sesión reciente');
    expect(markup).not.toContain('Sesión antigua');
  });

  it('uses the expanded desktop canvas and three columns only at the wide breakpoint', () => {
    const source = readFileSync(new URL('./CompletadasView.tsx', import.meta.url), 'utf8');
    const bitacoraSource = readFileSync(new URL('./BitacoraView.tsx', import.meta.url), 'utf8');

    expect(source).toContain('max-w-[1600px]');
    expect(source).toContain('grid-cols-1 xl:grid-cols-3');
    expect(source).not.toContain('grid-cols-1 lg:grid-cols-3 gap-8');
    expect(bitacoraSource).not.toContain('>Completadas</h2>');
  });
});
