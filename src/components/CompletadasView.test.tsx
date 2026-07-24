import React from 'react';
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
});
