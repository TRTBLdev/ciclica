import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppTask, Config, HistoryRecord } from '../types';
import DedicationChart from './DedicationChart';

const config: Config = {
  userId: 'local_user',
  theme: 'muji',
  areas: {},
  separators: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  cycleConfig: {
    trackingType: 'menstrual',
    cycleLengthDays: 28,
    periodLengthDays: 3,
    currentManualPhase: 'creativa',
    flowLogs: {
      '2026-01-01': 2,
      '2026-01-02': 1,
    },
  },
};

const task: AppTask = {
  id: 'task',
  userId: 'local_user',
  text: 'Escritura',
  type: 'Tarea',
  allocationType: 'fixed',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const record = (id: string, date: string, duration: number): HistoryRecord => ({
  id,
  userId: 'local_user',
  taskId: task.id,
  date,
  createdAt: date,
  duration,
  isCompletion: false,
});

afterEach(() => vi.useRealTimers());

describe('DedicationChart', () => {
  it('keeps the manual phase for today without rewriting historical dedication', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 16, 12));

    const markup = renderToStaticMarkup(
      <DedicationChart
        config={config}
        tasks={[task]}
        history={[
          record('past', '2026-01-10T10:00:00.000Z', 2),
          record('today', '2026-01-16T10:00:00.000Z', 3),
        ]}
        periodStart="2026-01-01"
        periodEnd="2026-01-31"
      />,
    );
    const text = markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    expect(text).toContain('Dinámica 2.0 h');
    expect(text).toContain('Expresiva 0.0 h');
    expect(text).toContain('Creativa 3.0 h');
  });
});
