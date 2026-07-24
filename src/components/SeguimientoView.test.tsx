import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppTask, HistoryRecord, ProgressSnapshot } from '../types';
import { formatDateOnly } from '../domain/recurrenceProgress';
import SeguimientoView from './SeguimientoView';

const today = formatDateOnly(new Date());

const habit = (overrides: Partial<AppTask>): AppTask => ({
  id: 'habit',
  userId: 'local_user',
  text: 'Hábito',
  type: 'Hábito',
  completed: false,
  appearanceMode: 'interval',
  fechaAparicion: today,
  appearanceFrequency: 1,
  appearanceFrequencyUnit: 'días',
  createdAt: `${today}T08:00:00`,
  ...overrides,
});

const snapshot = (overrides: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  id: 'snapshot',
  userId: 'local_user',
  kind: 'habit-period',
  taskId: 'habit',
  taskSnapshotText: 'Hábito',
  periodStart: today,
  periodEnd: today,
  resolvedAt: today,
  progressPercent: 50,
  resultStatus: 'partial',
  resolutionSource: 'manual',
  createdAt: `${today}T10:00:00`,
  ...overrides,
});

describe('recurring tracking presentation', () => {
  it('uses a diagonal result state and a separate activity marker', () => {
    const currentHabit = habit({});
    const history: HistoryRecord[] = [{
      id: 'session',
      userId: 'local_user',
      taskId: currentHabit.id,
      date: `${today}T09:00:00`,
      createdAt: `${today}T09:00:00`,
      duration: 0.5,
      isCompletion: false,
    }];
    const markup = renderToStaticMarkup(
      <SeguimientoView config={null} tasks={[currentHabit]} history={history} progressSnapshots={[snapshot({})]} />,
    );
    expect(markup).toContain('data-result="partial-planned"');
    expect(markup).toContain('data-activity="true"');
    expect(markup).toContain('parcial en fecha, 50%');
  });

  it('does not infer a missed result before an open occurrence expires', () => {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() - 2);
    const scheduledKey = formatDateOnly(scheduledDate);
    const currentHabit = habit({
      fechaAparicion: scheduledKey,
      appearanceFrequency: 4,
      appearanceFrequencyUnit: 'días',
    });
    const markup = renderToStaticMarkup(
      <SeguimientoView config={null} tasks={[currentHabit]} history={[]} progressSnapshots={[]} />,
    );
    expect(markup).toContain(`${scheduledKey}: aparición programada`);
    expect(markup).not.toContain(`${scheduledKey}: no completado`);
  });

  it('shows monthly averages in the real resolution month without an expandable detail', () => {
    const monthlyHabit = habit({
      appearanceFrequency: 3,
      appearanceFrequencyUnit: 'meses',
    });
    const markup = renderToStaticMarkup(
      <SeguimientoView
        config={null}
        tasks={[monthlyHabit]}
        history={[]}
        progressSnapshots={[snapshot({ progressPercent: 60 })]}
      />,
    );
    expect(markup).toContain('60%');
    expect(markup).toContain('promedio de 1 resultado');
    expect(markup).not.toContain('aria-expanded="false" class="tracking-month-cell');
  });
});
